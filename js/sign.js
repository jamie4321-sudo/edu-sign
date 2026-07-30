(function () {
  "use strict";

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmtDateTime(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d)) return iso;
    var p = function (n) { return ("0" + n).slice(-2); };
    return d.getFullYear() + "." + p(d.getMonth() + 1) + "." + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }
  function toast(msg) {
    var el = document.createElement("div");
    el.className = "sw-toast"; el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 2200);
  }

  var MARK_SVG = '<svg viewBox="0 0 24 24" fill="none"><path d="M4 17l4-4 3 3 6-7 3 3" stroke="#1c1c1a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  var qs = new URLSearchParams(location.search);
  var sessionId = qs.get("s");
  var root = document.getElementById("sw");
  var session = null, roster = [];
  var LS_KEY = "edusign-last-" + sessionId;

  if (!sessionId) {
    root.innerHTML = emptyView("잘못된 접근입니다", "관리자에게 전달받은 서명 링크로 다시 접속해주세요.");
  } else {
    load();
  }

  function emptyView(title, sub) {
    return '<div class="sw-brand">EDU<em> · </em>SIGN</div>'
      + '<div class="sw-mark">' + MARK_SVG + '</div>'
      + '<h1 class="sw-title">' + esc(title) + '</h1>'
      + '<p class="sw-sub">' + esc(sub) + '</p>';
  }

  function load() {
    Store.getSession(sessionId).then(function (d) {
      if (!d || !d.session) { root.innerHTML = emptyView("세션을 찾을 수 없습니다", "링크를 다시 확인해주세요."); return; }
      session = d.session;
      roster = d.roster || [];
      var lastId = sessionStorage.getItem(LS_KEY);
      renderSelect(lastId && roster.some(function (r) { return r.id === lastId; }) ? lastId : "");
    });
  }

  function renderSelect(selectedId) {
    root.innerHTML = '<div class="sw-brand">EDU<em> · </em>SIGN</div>'
      + '<div class="sw-mark">' + MARK_SVG + '</div>'
      + '<h1 class="sw-title">' + esc(session.title || session.category || "교육 서명") + '</h1>'
      + '<p class="sw-sub">' + esc(session.date || "") + ' · ' + esc(session.category || "") + '</p>'
      + '<p class="sw-fld-label">이름을 선택하세요</p>'
      + '<div class="sw-select-wrap"><select class="sw-select" id="nameSelect">'
      + '<option value="">이름 선택</option>'
      + roster.map(function (r) {
          return '<option value="' + esc(r.id) + '"' + (r.id === selectedId ? " selected" : "") + '>' + esc(r.name) + (r.dept ? " (" + esc(r.dept) + ")" : "") + (r.signature ? " ✓ 서명완료" : "") + '</option>';
        }).join("")
      + '</select></div>'
      + '<div class="sw-spacer"></div>'
      + '<button class="sw-btn sw-btn--primary" id="startBtn" disabled>시작하기 →</button>'
      + '<div class="sw-chip' + (session.locked ? " is-locked" : "") + '"><span class="dot"></span>' + (session.locked ? "서명 마감" : "서명 가능") + '</div>';

    var select = document.getElementById("nameSelect");
    var startBtn = document.getElementById("startBtn");
    function sync() { startBtn.disabled = !select.value; }
    select.addEventListener("change", sync);
    sync();
    startBtn.addEventListener("click", function () {
      if (!select.value) return;
      sessionStorage.setItem(LS_KEY, select.value);
      var r = roster.find(function (x) { return x.id === select.value; });
      renderGreet(r);
    });
  }

  function renderGreet(r) {
    var locked = session.locked;
    root.innerHTML = '<span class="sw-back" id="backBtn">← 다른 이름으로</span>'
      + '<div class="sw-greet"><h1>' + esc(r.name) + '님, 안녕하세요!</h1><p>' + esc(session.date || "") + ' · ' + esc(session.category || "") + '</p></div>'
      + '<div id="signArea"></div>';

    document.getElementById("backBtn").addEventListener("click", function () { renderSelect(r.id); });

    if (r.signature) renderDoneCard(r); else if (locked) renderLockedCard(); else renderSignCard(r);
  }

  function renderLockedCard() {
    document.getElementById("signArea").innerHTML = '<div class="sw-card"><h3>서명이 마감되었습니다</h3><p class="hint">이 교육 세션은 더 이상 서명을 받지 않습니다. 담당자에게 문의해주세요.</p></div>';
  }

  function renderDoneCard(r) {
    document.getElementById("signArea").innerHTML = '<div class="sw-card">'
      + '<div class="sw-done-badge"><span class="ok">✓</span><div><h3>서명 완료</h3><p class="hint">' + esc(fmtDateTime(r.signedAt)) + '에 서명했어요</p></div></div>'
      + '<div class="sw-done-img"><img src="' + r.signature + '" alt="서명" /></div>'
      + '</div>'
      + (session.locked ? "" : '<button class="sw-btn sw-btn--ghost" id="resignBtn">다시 서명하기</button>');
    var resignBtn = document.getElementById("resignBtn");
    if (resignBtn) resignBtn.addEventListener("click", function () {
      if (!confirm("기존 서명을 지우고 다시 서명하시겠습니까?")) return;
      renderSignCard(r);
    });
  }

  function renderSignCard(r) {
    document.getElementById("signArea").innerHTML = '<div class="sw-card">'
      + '<h3>여기에 서명해주세요</h3><p class="hint">손가락으로 이름을 적어주세요</p>'
      + '<canvas class="sw-sigpad" id="sigPad"></canvas>'
      + '<div class="sw-sig-actions"><button type="button" id="sigClear">다시 쓰기</button></div>'
      + '</div>'
      + '<button class="sw-btn sw-btn--primary" id="sigSave">서명 완료</button>';

    var canvas = document.getElementById("sigPad");
    var ctx = canvas.getContext("2d");
    var drawn = false;

    function resize() {
      var rect = canvas.getBoundingClientRect();
      var ratio = window.devicePixelRatio || 1;
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#1c1c1a";
    }
    setTimeout(resize, 0);

    var drawing = false, lastX = 0, lastY = 0;
    function pos(e) {
      var rect = canvas.getBoundingClientRect();
      var p = e.touches ? e.touches[0] : e;
      return { x: p.clientX - rect.left, y: p.clientY - rect.top };
    }
    function start(e) { e.preventDefault(); drawing = true; drawn = true; canvas.classList.add("has-ink"); var p = pos(e); lastX = p.x; lastY = p.y; }
    function move(e) {
      if (!drawing) return;
      e.preventDefault();
      var p = pos(e);
      ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(p.x, p.y); ctx.stroke();
      lastX = p.x; lastY = p.y;
    }
    function end() { drawing = false; }

    canvas.addEventListener("pointerdown", start);
    canvas.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    canvas.addEventListener("touchstart", start, { passive: false });
    canvas.addEventListener("touchmove", move, { passive: false });
    canvas.addEventListener("touchend", end);

    document.getElementById("sigClear").addEventListener("click", function () {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawn = false;
      canvas.classList.remove("has-ink");
    });

    document.getElementById("sigSave").addEventListener("click", function () {
      if (!drawn) { toast("서명을 먼저 입력해주세요"); return; }
      var out = document.createElement("canvas");
      out.width = 300; out.height = 165;
      var octx = out.getContext("2d");
      octx.fillStyle = "#fff"; octx.fillRect(0, 0, out.width, out.height);
      octx.drawImage(canvas, 0, 0, out.width, out.height);
      var dataUrl = out.toDataURL("image/png");
      Store.signRoster(r.id, dataUrl).then(function () {
        toast("서명이 저장되었습니다");
        Store.getSession(sessionId).then(function (d) {
          roster = d.roster || [];
          var updated = roster.find(function (x) { return x.id === r.id; });
          renderDoneCard(updated);
        });
      });
    });
  }
})();
