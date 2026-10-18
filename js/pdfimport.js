/* =========================================================
   EDU — PDF 로 교육 자료 만들기
   · '+ 교육 자료 만들기' → 직접 입력 / PDF 업로드 고르기
   · 기준: 장애 크루가 보기 쉽게 — 단계 최대 9개(10개 미만), 단계마다 아주 짧고 쉬운 말
   · PDF 를 올리면
     1) 브라우저가 쪽마다 글을 읽고 그림으로 그린다 (pdf.js)
     2) 앱스스크립트(Gemini, type:"ai")에 PDF 를 보내 쉬운 말 단계로 다시 쓰게 한다 — 단계마다 사진으로 쓸 쪽도 고름
     3) AI 를 못 쓰면(키 없음 · 한도 초과 · 인터넷) 브라우저가 쪽 글을 짧게 줄여 초안을 만든다
        - 쪽 그림 = 단계 사진, 쪽의 첫 줄 = 설명, '주의 · 경고 · 금지 …' 줄 = 주의할 점
     - 표지(글이 아주 적은 첫 쪽)는 제목 · 한 줄 설명으로 쓰고 단계에서 뺀다
     - 매 쪽 반복되는 머리말 · 꼬리말 · 쪽 번호는 뺀다
     - 단계가 9개를 넘으면 쓸 쪽을 고르는 화면을 먼저 보여 준다
   · 만든 초안은 기존 편집기(EduLib.openEditor)로 열어서 고치고 저장한다
   · pdf.js 는 이 기능을 쓸 때만 jsdelivr 에서 불러온다
   ========================================================= */
