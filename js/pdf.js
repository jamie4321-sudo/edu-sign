/* =========================================================
   EDU — 교육 자료 PDF 저장 (관리자)
   · 한 쪽 = 1080×1350 세로형. 표지 → 단계마다 1쪽 → (서명 필요하면) 서명 안내 + QR
   · 쪽 그림은 캔버스로 그리고(Kakao Big Sans), jsPDF 는 버튼을 누를 때만 cdnjs 에서 불러온다
   ========================================================= */
(function () {
  "use strict";
  var W = 1080, H = 1350, PAD = 68;
  var C = { bg: "#f4f5f1", ink: "#16160f", ink2: "#55554d", ink3: "#8f8f85", lime: "#bff000", limeInk: "#14160a", limeText: "#5c7a08",
            orange: "#ff8a00", photo: "#e6e9df", warnBg: "#fff1cc", warnInk: "#6b4800", dark: "#16160f", darkSub: "#c9cbc2" };
  var FONT = '"Kakao Big Sans", "Pretendard", "Malgun Gothic", sans-serif';
  var LIBS = { pdf: "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" };

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function toast(msg) { var el = document.createElement("div"); el.className = "toast"; el.textContent = msg; document.body.appendChild(el); setTimeout(function () { el.remove(); }, 2600); }
  function loadScript(src) {
    return new Promise(function (res, rej) {
      if (document.querySelector('script[src="' + src + '"]')) { res(); return; }
      var s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = function () { rej(new Error("라이브러리를 불러오지 못했어요")); }; document.head.appendChild(s);
    });
  }
  function signUrl() {
    if (window.CONFIG && CONFIG.signUrl) return CONFIG.signUrl;
    return location.origin + location.pathname.replace(/[^/]*$/, "") + "sign.html";
  }
  function safeName(s) { return String(s || "교육자료").replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, " ").trim().slice(0, 40); }

  /* ---------- 그리기 도구 ---------- */
  function font(w, px) { return w + " " + px + "px " + FONT; }
  function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  // 한국어 줄바꿈: 띄어쓰기 단위로 넘기고(keep-all), 한 단어가 너무 길면 글자 단위로
  function wrap(g, text, maxW) {
    var out = [];
    String(text || "").split("\n").forEach(function (para) {
      var words = para.split(/(\s+)/).filter(function (x) { return x.length; }), line = "";
      words.forEach(function (w) {
        var t = line + w;
        if (g.measureText(t.trimEnd()).width <= maxW) { line = t; return; }
        if (line.trim()) { out.push(line.trim()); line = ""; }
        if (/^\s+$/.test(w)) return;
        if (g.measureText(w).width <= maxW) { line = w; return; }
        for (var i = 0; i < w.length; i++) { var c = line + w[i]; if (g.measureText(c).width > maxW && line) { out.push(line); line = w[i]; } else line = c; }
      });
      out.push(line.trim());
    });
    while (out.length > 1 && !out[out.length - 1]) out.pop();
    return out;
  }
  function ellipsis(g, text, maxW) { text = String(text || ""); if (g.measureText(text).width <= maxW) return text; while (text && g.measureText(text + "…").width > maxW) text = text.slice(0, -1); return text + "…"; }
  function drawImg(g, img, x, y, w, h, mode) {
    var iw = img.width, ih = img.height, k = mode === "cover" ? Math.max(w / iw, h / ih) : Math.min(w / iw, h / ih);
    var dw = iw * k, dh = ih * k; g.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  }
  function photoBox(g, img, x, y, w, h, mode) {
    g.save(); rrect(g, x, y, w, h, 32); g.fillStyle = C.photo; g.fill(); g.clip();
    if (img) drawImg(g, img, x, y, w, h, mode);
    g.restore();
  }
  function brand(g, dark) {
    var y = 100;
    g.fillStyle = C.orange; g.beginPath(); g.arc(PAD + 11, y - 11, 11, 0, Math.PI * 2); g.fill();
    g.textBaseline = "alphabetic"; g.textAlign = "left"; g.font = font(800, 30);
    var x = PAD + 34, parts = [["SNACK", dark ? "#f4f5f1" : C.ink], ["&", dark ? C.lime : C.limeText], ["GARDEN EDU", dark ? "#f4f5f1" : C.ink]];
    parts.forEach(function (p) { g.fillStyle = p[1]; g.fillText(p[0], x, y); x += g.measureText(p[0]).width + 2; });
    g.font = font(700, 26); g.fillStyle = C.ink3; g.textAlign = "right"; g.fillText(PART_LABEL, W - PAD, y); g.textAlign = "left";
  }
  var PART_LABEL = "가든 교육";
  function canvas(bg) { var c = document.createElement("canvas"); c.width = W; c.height = H; var g = c.getContext("2d"); g.fillStyle = bg; g.fillRect(0, 0, W, H); return { c: c, g: g }; }

  /* ---------- 카드 ---------- */
  function coverCard(m, img) {
    var o = canvas(C.bg), g = o.g, maxW = W - PAD * 2;
    brand(g);
    g.font = font(900, 84); var lines = wrap(g, m.title || "교육 자료", maxW).slice(0, 3);
    var blockH = 60 + 22 + lines.length * 97 + 18 + 40;
    var top = H - 64 - blockH;
    photoBox(g, img, PAD, 150, maxW, top - 40 - 150, "cover");
    // 주제
    var y = top; g.font = font(800, 30); var tw = g.measureText(m.topic || "가든 교육").width;
    rrect(g, PAD, y, tw + 48, 56, 28); g.fillStyle = C.lime; g.fill();
    g.fillStyle = C.limeInk; g.fillText(m.topic || "가든 교육", PAD + 24, y + 39);
    // 제목
    y += 60 + 22; g.font = font(900, 84); g.fillStyle = C.ink;
    lines.forEach(function (l, i) { g.fillText(l, PAD, y + 76 + i * 97); });
    y += lines.length * 97 + 18;
    g.font = font(700, 32); g.fillStyle = C.ink2;
    var meta = (m.steps || []).length + "단계" + (m.needsSign ? "  ·  ✍ 서명이 필요해요" : "");
    g.fillText(meta, PAD, y + 34);
    return o.c;
  }
  function stepCard(m, st, i, img) {
    var o = canvas(C.bg), g = o.g, n = (m.steps || []).length, maxW = W - PAD * 2;
    brand(g);
    // 단계 번호
    var cy = 140 + 46;
    g.fillStyle = C.lime; g.beginPath(); g.arc(PAD + 46, cy, 46, 0, Math.PI * 2); g.fill();
    g.fillStyle = C.limeInk; g.font = font(900, 52); g.textAlign = "center"; g.fillText(String(i + 1), PAD + 46, cy + 18); g.textAlign = "left";
    g.fillStyle = C.ink3; g.font = font(700, 34); g.fillText("/ " + n + " 단계", PAD + 92 + 18, cy + 12);
    var y = cy + 46 + 32, bottom = H - 120;
    if (img) { photoBox(g, img, PAD, y, maxW, 640, "contain"); y += 640 + 40; }
    else y += 60;
    // 설명 + 주의: 칸에 들어갈 때까지 글자를 줄인다
    var size = img ? 64 : 84, lines, wlines, wsize, need;
    for (; ; size -= 4) {
      g.font = font(800, size); lines = st.text ? wrap(g, st.text, maxW) : [];
      wsize = Math.max(34, Math.round(size * 0.69)); g.font = font(800, wsize); wlines = st.warn ? wrap(g, st.warn, maxW - 68 - 64) : [];
      need = lines.length * size * 1.4 + (wlines.length ? 30 + 56 + wlines.length * wsize * 1.4 : 0);
      if (y + need <= bottom || size <= 40) break;
    }
    g.fillStyle = C.ink; g.font = font(800, size);
    lines.forEach(function (l, k) { g.fillText(l, PAD, y + size + k * size * 1.4); });
    y += lines.length * size * 1.4;
    if (wlines.length) {
      y += 30; var bh = 56 + wlines.length * wsize * 1.4;
      rrect(g, PAD, y, maxW, bh, 28); g.fillStyle = C.warnBg; g.fill();
      g.fillStyle = C.warnInk; g.font = font(800, wsize);
      g.fillText("⚠️", PAD + 34, y + 28 + wsize);
      wlines.forEach(function (l, k) { g.fillText(l, PAD + 34 + 64, y + 28 + wsize + k * wsize * 1.4); });
    }
    // 아래: 제목 · 진행 막대
    var fy = H - 52; g.font = font(700, 28); g.fillStyle = C.ink3;
    var barW = n * 26 + 34 + (n - 1) * 10;
    g.fillText(ellipsis(g, m.title, maxW - barW - 30), PAD, fy);
    var bx = W - PAD - barW;
    for (var k = 0; k < n; k++) { var w = k === i ? 60 : 26; rrect(g, bx, fy - 18, w, 12, 6); g.fillStyle = k === i ? C.ink : "#d9dbd2"; g.fill(); bx += w + 10; }
    return o.c;
  }
  function signCard(qr) {
    var o = canvas(C.dark), g = o.g, cx = W / 2;
    brand(g, true);
    g.fillStyle = C.lime; g.beginPath(); g.arc(cx, 330, 85, 0, Math.PI * 2); g.fill();
    g.font = font(400, 90); g.textAlign = "center"; g.fillStyle = C.limeInk; g.fillText("✍", cx, 362);
    g.fillStyle = "#f4f5f1"; g.font = font(900, 92);
    g.fillText("교육을 다 봤으면", cx, 560); g.fillText("서명해 주세요", cx, 670);
    g.fillStyle = C.darkSub; g.font = font(400, 40);
    g.fillText("QR을 찍거나 아래 주소로 들어가", cx, 760); g.fillText("내 이름을 고르고 서명해요", cx, 820);
    if (qr) { rrect(g, cx - 172, 870, 344, 344, 28); g.fillStyle = "#fff"; g.fill(); g.drawImage(qr, cx - 150, 892, 300, 300); }
    g.fillStyle = C.lime; g.font = font(700, 30); g.fillText(signUrl().replace(/^https?:\/\//, ""), cx, qr ? 1265 : 960);
    g.textAlign = "left";
    return o.c;
  }

  // 사진은 blob 으로 받아서 그린다(캔버스가 막히지 않게). 못 받으면 사진 없이
  function loadImg(url) {
    if (!url) return Promise.resolve(null);
    return fetch(url, { mode: "cors" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.blob(); })
      .then(function (b) {
        if (window.createImageBitmap) return createImageBitmap(b);
        return new Promise(function (res, rej) { var u = URL.createObjectURL(b), im = new Image(); im.onload = function () { res(im); }; im.onerror = rej; im.src = u; });
      }).catch(function (e) { console.warn("사진을 못 불러옴", url, e); return null; });
  }
  function toBlob(c) { return new Promise(function (res) { c.toBlob(res, "image/jpeg", 0.9); }); }

  function build(m, onStep) {
    var steps = m.steps || [];
    return Promise.all(["400", "700", "800", "900"].map(function (w) { return document.fonts && document.fonts.load(w + " 40px \"Kakao Big Sans\"", "가A"); }))
      .catch(function () {}).then(function () {
        var cover = (steps.filter(function (s) { return s.u; })[0] || {}).u;
        return Promise.all([loadImg(cover)].concat(steps.map(function (s) { return loadImg(s.u); }))
          .concat([m.needsSign ? loadImg("https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=0&data=" + encodeURIComponent(signUrl())) : Promise.resolve(null)]));
      }).then(function (imgs) {
        var list = [], base = safeName(m.title), pad = function (k) { return ("0" + k).slice(-2); };
        list.push({ name: base + "_" + pad(1) + "_표지.jpg", label: "표지", c: coverCard(m, imgs[0]) });
        steps.forEach(function (st, i) { onStep && onStep(i + 1, steps.length); list.push({ name: base + "_" + pad(i + 2) + "_" + (i + 1) + "단계.jpg", label: (i + 1) + "단계", c: stepCard(m, st, i, imgs[i + 1]) }); });
        if (m.needsSign) list.push({ name: base + "_" + pad(steps.length + 2) + "_서명.jpg", label: "서명 안내", c: signCard(imgs[imgs.length - 1]) });
        return Promise.all(list.map(function (x) { return toBlob(x.c).then(function (b) { x.blob = b; x.url = URL.createObjectURL(b); return x; }); }));
      });
  }

  /* ---------- PDF 만들기 · 저장 ---------- */
  function download(blob, name) { var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
  // 자료 → PDF blob (onStep: 진행 안내)
  function makePdf(m, onStep) {
    return Promise.all([build(m, onStep), loadScript(LIBS.pdf)]).then(function (a) {
      var cards = a[0];
      var pdf = new window.jspdf.jsPDF({ orientation: "portrait", unit: "px", format: [W, H], hotfixes: ["px_scaling"], compress: true });
      cards.forEach(function (x, i) { if (i) pdf.addPage([W, H], "portrait"); pdf.addImage(x.c.toDataURL("image/jpeg", 0.88), "JPEG", 0, 0, W, H); URL.revokeObjectURL(x.url); });
      return { blob: pdf.output("blob"), name: safeName(m.title) + ".pdf", pages: cards.length };
    });
  }
  // 드라이브(지정 폴더 · 파트별 하위 폴더)에 PDF 넣기 — GAS(gas/Code.gs handlePdf_) 경유, 같은 자료의 예전 PDF 는 바꿔치기
  var PART_FOLDER = { garden: "가든 교육", snack: "스낵큐레이션 교육", support: "총무지원 교육" };
  function toDrive(m, r) {
    var ep = window.CONFIG && CONFIG.endpoint;
    if (!ep) return Promise.reject(new Error("드라이브 연동 주소 없음"));
    return new Promise(function (res, rej) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.onerror = rej; fr.readAsDataURL(r.blob); })
      .then(function (dataUrl) {
        return fetch(ep, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ key: CONFIG.apiKey || "", type: "pdf", action: "save", materialId: m.id, name: r.name, folder: PART_FOLDER[m.part] || "", dataUrl: dataUrl.replace(/^data:[^;]*;/, "data:application/pdf;") }) });
      }).then(function (x) { return x.json(); }).then(function (j) { if (!j || !j.ok) throw new Error((j && j.error) || "드라이브 저장 실패"); return j; });
  }
  // 게시 · 저장할 때 뒤에서 조용히 드라이브 PDF 를 새로 (실패해도 저장은 그대로)
  function autoDrive(m) {
    if (!m || m.status === "draft") return;
    makePdf(m).then(function (r) { return toDrive(m, r); })
      .then(function () { toast("드라이브에 PDF도 저장했어요"); })
      .catch(function (e) { console.warn("드라이브 PDF 자동 저장 실패", e); toast("드라이브 PDF 저장은 못 했어요 · ‘PDF로 저장’으로 다시 해 주세요"); });
  }
  function savePdf(m, btn) {
    var label = btn ? btn.textContent : "";
    var set = function (t) { if (btn) { btn.textContent = t; btn.disabled = true; } };
    set("PDF 만드는 중…");
    return makePdf(m, function (k, n) { set(k < n ? "PDF 만드는 중… " + k + "/" + n : "거의 다 됐어요…"); })
      .then(function (r) {
        download(r.blob, r.name); set("드라이브에 넣는 중…");
        return toDrive(m, r).then(function () { toast("PDF를 저장했어요 (" + r.pages + "쪽) · 드라이브에도 넣었어요"); },
          function (e) { console.warn(e); toast("PDF를 내려받았어요 · 드라이브 저장은 못 했어요"); }).then(function () { return r; });
      })
      .catch(function (e) { console.warn(e); toast("PDF를 만들지 못했어요. 인터넷 연결을 확인해 주세요."); })
      .then(function (r) { if (btn) { btn.textContent = label; btn.disabled = false; } return r; });
  }

  window.EduPdf = { make: makePdf, save: savePdf, toDrive: toDrive, autoDrive: autoDrive };
})();
