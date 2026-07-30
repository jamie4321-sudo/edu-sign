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

  var MARK_SVG = '<svg viewBox="0 0 24 24" fill="none"><path d="M4 17l4-4 3 3 6-7 3 3" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var LOGIN_KEY = "edusign-login-name";

  var root = document.getElementById("sw");
  var allSessions = [], allRoster = [];

  function loadingView() {
    root.innerHTML = '<div class="sw-brand">SNACK<em>&amp;</em>GARDEN</div>'
      + '<div class="sw-mark">' + MARK_SVG + '</div>'
      + '<p class="sw-sub" style="margin-top:0">불러오는 중…</p>';
  }

  loadingView();
  Promise.all([Store.listSessions(), Store.listAllRoster()]).then(function (res) {
    allSessions = res[0] || [];
    allRoster = res[1] || [];
    var saved = "";
    try { saved = localStorage.getItem(LOGIN_KEY) || ""; } catch (e) {}
    if (saved && allRoster.some(function (r) { return r.name === saved; })) renderSessionSelect(saved);
    else renderLogin();
  }).catch(function () {
    root.innerHTML = '<div class="sw-brand">SNACK<em>&amp;</em>GARDEN</div><div class="sw-mark">' + MARK_SVG + '</div>'
      + '<h1 class="sw-title">불러오지 못했습니다</h1><p class="sw-sub">네트워크 상태를 확인하고 새로고침해주세요.</p>';
  });

  /* ---------------- 커스텀 선택 시트 (네이티브 select 대신) ---------------- */
  function openPickSheet(title, items, selectedValue, onSelect) {
    var wrap = document.createElement("div");
    wrap.className = "sw-sheet";
    wrap.innerHTML = '<div class="sw-sheet__backdrop"></div>'
      + '<div class="sw-sheet__panel"><div class="sw-sheet__grip"></div>'
      + '<div class="sw-sheet__head">' + esc(title) + '<button type="button" class="sw-sheet__close">닫기</button></div>'
      + '<div class="sw-sheet__list">'
      + (items.length
          ? items.map(function (it) {
              return '<div class="sw-sheet__row' + (it.value === selectedValue ? " is-selected" : "") + '" data-value="' + esc(it.value) + '">'
                + esc(it.label) + (it.sub ? ' <span>' + esc(it.sub) + '</span>' : "") + '</div>';
            }).join("")
          : '<div class="sw-sheet__empty">선택할 항목이 없습니다</div>')
      + '</div></div>';
    document.body.appendChild(wrap);
    function close() { wrap.remove(); }
    wrap.querySelector(".sw-sheet__backdrop").addEventListener("click", close);
    wrap.querySelector(".sw-sheet__close").addEventListener("click", close);
    wrap.querySelectorAll(".sw-sheet__row").forEach(function (row) {
      row.addEventListener("click", function () { onSelect(row.dataset.value); close(); });
    });
  }

  /* ---------------- 1단계: 이름으로 로그인 ---------------- */
  function renderLogin() {
    var names = [];
    var seen = {};
    allRoster.forEach(function (r) {
      if (!r.name || seen[r.name]) return;
      seen[r.name] = true;
      names.push({ name: r.name, dept: r.dept || "" });
    });
    names.sort(function (a, b) { return a.name.localeCompare(b.name, "ko"); });

    root.innerHTML = '<div class="sw-brand">SNACK<em>&amp;</em>GARDEN</div>'
      + '<div class="sw-mark">' + MARK_SVG + '</div>'
      + '<h1 class="sw-title">교육 서명</h1>'
      + '<p class="sw-sub">이름으로 로그인해주세요</p>'
      + '<p class="sw-fld-label">이름을 선택하세요</p>'
      + '<div class="sw-select-wrap"><button type="button" class="sw-select is-placeholder" id="nameTrigger">이름 선택</button></div>'
      + '<div class="sw-spacer"></div>'
      + '<button class="sw-btn sw-btn--primary" id="loginBtn" disabled>로그인 →</button>';

    var trigger = document.getElementById("nameTrigger");
    var loginBtn = document.getElementById("loginBtn");
    var selectedName = "";

    trigger.addEventListener("click", function () {
      openPickSheet("이름을 선택하세요", names.map(function (n) { return { value: n.name, label: n.name, sub: n.dept }; }), selectedName, function (value) {
        selectedName = value;
        trigger.textContent = value;
        trigger.classList.remove("is-placeholder");
        loginBtn.disabled = !value;
      });
    });
    loginBtn.addEventListener("click", function () {
      if (!selectedName) return;
      try { localStorage.setItem(LOGIN_KEY, selectedName); } catch (e) {}
      renderSessionSelect(selectedName);
    });
  }

  /* ---------------- 2단계: 교육 선택 ---------------- */
  function sessionsForName(name) {
    return allSessions.filter(function (s) {
      if (s.locked) return false;
      return allRoster.some(function (r) { return r.sessionId === s.id && r.name === name; });
    }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  }
  function rosterRowFor(sessionId, name) {
    return allRoster.find(function (r) { return r.sessionId === sessionId && r.name === name; });
  }

  function renderSessionSelect(name) {
    var sessions = sessionsForName(name);

    root.innerHTML = '<div class="sw-brand">SNACK<em>&amp;</em>GARDEN</div>'
      + '<p class="sw-hello"><b>' + esc(name) + '</b>님, 안녕하세요!</p>'
      + '<h1 class="sw-title" style="font-size:20px;margin-bottom:2px">서명할 교육을 선택하세요</h1>'
      + '<div class="sw-session-list" id="sessionList"></div>'
      + '<div class="sw-login-foot"><button id="logoutBtn">다른 사람으로 로그인</button></div>';

    var list = document.getElementById("sessionList");
    if (!sessions.length) {
      list.innerHTML = '<div class="sw-empty">지금 서명할 수 있는 교육이 없어요.<br>담당자에게 문의해주세요.</div>';
    } else {
      list.innerHTML = sessions.map(function (s) {
        var row = rosterRowFor(s.id, name);
        var done = !!(row && row.signature);
        return '<div class="sw-session-card" data-id="' + esc(s.id) + '">'
          + '<div><div class="sw-session-card__date">' + esc(s.date || "") + '</div>'
          + '<div class="sw-session-card__title">' + esc(s.title || s.category || "교육") + '</div>'
          + '<div class="sw-session-card__cat">' + esc(s.category || "") + '</div></div>'
          + '<span class="sw-session-card__badge ' + (done ? "is-done" : "is-todo") + '">' + (done ? "서명완료" : "서명하기") + '</span>'
          + '</div>';
      }).join("");
      list.querySelectorAll(".sw-session-card").forEach(function (card) {
        card.addEventListener("click", function () {
          var s = allSessions.find(function (x) { return x.id === card.dataset.id; });
          var row = rosterRowFor(s.id, name);
          renderGreet(s, row, name);
        });
      });
    }

    document.getElementById("logoutBtn").addEventListener("click", function () {
      try { localStorage.removeItem(LOGIN_KEY); } catch (e) {}
      renderLogin();
    });
  }

  /* ---------------- 3단계: 인사 + 서명 ---------------- */
  function renderGreet(session, row, name) {
    root.innerHTML = '<span class="sw-back" id="backBtn">← 다른 교육 선택</span>'
      + '<div class="sw-greet"><h1>' + esc(row.name) + '님, 안녕하세요!</h1><p>' + esc(session.date || "") + ' · ' + esc(session.category || "") + '</p></div>'
      + '<div id="signArea"></div>';

    document.getElementById("backBtn").addEventListener("click", function () { renderSessionSelect(name); });

    if (row.signature) renderDoneCard(session, row, name);
    else if (session.locked) renderLockedCard();
    else renderSignCard(session, row, name);
  }

  function renderLockedCard() {
    document.getElementById("signArea").innerHTML = '<div class="sw-card"><h3>서명이 마감되었습니다</h3><p class="hint">이 교육 세션은 더 이상 서명을 받지 않습니다. 담당자에게 문의해주세요.</p></div>';
  }

  function renderDoneCard(session, row, name) {
    document.getElementById("signArea").innerHTML = '<div class="sw-card">'
      + '<div class="sw-done-badge"><span class="ok">✓</span><div><h3>서명 완료</h3><p class="hint">' + esc(fmtDateTime(row.signedAt)) + '에 서명했어요</p></div></div>'
      + '<div class="sw-done-img"><img src="' + row.signature + '" alt="서명" /></div>'
      + '</div>'
      + (session.locked ? "" : '<button class="sw-btn sw-btn--ghost" id="resignBtn">다시 서명하기</button>');
    var resignBtn = document.getElementById("resignBtn");
    if (resignBtn) resignBtn.addEventListener("click", function () {
      if (!confirm("기존 서명을 지우고 다시 서명하시겠습니까?")) return;
      renderSignCard(session, row, name);
    });
  }

  function renderSignCard(session, row, name) {
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
      Store.signRoster(row.id, dataUrl).then(function () {
        toast("서명이 저장되었습니다");
        return Store.listAllRoster();
      }).then(function (fresh) {
        allRoster = fresh;
        var updated = rosterRowFor(session.id, name);
        renderDoneCard(session, updated, name);
      });
    });
  }
})();
