(function () {
  "use strict";

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function toast(msg) {
    var el = document.createElement("div");
    el.className = "toast"; el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 2200);
  }

  var qs = new URLSearchParams(location.search);
  var sessionId = qs.get("s");
  var roster = [];
  var session = null;
  var query = "";

  if (!sessionId) {
    document.getElementById("signTitle").textContent = "잘못된 접근입니다";
    document.getElementById("signSub").textContent = "관리자에게 전달받은 서명 링크로 다시 접속해주세요.";
  } else {
    load();
  }

  function load() {
    Store.getSession(sessionId).then(function (d) {
      if (!d || !d.session) {
        document.getElementById("signTitle").textContent = "세션을 찾을 수 없습니다";
        return;
      }
      session = d.session;
      roster = d.roster || [];
      document.getElementById("signTitle").textContent = session.title || session.category || "교육 참석 서명";
      document.getElementById("signSub").textContent = (session.date || "") + " · " + (session.category || "") + (session.locked ? " · 서명 마감" : "");
      renderList();
    });
  }

  document.getElementById("signSearch").addEventListener("input", function (e) {
    query = e.target.value.trim();
    renderList();
  });

  function renderList() {
    var list = document.getElementById("signList");
    var rows = roster.filter(function (r) { return !query || r.name.indexOf(query) > -1; });
    if (!rows.length) { list.innerHTML = '<div class="empty">' + (roster.length ? "검색 결과가 없습니다" : "등록된 명단이 없습니다") + '</div>'; return; }
    list.innerHTML = rows.map(function (r) {
      var done = !!r.signature;
      return '<div class="sign-row' + (done ? " is-done" : "") + '" data-id="' + esc(r.id) + '">'
        + '<div class="sign-row__left"><span class="sign-row__seq mono">' + esc(r.seq) + '</span>'
        + '<div><div class="sign-row__name">' + esc(r.name) + '</div><div class="sign-row__dept">' + esc(r.dept || "") + '</div></div></div>'
        + (done ? '<span class="sign-row__state">서명완료</span>' : '<span class="sign-row__state" style="color:var(--ink-3)">서명하기 →</span>')
        + '</div>';
    }).join("");
    list.querySelectorAll(".sign-row").forEach(function (row) {
      row.addEventListener("click", function () {
        var r = roster.find(function (x) { return x.id === row.dataset.id; });
        if (session.locked) { toast("마감된 교육입니다"); return; }
        if (r.signature) openViewModal(r); else openSignModal(r);
      });
    });
  }

  function openViewModal(r) {
    var wrap = document.createElement("div");
    wrap.className = "modal sig-modal";
    wrap.innerHTML = '<div class="modal__backdrop" data-close></div>'
      + '<div class="modal__card" role="dialog" aria-modal="true">'
      + '<div class="modal__head"><h3>' + esc(r.name) + '님 서명</h3><button class="modal__x" data-close>×</button></div>'
      + '<div class="sig-pad-wrap"><img src="' + r.signature + '" style="width:100%;background:#fff;border-radius:10px" alt="서명" /></div>'
      + '<div class="modal__foot" style="padding:16px 20px 20px"><div class="modal__spacer"></div>'
      + '<button type="button" class="btn" data-resign>다시 서명하기</button>'
      + '<button type="button" class="btn btn--primary" data-close>확인</button></div>'
      + '</div>';
    document.body.appendChild(wrap);
    wrap.querySelectorAll("[data-close]").forEach(function (el) { el.addEventListener("click", function () { wrap.remove(); }); });
    wrap.querySelector("[data-resign]").addEventListener("click", function () {
      if (!confirm("기존 서명을 지우고 다시 서명하시겠습니까?")) return;
      wrap.remove();
      openSignModal(r);
    });
  }

  function openSignModal(r) {
    var wrap = document.createElement("div");
    wrap.className = "modal sig-modal";
    wrap.innerHTML = '<div class="modal__backdrop" data-close></div>'
      + '<div class="modal__card" role="dialog" aria-modal="true">'
      + '<div class="modal__head"><h3>' + esc(r.name) + '님 서명</h3><button class="modal__x" data-close>×</button></div>'
      + '<div class="sig-pad-wrap"><canvas class="sig-pad" id="sigPad"></canvas></div>'
      + '<div class="sig-pad-foot"><button type="button" id="sigClear">지우기</button><span>손가락 또는 마우스로 서명해주세요</span></div>'
      + '<div class="modal__foot" style="padding:16px 20px 20px"><div class="modal__spacer"></div>'
      + '<button type="button" class="btn" data-close>취소</button>'
      + '<button type="button" class="btn btn--primary" id="sigSave">서명 저장</button></div>'
      + '</div>';
    document.body.appendChild(wrap);
    wrap.querySelectorAll("[data-close]").forEach(function (el) { el.addEventListener("click", function () { wrap.remove(); }); });

    var canvas = wrap.querySelector("#sigPad");
    var ctx = canvas.getContext("2d");
    var drawn = false;

    function resize() {
      var rect = canvas.getBoundingClientRect();
      var ratio = window.devicePixelRatio || 1;
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#111";
    }
    setTimeout(resize, 0);

    var drawing = false, lastX = 0, lastY = 0;
    function pos(e) {
      var rect = canvas.getBoundingClientRect();
      var p = e.touches ? e.touches[0] : e;
      return { x: p.clientX - rect.left, y: p.clientY - rect.top };
    }
    function start(e) { e.preventDefault(); drawing = true; drawn = true; var p = pos(e); lastX = p.x; lastY = p.y; }
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

    wrap.querySelector("#sigClear").addEventListener("click", function () {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawn = false;
    });

    wrap.querySelector("#sigSave").addEventListener("click", function () {
      if (!drawn) { toast("서명을 먼저 입력해주세요"); return; }
      var out = document.createElement("canvas");
      out.width = 300; out.height = 120;
      var octx = out.getContext("2d");
      octx.fillStyle = "#fff"; octx.fillRect(0, 0, out.width, out.height);
      octx.drawImage(canvas, 0, 0, out.width, out.height);
      var dataUrl = out.toDataURL("image/png");
      Store.signRoster(r.id, dataUrl).then(function () {
        wrap.remove();
        toast("서명이 저장되었습니다");
        load();
      });
    });
  }
})();