(function () {
  "use strict";
  var PDFJS = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/";
  var MAX_MB = 40, AI_MB = 14, AI_WAIT = 120000, THUMB = 360, PHOTO_MAX = 1600, PHOTO_Q = 0.82;
  var SHORT_TEXT = 90, SHORT_WARN = 50;   // AI 없이 만들 때도 짧고 쉽게
  var WARN_RE = /주의|경고|금지|위험|조심|절대|반드시|하지\s*마|않도록|※|⚠/;
  var TOPIC_HINTS = [
    ["안전 · 보건", /안전|보건|부상|보호구|장갑|마스크|응급|사고|화상|감전/g],
    ["병해충 · 이슈 대응", /병해충|해충|벌레|곰팡이|응애|깍지|진딧물|병든|시들|이슈/g],
    ["장비 · 도구 관리", /장비|도구|분무기|가위|전정|호스|물뿌리개|세척|보관|충전|기계/g],
    ["기록 앱 사용법", /앱|어플|기록|입력|로그인|버튼|화면|사진\s*올리/g],
    ["현장 매너 · 보안", /매너|보안|출입|인사|복장|고객|사무실|비밀/g],
    ["식물 관리 기본", /식물|물주기|관수|분갈이|비료|흙|잎|뿌리|햇빛|화분/g]
  ];

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function svg(d) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + d + '</svg>'; }
  var IC = {
    x: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
    pen: svg('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>'),
    pdf: svg('<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>'),
    up: svg('<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/>')
  };
  function toast(msg) { var el = document.createElement("div"); el.className = "toast"; el.textContent = msg; document.body.appendChild(el); setTimeout(function () { el.remove(); }, 2800); }
  function loadScript(src) {
    return new Promise(function (res, rej) {
      if (document.querySelector('script[src="' + src + '"]')) { res(); return; }
      var s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = function () { rej(new Error("lib")); }; document.head.appendChild(s);
    });
  }
  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    return loadScript(PDFJS + "build/pdf.min.js").then(function () {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + "build/pdf.worker.min.js";
      return window.pdfjsLib;
    });
  }
  function cut(s, n) { s = String(s || "").trim(); if (s.length <= n) return s; var t = s.slice(0, n - 1), k = Math.max(t.lastIndexOf(" "), t.lastIndexOf("\n")); return (k > n * 0.6 ? t.slice(0, k) : t).replace(/[\s,·]+$/, "") + "…"; }

  /* ---------------- 쪽 글 읽기: 글 조각 → 줄 ---------------- */
  function toLines(items) {
    var parts = items.filter(function (it) { return it.str && it.str.trim(); }).map(function (it) {
      return { s: it.str, x: it.transform[4], y: it.transform[5], w: it.width || 0, h: Math.abs(it.height || it.transform[3] || 10) };
    });
    parts.sort(function (a, b) { return b.y - a.y || a.x - b.x; });
    var lines = [];
    parts.forEach(function (p) {
      var L = lines[lines.length - 1];
      if (L && Math.abs(L.y - p.y) <= Math.max(L.h, p.h) * 0.5) { L.parts.push(p); L.h = Math.max(L.h, p.h); }
      else lines.push({ y: p.y, h: p.h, parts: [p] });
    });
    return lines.map(function (L) {
      L.parts.sort(function (a, b) { return a.x - b.x; });
      var out = "", end = null;
      L.parts.forEach(function (p) {
        if (end != null && p.x - end > p.h * 0.22 && !/\s$/.test(out) && !/^\s/.test(p.s)) out += " ";
        out += p.s; end = p.x + p.w;
      });
      return { t: out.replace(/\s+/g, " ").trim(), h: L.h, y: L.y };
    }).filter(function (l) { return l.t; });
  }
  function isNoise(t) { return /^[-–—\s]*\d{1,3}[-–—\s]*$/.test(t) || /^\d{1,3}\s*\/\s*\d{1,3}$/.test(t) || /^(page|p\.)\s*\d+$/i.test(t); }
  function cleanLine(t) { return t.replace(/^[•●○◦▪▶►■□◆◇·\-–*]+\s*/, "").replace(/^\d{1,2}[.)]\s+/, "").trim(); }

  /* 한 쪽 → { title, text, warn } */
  function pageDraft(lines) {
    if (!lines.length) return { title: "", text: "", warn: "", chars: 0 };
    var hs = lines.map(function (l) { return l.h; }).sort(function (a, b) { return a - b; }), med = hs[Math.floor((hs.length - 1) / 2)];
    var maxH = hs[hs.length - 1], head = [], body = [], warn = [];
    lines.forEach(function (l, i) {
      var big = lines.length > 1 && l.h >= med * 1.25 && l.h >= maxH * 0.92 && l.t.length <= 60;
      if (big && body.length === 0 && warn.length === 0 && head.length < 2) { head.push(cleanLine(l.t) || l.t); return; }
      var t = cleanLine(l.t); if (!t) return;
      if (WARN_RE.test(t)) { warn.push(t.replace(/^(※|⚠️?|주의\s*[:：]?|경고\s*[:：]?)\s*/, "")); return; }
      // 앞줄과 이어지는 문장이면 붙인다 (마침표 없이 끊긴 줄)
      var prev = body[body.length - 1];
      if (prev && !/[.!?。다요죠음함됨임]$/.test(prev) && !/^[•●○◦▪▶►■□◆◇·\-–*\d]/.test(l.t) && prev.length < 200) body[body.length - 1] = prev + " " + t;
      else body.push(t);
    });
    var title = head.join(" ");
    var full = (title ? title + (body.length ? "\n" : "") : "") + body.join("\n");
    // 쉬운 초안: 제목 + 첫 문장 하나만 (긴 글은 AI 가 줄이거나, 사람이 편집기에서 고친다)
    var first = ((body[0] || "").match(/^.*?[.!?。](?=\s|$)/) || [body[0] || ""])[0];
    var text = title ? title + (first ? "\n" + first : "") : first;
    return { title: title, text: cut(text, SHORT_TEXT), warn: cut(warn[0] || "", SHORT_WARN), full: full,
      chars: lines.reduce(function (n, l) { return n + l.t.length; }, 0), lines: lines };
  }
  function guessTopic(all) {
    var best = "", bestN = 0;
    TOPIC_HINTS.forEach(function (h) { var n = (all.match(h[1]) || []).length; if (n > bestN) { bestN = n; best = h[0]; } });
    return bestN >= 2 ? best : "";
  }
  function goodMetaTitle(t) { t = String(t || "").trim(); return t && t.length <= 60 && !/^(microsoft|powerpoint|untitled|제목\s*없음|슬라이드|프레젠테이션)/i.test(t) && !/\.(pptx?|docx?|hwpx?|pdf|html?|xlsx?|key)$/i.test(t) ? t : ""; }

  function renderPage(page, maxSide, q) {
    var v1 = page.getViewport({ scale: 1 }), k = Math.min(3, maxSide / Math.max(v1.width, v1.height)), vp = page.getViewport({ scale: k });
    var c = document.createElement("canvas"); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
    var g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
    // intent "print": 화면 그리기 신호(requestAnimationFrame)를 기다리지 않아서, 다른 탭을 보고 있어도 멈추지 않는다
    return page.render({ canvasContext: g, viewport: vp, intent: "print" }).promise.then(function () {
      var d = c.toDataURL("image/jpeg", q); c.width = c.height = 0; return d;
    });
  }

  /* ---------------- PDF 읽기 ---------------- */
  function analyze(file, onProg) {
    return loadPdfJs().then(function (lib) {
      return file.arrayBuffer().then(function (buf) {
        return lib.getDocument({ data: buf, cMapUrl: PDFJS + "cmaps/", cMapPacked: true, standardFontDataUrl: PDFJS + "standard_fonts/" }).promise;
      });
    }).then(function (doc) {
      var n = doc.numPages, pages = [], meta = {};
      var chain = doc.getMetadata().then(function (md) { meta = (md && md.info) || {}; }).catch(function () {});
      for (var i = 1; i <= n; i++) (function (no) {
        chain = chain.then(function () {
          onProg && onProg(no, n);
          return doc.getPage(no).then(function (page) {
            return page.getTextContent().then(function (tc) {
              return renderPage(page, THUMB, 0.7).then(function (thumb) { pages.push({ no: no, lines: toLines(tc.items), thumb: thumb }); });
            });
          });
        });
      })(i);
      return chain.then(function () {
        // 여러 쪽에 똑같이 나오는 줄 = 머리말 · 꼬리말 → 뺀다
        if (n >= 3) {
          var cnt = {}; pages.forEach(function (p) { var seen = {}; p.lines.forEach(function (l) { var k = l.t.replace(/\d+/g, "#"); if (!seen[k]) { seen[k] = 1; cnt[k] = (cnt[k] || 0) + 1; } }); });
          pages.forEach(function (p) { p.lines = p.lines.filter(function (l) { return cnt[l.t.replace(/\d+/g, "#")] < Math.max(3, n * 0.6); }); });
        }
        pages.forEach(function (p) { p.lines = p.lines.filter(function (l) { return !isNoise(l.t); }); p.d = pageDraft(p.lines); });
        return { doc: doc, pages: pages, meta: meta };
      });
    });
  }

  /* 읽은 결과 → 제목 · 설명 · 주제 · 고를 쪽 */
  function plan(file, r) {
    var pages = r.pages, first = pages[0], cover = pages.length > 1 && first.d.chars <= 80;
    var fname = String(file.name || "").replace(/\.pdf$/i, "").replace(/[_]+/g, " ").trim();
    var coverLines = cover ? first.lines.slice().sort(function (a, b) { return b.h - a.h; }) : [];
    var title = (coverLines[0] && coverLines[0].t) || goodMetaTitle(r.meta.Title) || (first.d.title) || fname;
    var summary = cover && coverLines[1] ? coverLines[1].t : "";
    var all = pages.map(function (p) { return p.lines.map(function (l) { return l.t; }).join(" "); }).join(" ") + " " + title;
    pages.forEach(function (p) { p.cover = cover && p === first; p.empty = !p.d.chars; });
    var usable = pages.filter(function (p) { return !p.cover; });
    var max = (window.EduLib && EduLib.MAX_STEPS) || 9;
    usable.slice(0, max).forEach(function (p) { p.on = true; });
    return { title: cut(title, 60), summary: cut(summary, 100), topic: guessTopic(all), cover: cover, usable: usable.length, max: max, pages: pages, textless: pages.every(function (p) { return !p.d.chars; }) };
  }

  /* ---------------- AI: 쉬운 말 단계 (앱스스크립트 → Gemini) ---------------- */
  function readB64(file) { return new Promise(function (res, rej) { var fr = new FileReader(); fr.onload = function () { res(String(fr.result).replace(/^data:[^,]*,/, "")); }; fr.onerror = rej; fr.readAsDataURL(file); }); }
  function askAi(file, p) {
    var ep = window.CONFIG && CONFIG.endpoint;
    if (!ep || !window.fetch) return Promise.reject(new Error("no endpoint"));
    var pagesText = p.pages.map(function (pg) { return "[" + pg.no + "쪽]" + (pg.cover ? "(표지) " : " ") + (pg.d.full || "(글 없음 · 그림)"); }).join("\n");
    var sendPdf = file.size <= AI_MB * 1024 * 1024;
    return (sendPdf ? readB64(file) : Promise.resolve("")).then(function (b64) {
      var ctl = window.AbortController ? new AbortController() : null, t = ctl && setTimeout(function () { ctl.abort(); }, AI_WAIT);
      return fetch(ep, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, signal: ctl ? ctl.signal : undefined,
        body: JSON.stringify({ key: CONFIG.apiKey || "", type: "ai", action: "steps", maxSteps: p.max, topics: EduLib.TOPICS || [], pdf: b64, pagesText: pagesText }) })
        .then(function (x) { return x.text(); }).then(function (txt) {
          if (t) clearTimeout(t);
          var j = null; try { j = JSON.parse(txt); } catch (e) {}
          if (!j || !j.ok || !j.result || !(j.result.steps || []).length) throw new Error((j && j.error) || "ai fail");
          return j.result;
        });
    });
  }
  // AI 결과 → 계획에 반영 (쪽 번호 확인, 단계 9개 이하)
  function applyAi(p, r) {
    var n = p.pages.length, steps = [];
    (r.steps || []).forEach(function (st) {
      var text = String(st.text || "").trim(); if (!text || steps.length >= p.max) return;
      var no = Math.round(Number(st.page) || 0); if (no < 1 || no > n) no = 0;
      steps.push({ page: no, text: cut(text, 140), warn: cut(String(st.warn || "").trim(), 80) });
    });
    if (!steps.length) return false;
    p.ai = true; p.aiSteps = steps;
    if (r.title) p.title = cut(r.title, 60);
    if (r.summary) p.summary = cut(r.summary, 100);
    if (r.topic && (EduLib.TOPICS || []).indexOf(r.topic) >= 0) p.topic = r.topic;
    return true;
  }

  /* ---------------- 화면 ---------------- */
  var MK = null;
  function open(opts) {
    if (!window.EduLib) return;
    var el = document.getElementById("mk");
    if (!el) { el = document.createElement("div"); el.id = "mk"; el.className = "mk"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-labelledby", "mkT"); document.body.appendChild(el); }
    MK = { el: el, opts: opts || {}, last: document.activeElement, stage: "pick" };
    el.hidden = false; document.body.style.overflow = "hidden";
    paintPick();
  }
  function close() {
    if (!MK) return; var m = MK; MK = null;
    if (m.doc) try { m.doc.destroy(); } catch (e) {}
    m.el.hidden = true; m.el.innerHTML = ""; document.body.style.overflow = "";
    if (m.last && m.last.focus) m.last.focus();
  }
  function paintPick(err) {
    var m = MK;
    m.el.className = "mk";
    m.el.innerHTML = '<div class="mk-card" id="mkCard"><button type="button" class="mk-x" id="mkX" aria-label="닫기">' + IC.x + '</button>'
      + '<h3 id="mkT">교육 자료 만들기</h3><p class="mk-s">어떻게 만들까요?</p>'
      + '<div class="mk-opts">'
        + '<button type="button" class="mk-opt" id="mkHand"><span class="mk-opt__ic">' + IC.pen + '</span><b>직접 입력하여 만들기</b><span>단계마다 사진과 설명을 순서대로 넣어요.</span></button>'
        + '<label class="mk-opt mk-opt--pdf" id="mkDrop"><span class="mk-opt__ic">' + IC.pdf + '</span><b>PDF 업로드하여 만들기</b><span>PDF를 올리면 내용을 읽고 장애 크루가 보기 쉬운 말로 교육 순서(9단계 이하)를 자동으로 만들어요.</span>'
          + '<em class="mk-opt__drop">' + IC.up + 'PDF 고르기 · 여기로 끌어 놓기</em><input type="file" accept="application/pdf,.pdf" id="mkFile" hidden></label>'
      + '</div>'
      + (err ? '<p class="mk-err" role="alert">' + esc(err) + '</p>' : '<p class="mk-note">자동으로 만든 내용은 바로 올라가지 않아요. 편집 화면에서 사진과 문장을 확인하고 고친 뒤 저장해 주세요.</p>')
      + '</div>';
    var $ = function (id) { return document.getElementById(id); };
    $("mkX").onclick = close;
    m.el.onclick = function (e) { if (e.target === m.el) close(); };
    $("mkHand").onclick = function () { var o = m.opts; close(); EduLib.openEditor(null, o); };
    $("mkFile").onchange = function () { var f = this.files && this.files[0]; if (f) start(f); };
    var drop = $("mkDrop");
    ["dragenter", "dragover"].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add("is-over"); }); });
    ["dragleave", "drop"].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.remove("is-over"); }); });
    drop.addEventListener("drop", function (e) { var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) start(f); });
    $("mkHand").focus();
  }
  function paintBusy(t, k, n, ai) {
    var m = MK; if (!m) return;
    var pct = n ? Math.round(k / n * 100) : 0;
    m.el.className = "mk";
    m.el.innerHTML = '<div class="mk-card mk-card--busy"><h3 id="mkT">' + (ai ? "쉬운 말로 바꾸는 중" : "PDF 읽는 중") + '</h3><p class="mk-s">' + esc(t) + '</p>'
      + '<div class="mk-bar' + (ai ? " is-wait" : "") + '" role="progressbar" aria-valuemin="0" aria-valuemax="100"' + (ai ? "" : ' aria-valuenow="' + pct + '"') + '><i style="width:' + (ai ? 35 : pct) + '%"></i></div>'
      + '<button type="button" class="mk-cancel" id="mkStop">그만두기</button></div>';
    document.getElementById("mkStop").onclick = function () { m.stopped = true; close(); };
  }
  function start(file) {
    var m = MK; if (!m) return;
    if (!/pdf$/i.test(file.type) && !/\.pdf$/i.test(file.name || "")) { paintPick("PDF 파일만 올릴 수 있어요."); return; }
    if (file.size > MAX_MB * 1024 * 1024) { paintPick("PDF가 너무 커요 (" + MAX_MB + "MB까지). 쪽을 나눠서 올려 주세요."); return; }
    m.file = file; paintBusy("PDF 프로그램을 불러오는 중…", 0, 0);
    analyze(file, function (k, n) { if (MK === m && !m.stopped) paintBusy(k + " / " + n + "쪽 읽는 중…", k - 1, n); }).then(function (r) {
      if (MK !== m || m.stopped) { try { r.doc.destroy(); } catch (e) {} return; }
      m.doc = r.doc; m.plan = plan(file, r);
      paintBusy("장애 크루가 보기 쉬운 말로 순서를 만드는 중… (30초쯤 걸려요)", 0, 0, true);
      askAi(file, m.plan).then(function (res) { return applyAi(m.plan, res); })
        .catch(function (e) { console.warn("AI 쉬운 말 변환 못 함 → 브라우저 초안", e); return false; })
        .then(function (ok) {
          if (MK !== m || m.stopped) return;
          if (!ok) m.plan.aiFailed = true;
          if (!ok && m.plan.usable > m.plan.max) paintChoose(); else build();
        });
    }).catch(function (e) {
      console.warn(e); if (MK !== m) return;
      var msg = e && e.name === "PasswordException" ? "암호가 걸린 PDF는 읽을 수 없어요. 암호를 풀고 다시 올려 주세요."
        : e && e.message === "lib" ? "PDF 프로그램을 불러오지 못했어요. 인터넷 연결을 확인해 주세요."
        : "이 PDF를 읽지 못했어요. 다른 PDF로 다시 해 주세요.";
      paintPick(msg);
    });
  }
  /* 9쪽이 넘으면: 쓸 쪽 고르기 */
  function paintChoose() {
    var m = MK, p = m.plan, on = p.pages.filter(function (x) { return x.on; }).length;
    m.el.className = "mk mk--full";
    m.el.innerHTML = '<header class="ed-h"><b id="mkT">PDF로 만들기 · 쓸 쪽 고르기</b><div class="ed-h__a"><button type="button" class="btn" id="mkBack">처음으로</button>'
        + '<button type="button" class="btn btn--primary" id="mkGo" ' + (on ? "" : "disabled") + '>이 순서로 만들기 (' + on + '단계)</button></div></header>'
      + '<div class="ed-body"><div class="ed-in">'
        + '<div class="mk-info"><b>' + esc(m.file.name) + '</b><span>' + p.pages.length + '쪽 · 단계는 ' + p.max + '개까지 만들 수 있어서 앞에서부터 ' + p.max + '쪽을 골라 두었어요. 쪽을 눌러서 빼거나 넣어 주세요. 고른 순서가 아니라 <b>PDF 쪽 순서</b>대로 단계가 돼요.</span></div>'
        + '<div class="mk-grid">' + p.pages.map(function (pg, i) {
            var k = pg.on ? p.pages.slice(0, i + 1).filter(function (x) { return x.on; }).length : 0;
            return '<button type="button" class="mk-pg' + (pg.on ? " is-on" : "") + '" data-pg="' + i + '" aria-pressed="' + !!pg.on + '">'
              + '<span class="mk-pg__im"><img src="' + pg.thumb + '" alt="' + pg.no + '쪽"><em>' + (pg.on ? k + "단계" : pg.cover ? "표지" : "빼기") + '</em></span>'
              + '<span class="mk-pg__t"><small>' + pg.no + '쪽</small>' + esc(cut(pg.d.title || pg.d.text.replace(/\n/g, " ") || "글 없음 (그림만)", 46)) + '</span></button>';
          }).join("") + '</div>'
      + '</div></div>';
    var $ = function (id) { return document.getElementById(id); };
    $("mkBack").onclick = function () { paintPick(); };
    $("mkGo").onclick = build;
    m.el.querySelectorAll("[data-pg]").forEach(function (b) { b.onclick = function () {
      var pg = p.pages[+b.dataset.pg];
      if (!pg.on && p.pages.filter(function (x) { return x.on; }).length >= p.max) { toast("단계는 " + p.max + "개까지예요. 다른 쪽을 먼저 빼 주세요."); return; }
      pg.on = !pg.on; var y = m.el.querySelector(".ed-body").scrollTop; paintChoose(); m.el.querySelector(".ed-body").scrollTop = y;
      var nb = m.el.querySelector('[data-pg="' + b.dataset.pg + '"]'); if (nb) nb.focus({ preventScroll: true });
    }; });
  }
  /* 고른 쪽을 크게 그려서 편집기로 */
  function build() {
    var m = MK, p = m.plan;
    // AI 단계 = 단계마다 AI 가 고른 쪽 / 브라우저 초안 = 고른 쪽마다 한 단계
    var plan = p.ai ? p.aiSteps.map(function (st) { return { no: st.page, text: st.text, warn: st.warn }; })
      : p.pages.filter(function (x) { return x.on; }).map(function (pg) { return { no: pg.no, text: pg.d.text, warn: pg.d.warn }; });
    if (!plan.length) { toast("쪽을 하나 이상 골라 주세요"); return; }
    var nos = plan.map(function (x) { return x.no; }).filter(function (no, i, a) { return no && a.indexOf(no) === i; });
    var shots = {}, chain = Promise.resolve();
    nos.forEach(function (no, i) {
      chain = chain.then(function () {
        if (MK !== m || m.stopped) throw new Error("stop");
        paintBusy("단계 사진 만드는 중… " + (i + 1) + " / " + nos.length, i, nos.length);
        return m.doc.getPage(no).then(function (page) { return renderPage(page, PHOTO_MAX, PHOTO_Q); }).then(function (d) {
          shots[no] = { dataUrl: d, name: "pdf-" + no + ".jpg", size: Math.round((d.length - d.indexOf(",") - 1) * 3 / 4) };
        });
      });
    });
    chain.then(function () {
      var o = m.opts, name = m.file.name;
      var steps = plan.map(function (x) { return { nu: x.no ? shots[x.no] : null, text: x.text, warn: x.warn }; });
      var preset = { title: p.title, summary: p.summary, topic: p.topic, steps: steps,
        fromPdf: { name: name, pages: p.pages.length, used: steps.length, cover: p.cover, textless: p.textless, ai: !!p.ai, aiFailed: !!p.aiFailed } };
      close();
      EduLib.openEditor(null, o, preset);
    }).catch(function (e) { if (e && e.message === "stop") return; console.warn(e); if (MK === m) paintPick("단계 사진을 만들지 못했어요. 다시 해 주세요."); });
  }
  document.addEventListener("keydown", function (e) { if (MK && e.key === "Escape") close(); });

  window.EduPdfImport = { open: open, _plan: plan, _pageDraft: pageDraft, _toLines: toLines };
})();
