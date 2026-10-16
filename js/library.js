/* =========================================================
   EDU — 교육 자료실 (관리자 화면 · 크루 보기 페이지가 같이 쓴다)
   · 자료 1개 = 주제 · 제목 · 한 줄 설명 + 단계(최대 9개, 단계마다 사진 1장 + 설명 + 주의)
   · 보기: 넓은 화면, 한 화면에 한 단계(큰 사진 · 큰 글씨 · 큰 이전/다음 버튼 · 소리로 듣기) 또는 전체 보기
   · 만들기/수정: 관리자만 (사진은 js/photo.js 로 줄여서 올림)
   ========================================================= */
(function () {
  "use strict";
  var MAX_STEPS = 9;
  var TOPICS = ["장비 · 도구 관리", "식물 관리 기본", "병해충 · 이슈 대응", "안전 · 보건", "현장 매너 · 보안", "기록 앱 사용법"];

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function svg(d) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + d + '</svg>'; }
  var IC = {
    x: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
    prev: svg('<path d="M15 5l-7 7 7 7"/>'),
    next: svg('<path d="M9 5l7 7-7 7"/>'),
    sound: svg('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>'),
    stop: svg('<rect x="6" y="6" width="12" height="12" rx="2"/>'),
    warn: svg('<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>'),
    book: svg('<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/><path d="M9 7h6"/>'),
    cam: svg('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
    up: svg('<path d="M12 19V5M6 11l6-6 6 6"/>'),
    down: svg('<path d="M12 5v14M6 13l6 6 6-6"/>'),
    trash: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
    plus: svg('<path d="M12 5v14M5 12h14"/>'),
    pen: svg('<path d="M4 19h16"/><path d="M6 15c2-5 4-8 5-8s0 6 2 6 2-3 3-3 1 2 2 2"/>'),
    one: svg('<rect x="4" y="5" width="16" height="14" rx="2"/>'),
    all: svg('<rect x="4" y="4" width="16" height="6" rx="1.5"/><rect x="4" y="14" width="16" height="6" rx="1.5"/>')
  };
  function signUrl() {
    if (window.CONFIG && CONFIG.signUrl) return CONFIG.signUrl;
    return location.origin + location.pathname.replace(/[^/]*$/, "") + "sign.html";
  }
  function today() { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function toast(msg) { var el = document.createElement("div"); el.className = "toast"; el.textContent = msg; document.body.appendChild(el); setTimeout(function () { el.remove(); }, 2400); }
  function photoCount(m) { return (m.steps || []).filter(function (s) { return s.u; }).length; }
  function cover(m) { var s = (m.steps || []).filter(function (x) { return x.u; })[0]; return s ? s.u : ""; }

  /* ---------------- 목록 ---------------- */
  var LIST = { el: null, opts: null, items: [], topic: "" };
  function mountList(el, opts) {
    LIST.el = el; LIST.opts = opts || {}; LIST.topic = LIST.topic || "";
    el.innerHTML = '<div class="empty">불러오는 중…</div>';
    return Store.listMaterials(LIST.opts.part || "garden").then(function (items) {
      LIST.items = items; paintList();
      return items;
    }).catch(function (e) {
      console.warn(e);
      var noTable = /materials/.test(String(e && (e.message || e.details || e.hint) || ""));
      el.innerHTML = '<div class="prep">' + IC.book + '<b>' + (noTable ? "자료실 저장 공간을 먼저 만들어야 해요" : "교육 자료를 불러오지 못했어요") + '</b>'
        + '<p>' + (noTable ? "Supabase SQL Editor 에서 <b>supabase/materials.sql</b> 을 한 번 실행하면 바로 쓸 수 있어요." : "인터넷 연결을 확인하고 새로고침해 주세요.") + '</p></div>';
      return [];
    });
  }
  function paintList() {
    var el = LIST.el, o = LIST.opts, items = LIST.items;
    var topics = TOPICS.concat(items.map(function (m) { return m.topic; }).filter(function (t) { return t && TOPICS.indexOf(t) < 0; }))
      .filter(function (t, i, a) { return a.indexOf(t) === i; });
    var shown = items.filter(function (m) { return o.noTopics || !LIST.topic || m.topic === LIST.topic; });
    if (o.limit) shown = shown.slice(0, o.limit);
    var count = function (t) { return items.filter(function (m) { return m.topic === t; }).length; };
    el.innerHTML = (o.noTopics ? "" : '<div class="lib-topics" role="tablist" aria-label="주제">'
        + '<button type="button" data-topic="" aria-pressed="' + (!LIST.topic) + '">전체 <span>' + items.length + '</span></button>'
        + topics.map(function (t) { return '<button type="button" data-topic="' + esc(t) + '" aria-pressed="' + (LIST.topic === t) + '">' + esc(t) + ' <span>' + count(t) + '</span></button>'; }).join("")
      + '</div>')
      + (shown.length ? '<div class="lib-grid">' + shown.map(function (m) {
          var c = cover(m), n = (m.steps || []).length;
          return '<button type="button" class="lib-card" data-open="' + esc(m.id) + '">'
            + '<span class="lib-card__ph">' + (c ? '<img src="' + esc(c) + '" alt="" loading="lazy" decoding="async">' : IC.book) + '</span>'
            + '<span class="lib-card__b">' + (m.topic ? '<span class="lib-card__t">' + esc(m.topic) + '</span>' : "")
            + '<b>' + esc(m.title || "제목 없음") + '</b>'
            + (m.summary ? '<span class="lib-card__s">' + esc(m.summary) + '</span>' : "")
            + '<span class="lib-card__m">' + n + '단계 · 사진 ' + photoCount(m) + '장' + (m.needsSign ? '<em class="lib-sign">' + IC.pen + '서명</em>' : "") + '</span></span></button>';
        }).join("") + '</div>'
        : '<div class="prep">' + IC.book + '<b>' + (items.length ? "이 주제에는 아직 자료가 없어요" : "아직 교육 자료가 없어요") + '</b>'
          + '<p>' + (o.admin ? "<b>+ 교육 자료 만들기</b>로 사진과 설명을 단계별로 올려 주세요." : "자료가 올라오면 여기에서 볼 수 있어요.") + '</p></div>');
    el.querySelectorAll("[data-topic]").forEach(function (b) { b.onclick = function () { LIST.topic = b.dataset.topic; paintList(); }; });
    el.querySelectorAll("[data-open]").forEach(function (b) {
      b.onclick = function () { var m = items.filter(function (x) { return x.id === b.dataset.open; })[0]; if (m) openReader(m, o); };
    });
  }
  function refreshList() { if (LIST.el && document.body.contains(LIST.el)) mountList(LIST.el, LIST.opts); }

  /* ---------------- 넓은 화면 보기 ---------------- */
  var RD = null;
  function openReader(m, opts) {
    opts = opts || {};
    var el = document.getElementById("rd");
    if (!el) { el = document.createElement("div"); el.id = "rd"; el.className = "rd"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); document.body.appendChild(el); }
    var mode; try { mode = localStorage.getItem("edu-rd-mode") || "one"; } catch (e) { mode = "one"; }
    RD = { el: el, m: m, i: 0, mode: mode, opts: opts, last: document.activeElement };
    el.setAttribute("aria-label", m.title || "교육 자료");
    el.hidden = false; document.body.style.overflow = "hidden";
    paintReader();
  }
  function closeReader() {
    if (!RD) return; stopSpeak();
    RD.el.hidden = true; document.body.style.overflow = "";
    var last = RD.last; RD = null; if (last && last.focus) last.focus();
  }
  function stepHtml(st, i, n) {
    return '<div class="rd-ph">' + (st.u ? '<img src="' + esc(st.u) + '" alt="' + (i + 1) + '단계 사진">' : '<span class="rd-noph">' + IC.book + '</span>') + '</div>'
      + '<div class="rd-tx"><p class="rd-no"><b>' + (i + 1) + '</b> / ' + n + ' 단계</p>'
      + (st.text ? '<p class="rd-text">' + esc(st.text) + '</p>' : "")
      + (st.warn ? '<div class="rd-warn">' + IC.warn + '<div><b>주의</b><p>' + esc(st.warn) + '</p></div></div>' : "")
      + (st.text || st.warn ? '<button type="button" class="rd-say" data-say="' + i + '">' + IC.sound + '<span>소리로 듣기</span></button>' : "")
      + '</div>';
  }
  function paintReader() {
    var r = RD, m = r.m, steps = m.steps || [], n = steps.length, i = Math.min(r.i, Math.max(0, n - 1));
    stopSpeak();
    var head = '<header class="rd-h"><div class="rd-h__t">' + (m.topic ? '<span>' + esc(m.topic) + '</span>' : "") + '<b>' + esc(m.title || "교육 자료") + '</b></div>'
      + '<div class="rd-h__a">'
        + '<div class="rd-mode" role="group" aria-label="보기 방식"><button type="button" data-mode="one" aria-pressed="' + (r.mode === "one") + '">' + IC.one + '<span>한 장씩</span></button>'
        + '<button type="button" data-mode="all" aria-pressed="' + (r.mode === "all") + '">' + IC.all + '<span>전체 보기</span></button></div>'
        + (r.opts.admin ? '<button type="button" class="rd-btn" id="rdEdit">수정</button><button type="button" class="rd-btn rd-btn--del" id="rdDel">삭제</button>' : "")
        + '<button type="button" class="rd-x" id="rdX" aria-label="닫기">' + IC.x + '<span>닫기</span></button></div></header>';
    var signBox = m.needsSign ? '<div class="rd-sign">' + IC.pen + '<div><b>이 교육은 서명이 필요해요</b><p>' + (r.opts.admin ? "끝까지 본 크루가 교육 서명 페이지에서 서명해요." : "끝까지 보고 서명해 주세요.") + '</p></div>'
      + (r.opts.admin ? (m.signSessionId ? '<a class="rd-btn" href="#/sign/' + encodeURIComponent(m.signSessionId) + '" data-close-rd>서명 현황 보기</a>' : "")
                      : '<a class="rd-btn rd-btn--sign" href="' + esc(signUrl()) + '">서명하러 가기</a>') + '</div>' : "";
    var body;
    if (!n) body = '<div class="rd-empty">아직 단계가 없어요.</div>';
    else if (r.mode === "all") {
      body = '<div class="rd-all">' + (m.summary ? '<p class="rd-sum">' + esc(m.summary) + '</p>' : "")
        + steps.map(function (st, k) { return '<section class="rd-step rd-step--all">' + stepHtml(st, k, n) + '</section>'; }).join("")
        + (signBox ? '<div class="rd-signwrap">' + signBox + '</div>' : "") + '</div>';
    } else {
      body = '<div class="rd-one">' + (i === 0 && m.summary ? '<p class="rd-sum">' + esc(m.summary) + '</p>' : "")
        + '<section class="rd-step" aria-live="polite">' + stepHtml(steps[i], i, n) + '</section>'
        + (signBox && i === n - 1 ? '<div class="rd-signwrap">' + signBox + '</div>' : "") + '</div>'
        + '<footer class="rd-f"><button type="button" class="rd-nav" id="rdPrev" ' + (i === 0 ? "disabled" : "") + '>' + IC.prev + '<span>이전</span></button>'
        + '<div class="rd-dots">' + steps.map(function (_, k) { return '<button type="button" data-go="' + k + '" aria-label="' + (k + 1) + '단계" aria-current="' + (k === i ? "step" : "false") + '"></button>'; }).join("") + '</div>'
        + (i < n - 1 ? '<button type="button" class="rd-nav rd-nav--next" id="rdNext"><span>다음</span>' + IC.next + '</button>'
                     : (m.needsSign && !r.opts.admin ? '<a class="rd-nav rd-nav--next" href="' + esc(signUrl()) + '"><span>서명하러 가기</span></a>'
                                                       : '<button type="button" class="rd-nav rd-nav--next" id="rdDone"><span>다 봤어요</span></button>'))
        + '</footer>';
    }
    r.el.className = "rd rd--" + r.mode;
    r.el.innerHTML = head + body;
    r.i = i;
    var $ = function (id) { return document.getElementById(id); };
    $("rdX").onclick = closeReader;
    r.el.querySelectorAll("[data-mode]").forEach(function (b) { b.onclick = function () { r.mode = b.dataset.mode; try { localStorage.setItem("edu-rd-mode", r.mode); } catch (e) {} paintReader(); }; });
    r.el.querySelectorAll("[data-go]").forEach(function (b) { b.onclick = function () { go(+b.dataset.go - r.i); }; });
    r.el.querySelectorAll("[data-say]").forEach(function (b) { b.onclick = function () { speak(steps[+b.dataset.say], b); }; });
    if ($("rdPrev")) $("rdPrev").onclick = function () { go(-1); };
    if ($("rdNext")) $("rdNext").onclick = function () { go(1); };
    if ($("rdDone")) $("rdDone").onclick = closeReader;
    r.el.querySelectorAll("[data-close-rd]").forEach(function (a) { a.addEventListener("click", function () { closeReader(); }); });
    if ($("rdEdit")) $("rdEdit").onclick = function () { var mm = r.m, o = r.opts; closeReader(); openEditor(mm, o); };
    if ($("rdDel")) $("rdDel").onclick = function () {
      if (!confirm("'" + (m.title || "이 자료") + "' 자료를 삭제할까요? 사진도 함께 지워져요.")) return;
      Store.deleteMaterial(m).then(function () { closeReader(); toast("자료를 삭제했어요"); refreshList(); })
        .catch(function (e) { console.warn(e); toast("삭제하지 못했어요. 인터넷 연결을 확인해 주세요."); });
    };
    // 사진 좌우로 밀어서 넘기기
    var ph = r.el.querySelector(".rd-one .rd-ph"), sx = null;
    if (ph) { ph.ontouchstart = function (e) { sx = e.touches[0].clientX; }; ph.ontouchend = function (e) { if (sx == null) return; var dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); }; }
    var f = r.el.querySelector(r.mode === "one" && $("rdNext") ? "#rdNext" : "#rdX"); if (f) f.focus({ preventScroll: true });
    var one = r.el.querySelector(".rd-one"); if (one) one.scrollTop = 0;
  }
  function go(d) { if (!RD) return; var n = (RD.m.steps || []).length, j = RD.i + d; if (j < 0 || j >= n) return; RD.i = j; paintReader(); }
  document.addEventListener("keydown", function (e) {
    if (!RD) return;
    if (e.key === "Escape") closeReader();
    else if (RD.mode === "one" && e.key === "ArrowRight") go(1);
    else if (RD.mode === "one" && e.key === "ArrowLeft") go(-1);
  });

  // 소리로 듣기: 브라우저 읽어주기(한국어)
  var SPEAK_BTN = null;
  function stopSpeak() { try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {} if (SPEAK_BTN) { SPEAK_BTN.classList.remove("on"); SPEAK_BTN.querySelector("span").textContent = "소리로 듣기"; } SPEAK_BTN = null; }
  function speak(st, btn) {
    if (!("speechSynthesis" in window)) { toast("이 기기에서는 소리로 듣기를 쓸 수 없어요"); return; }
    var again = SPEAK_BTN === btn; stopSpeak(); if (again) return;
    var u = new SpeechSynthesisUtterance([st.text, st.warn ? "주의. " + st.warn : ""].filter(Boolean).join(". "));
    u.lang = "ko-KR"; u.rate = 0.9;
    u.onend = function () { if (SPEAK_BTN === btn) stopSpeak(); };
    SPEAK_BTN = btn; btn.classList.add("on"); btn.querySelector("span").textContent = "멈추기";
    speechSynthesis.speak(u);
  }

  /* ---------------- 만들기 · 수정 (관리자) ---------------- */
  var ED = null;
  function openEditor(m, opts) {
    opts = opts || {};
    var isNew = !m;
    m = m || { id: Store.newMaterialId(), part: opts.part || "garden", topic: LIST.topic || TOPICS[0], title: "", summary: "", steps: [] };
    var steps = (m.steps || []).map(function (s) { return { u: s.u || "", p: s.p || "", text: s.text || "", warn: s.warn || "" }; });
    if (!steps.length) steps.push({ u: "", p: "", text: "", warn: "" });
    ED = { m: m, isNew: isNew, opts: opts, steps: steps, orig: (m.steps || []).map(function (s) { return s.p; }).filter(Boolean), busy: false,
      topic: m.topic || "", title: m.title || "", summary: m.summary || "",
      // 서명: null = 아직 안 고름(새 자료는 꼭 고르게), true/false
      sign: isNew ? null : !!m.needsSign, signHow: m.signSessionId ? "keep" : "new", signDate: today(), signPick: "", sessions: null };
    Store.listSessions().then(function (ss) { if (ED) { ED.sessions = ss.filter(function (x) { return !x.locked; }); if (ED.sign) paintEditor(); } }).catch(function () { if (ED) ED.sessions = []; });
    var el = document.getElementById("ed");
    if (!el) { el = document.createElement("div"); el.id = "ed"; el.className = "ed"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); document.body.appendChild(el); }
    ED.el = el; el.hidden = false; document.body.style.overflow = "hidden";
    paintEditor();
  }
  function closeEditor() { if (!ED) return; ED.el.hidden = true; document.body.style.overflow = ""; ED = null; }
  function readFields() {
    if (!ED) return; var q = function (s) { return ED.el.querySelector(s); };
    ED.topic = (q("#edTopic").value || "").trim(); ED.title = (q("#edTitle").value || "").trim(); ED.summary = (q("#edSum").value || "").trim();
    var sd = q("#edSignDate"); if (sd) ED.signDate = sd.value;
    var sp = q("#edSignPick"); if (sp) ED.signPick = sp.value;
    ED.el.querySelectorAll("[data-st]").forEach(function (box) {
      var st = ED.steps[+box.dataset.st]; if (!st) return;
      st.text = box.querySelector(".ed-text").value; st.warn = box.querySelector(".ed-warn").value;
    });
  }
  function paintEditor() {
    var e = ED, n = e.steps.length, photos = e.steps.filter(function (s) { return s.u || s.nu; }).length;
    var allTopics = TOPICS.slice(); if (e.topic && allTopics.indexOf(e.topic) < 0) allTopics.push(e.topic);
    e.el.innerHTML = '<header class="ed-h"><b>' + (e.isNew ? "교육 자료 만들기" : "교육 자료 수정") + '</b>'
        + '<div class="ed-h__a"><button type="button" class="btn" id="edCancel" ' + (e.busy ? "disabled" : "") + '>취소</button>'
        + '<button type="button" class="btn btn--primary" id="edSave" ' + (e.busy ? "disabled" : "") + '>' + (e.busy ? esc(e.busyText || "저장하는 중…") : "저장") + '</button></div></header>'
      + '<div class="ed-body"><div class="ed-in">'
        + '<div class="ed-meta">'
          + '<label class="fld"><span>주제</span><input id="edTopic" list="edTopics" value="' + esc(e.topic) + '" placeholder="예: 장비 · 도구 관리" maxlength="30"></label>'
          + '<datalist id="edTopics">' + allTopics.map(function (t) { return '<option value="' + esc(t) + '">'; }).join("") + '</datalist>'
          + '<label class="fld"><span>제목 <em>*</em></span><input id="edTitle" value="' + esc(e.title) + '" placeholder="예: 분무기 청소와 보관 방법" maxlength="60"></label>'
          + '<label class="fld ed-meta__full"><span>한 줄 설명</span><input id="edSum" value="' + esc(e.summary) + '" placeholder="예: 매일 작업이 끝나면 분무기를 이렇게 정리해요" maxlength="100"></label>'
        + '</div>'
        + signHtml(e)
        + '<div class="ed-sec"><b>단계</b><span>단계마다 사진 1장 · 최대 ' + MAX_STEPS + '단계 (사진 ' + photos + ' / ' + MAX_STEPS + '장) · 큰 사진은 자동으로 줄여서 올려요</span></div>'
        + '<ol class="ed-steps">' + e.steps.map(function (st, i) {
            var src = st.nu ? st.nu.dataUrl : st.u;
            return '<li class="ed-step" data-st="' + i + '">'
              + '<div class="ed-ph">' + (src
                  ? '<img src="' + esc(src) + '" alt="' + (i + 1) + '단계 사진"><div class="ed-ph__a"><label class="ed-mini">바꾸기<input type="file" accept="image/*" data-pick="' + i + '" hidden></label><button type="button" class="ed-mini" data-unpick="' + i + '">빼기</button></div>'
                  : '<label class="ed-ph__add">' + IC.cam + '<span>사진 넣기</span><input type="file" accept="image/*" data-pick="' + i + '" hidden></label>')
              + (st.reading ? '<span class="ed-ph__busy">사진 줄이는 중…</span>' : "") + '</div>'
              + '<div class="ed-st__b"><div class="ed-st__h"><b>' + (i + 1) + '단계</b><div>'
                + '<button type="button" class="ed-ic" data-mv="' + i + '|-1" aria-label="위로" ' + (i === 0 ? "disabled" : "") + '>' + IC.up + '</button>'
                + '<button type="button" class="ed-ic" data-mv="' + i + '|1" aria-label="아래로" ' + (i === n - 1 ? "disabled" : "") + '>' + IC.down + '</button>'
                + '<button type="button" class="ed-ic" data-rm="' + i + '" aria-label="' + (i + 1) + '단계 지우기" ' + (n === 1 ? "disabled" : "") + '>' + IC.trash + '</button></div></div>'
              + '<textarea class="ed-text" rows="3" maxlength="300" placeholder="설명 (짧고 쉬운 문장으로) 예: 분무기 통을 비우고 깨끗한 물로 헹궈요">' + esc(st.text) + '</textarea>'
              + '<input class="ed-warn" maxlength="120" placeholder="주의할 점 (없으면 비워 두세요) 예: 약제가 손에 닿지 않게 장갑을 껴요" value="' + esc(st.warn) + '">'
              + '</div></li>';
          }).join("") + '</ol>'
        + (n < MAX_STEPS ? '<button type="button" class="ed-add" id="edAdd">' + IC.plus + '단계 추가 (' + n + ' / ' + MAX_STEPS + ')</button>' : '<p class="ed-full">단계는 ' + MAX_STEPS + '개까지 넣을 수 있어요.</p>')
      + '</div></div>';
    var q = function (s) { return e.el.querySelector(s); };
    e.el.querySelectorAll("[data-sign]").forEach(function (b) { b.onclick = function () { readFields(); e.sign = b.dataset.sign === "1"; paintEditor(); }; });
    e.el.querySelectorAll("[data-how]").forEach(function (b) { b.onchange = function () { readFields(); e.signHow = b.value; paintEditor(); }; });
    q("#edCancel").onclick = function () { if (e.busy) return; if (!confirm("저장하지 않고 닫을까요?")) return; closeEditor(); };
    q("#edSave").onclick = save;
    if (q("#edAdd")) q("#edAdd").onclick = function () { readFields(); e.steps.push({ u: "", p: "", text: "", warn: "" }); paintEditor(); var l = e.el.querySelectorAll(".ed-text"); l[l.length - 1].focus(); };
    e.el.querySelectorAll("[data-rm]").forEach(function (b) { b.onclick = function () { readFields(); var i = +b.dataset.rm, st = e.steps[i];
      if ((st.text || st.u || st.nu) && !confirm((i + 1) + "단계를 지울까요?")) return; e.steps.splice(i, 1); paintEditor(); }; });
    e.el.querySelectorAll("[data-mv]").forEach(function (b) { b.onclick = function () { readFields(); var a = b.dataset.mv.split("|"), i = +a[0], j = i + +a[1];
      var t = e.steps[i]; e.steps[i] = e.steps[j]; e.steps[j] = t; paintEditor(); }; });
    e.el.querySelectorAll("[data-unpick]").forEach(function (b) { b.onclick = function () { readFields(); var st = e.steps[+b.dataset.unpick]; st.u = ""; st.p = ""; st.nu = null; paintEditor(); }; });
    e.el.querySelectorAll("[data-pick]").forEach(function (fi) { fi.onchange = function () {
      var file = fi.files && fi.files[0]; if (!file) return; readFields();
      var st = e.steps[+fi.dataset.pick]; st.reading = true; paintEditor();
      window.shrinkPhoto(file).then(function (ph) { st.reading = false; st.nu = ph; st.u = ""; st.p = ""; if (ED === e) paintEditor(); })
        .catch(function () { st.reading = false; toast("사진을 열 수 없어요. 다른 사진으로 넣어 주세요."); if (ED === e) paintEditor(); });
    }; });
  }
  function signHtml(e) {
    var linked = e.m.signSessionId, ss = e.sessions;
    var linkedS = linked && ss ? ss.filter(function (x) { return x.id === linked; })[0] : null;
    var how = e.signHow;
    return '<div class="ed-sign' + (e.sign === null ? " is-ask" : "") + '"><div class="ed-sign__q"><b>이 교육은 서명을 받나요? <em>*</em></b>'
      + '<span>모든 교육이 서명이 필요한 건 아니에요. 서명을 받으면 교육 서명 관리에 세션이 연결돼요.</span></div>'
      + '<div class="ed-yn" role="group" aria-label="서명 받기">'
        + '<button type="button" data-sign="0" aria-pressed="' + (e.sign === false) + '">서명 없이 보기만</button>'
        + '<button type="button" data-sign="1" aria-pressed="' + (e.sign === true) + '">' + IC.pen + '서명 받기</button></div>'
      + (e.sign ? '<div class="ed-how">'
          + (linked ? '<label><input type="radio" name="edHow" value="keep" data-how ' + (how === "keep" ? "checked" : "") + '> 지금 연결된 세션 그대로 <small>' + esc(linkedS ? (linkedS.date + " · " + (linkedS.title || "")) : "연결됨") + '</small></label>' : "")
          + '<label><input type="radio" name="edHow" value="new" data-how ' + (how === "new" ? "checked" : "") + '> 새 서명 세션 만들기</label>'
          + (how === "new" ? '<div class="ed-how__in"><span>교육일</span><input type="date" id="edSignDate" value="' + esc(e.signDate) + '"><small>세션 제목은 자료 제목과 같게 만들어요. 명단은 교육 서명 관리에서 등록해요.</small></div>' : "")
          + '<label><input type="radio" name="edHow" value="pick" data-how ' + (how === "pick" ? "checked" : "") + '> 이미 있는 세션에 연결</label>'
          + (how === "pick" ? '<div class="ed-how__in">' + (ss === null ? '<small>세션 불러오는 중…</small>'
              : ss.length ? '<select id="edSignPick"><option value="">세션을 골라 주세요</option>' + ss.map(function (x) {
                  return '<option value="' + esc(x.id) + '"' + (e.signPick === x.id ? " selected" : "") + '>' + esc((x.date || "") + " · " + (x.title || x.category || "")) + '</option>'; }).join("") + '</select>'
              : '<small>진행 중인 세션이 없어요. 새 서명 세션을 만들어 주세요.</small>') + '</div>' : "")
        + '</div>' : "")
      + '</div>';
  }
  function save() {
    var e = ED; if (!e || e.busy) return; readFields();
    if (!e.title) { toast("제목을 써 주세요"); e.el.querySelector("#edTitle").focus(); return; }
    var steps = e.steps.filter(function (s) { return s.u || s.nu || s.text.trim() || s.warn.trim(); });
    if (!steps.length) { toast("단계를 하나 이상 채워 주세요"); return; }
    if (e.steps.some(function (s) { return s.reading; })) { toast("사진을 줄이는 중이에요. 잠시 후 저장해 주세요."); return; }
    if (e.sign === null) { toast("서명을 받는지 먼저 골라 주세요"); e.el.querySelector(".ed-sign").scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    if (e.sign && e.signHow === "pick" && !e.signPick) { toast("연결할 서명 세션을 골라 주세요"); return; }
    if (e.sign && e.signHow === "new" && !e.signDate) { toast("교육일을 골라 주세요"); return; }
    e.busy = true; var total = steps.filter(function (s) { return s.nu; }).length, k = 0;
    e.busyText = total ? "사진 올리는 중… 0/" + total : "저장하는 중…"; paintEditor();
    var setBusy = function (t) { e.busyText = t; var b = e.el.querySelector("#edSave"); if (b) b.textContent = t; };
    steps.reduce(function (p, st) {
      return p.then(function () {
        if (!st.nu) return;
        return Store.uploadMaterialPhoto(e.m.id, st.nu.dataUrl, st.nu.name).then(function (r) { st.u = r.u; st.p = r.p; st.nu = null; k++; setBusy("사진 올리는 중… " + k + "/" + total); });
      });
    }, Promise.resolve()).then(function () {
      // 서명: 새 세션이면 먼저 만들고 id 를 기억(다시 저장해도 두 번 만들지 않게)
      if (!e.sign) return "";
      if (e.signHow === "keep") return e.m.signSessionId;
      if (e.signHow === "pick") return e.signPick;
      if (e.madeSession) return e.madeSession;
      setBusy("서명 세션 만드는 중…");
      return Store.saveSession({ date: e.signDate, category: e.topic || "가든 교육", title: e.title }).then(function (res) { e.madeSession = res && res.id; return e.madeSession; });
    }).then(function (sid) {
      setBusy("저장하는 중…");
      var out = Object.assign({}, e.m, { topic: e.topic, title: e.title, summary: e.summary, needsSign: !!e.sign, signSessionId: e.sign ? (sid || "") : "",
        steps: steps.map(function (s) { return { u: s.u || "", p: s.p || "", text: s.text.trim(), warn: s.warn.trim() }; }),
        createdBy: e.m.createdBy || (e.opts.by || "") });
      return Store.saveMaterial(out).then(function () {
        var keep = out.steps.map(function (s) { return s.p; });
        return Store.removeMaterialPhotos(e.orig.filter(function (p) { return keep.indexOf(p) < 0; })).then(function () { return out; });
      });
    }).then(function (out) {
      var o = e.opts; closeEditor(); toast((e.isNew ? "교육 자료를 만들었어요" : "교육 자료를 고쳤어요") + (e.madeSession ? " · 서명 세션도 만들었어요" : ""));
      LIST.topic = ""; refreshList(); openReader(out, o);
    }).catch(function (err) {
      console.warn(err); e.busy = false; paintEditor();
      toast(/materials/.test(String(err && err.message)) ? "자료실 저장 공간이 아직 없어요 (supabase/materials.sql 실행 필요)" : "저장하지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.");
    });
  }
  addEventListener("beforeunload", function (ev) { if (ED && ED.busy) { ev.preventDefault(); ev.returnValue = ""; } });

  window.EduLib = { TOPICS: TOPICS, MAX_STEPS: MAX_STEPS, mountList: mountList, refreshList: refreshList, openReader: openReader, openEditor: openEditor };
})();
