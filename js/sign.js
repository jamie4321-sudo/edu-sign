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
  // ?s=<세션id> → 그 서명 전용 링크 (동의서 등): 그 명단 이름만 보이고, 로그인하면 바로 서명 화면
  // 공용 링크(파라미터 없음)에는 동의서 세션과 그 명단을 보이지 않음 — 동의서는 전용 링크로만
  var ONLY = new URLSearchParams(location.search).get("s") || "";
  var onlySession = null;
  // ?intern=<인턴 id> → 중증장애인턴제 출석 전용 링크 (그 인턴 이름만 보이고 로그인하면 바로 출석 · 서명)
  var INTERN = new URLSearchParams(location.search).get("intern") || "";
  var interns = [];
  function internFor(name) { return interns.filter(function (p) { return p.active && (p.crewName || p.name) === name; })[0] || null; }

  function loadingView() {
    root.innerHTML = '<div class="sw-brand">SNACK<em>&amp;</em>GARDEN</div>'
      + '<div class="sw-mark">' + MARK_SVG + '</div>'
      + '<p class="sw-sub" style="margin-top:0">불러오는 중…</p>';
  }

  loadingView();
  var internsP = window.Intern ? Intern.store.listProfiles().catch(function () { return []; }) : Promise.resolve([]);
  var metasP = Store.sessionMetas ? Store.sessionMetas() : Promise.resolve({});
  Promise.all([Store.listSessions(), Store.listAllRoster(), internsP, metasP]).then(function (res) {
    allSessions = res[0] || [];
    var metas = res[3] || {};
    allSessions.forEach(function (s) { if (metas[s.id] && (!s.meta || !Object.keys(s.meta).length)) s.meta = metas[s.id]; });
    allRoster = res[1] || [];
    interns = res[2] || [];
    if (INTERN) {
      interns = interns.filter(function (p) { return p.id === INTERN; });
      allSessions = []; allRoster = [];
      if (!interns.length) {
        root.innerHTML = '<div class="sw-brand">SNACK<em>&amp;</em>GARDEN</div><div class="sw-mark">' + MARK_SVG + '</div>'
          + '<h1 class="sw-title">링크를 찾을 수 없어요</h1><p class="sw-sub">담당자에게 새 링크를 받아 주세요.</p>';
        return;
      }
    } else if (ONLY) {
      onlySession = allSessions.find(function (s) { return s.id === ONLY; }) || null;
      allSessions = onlySession ? [onlySession] : [];
      allRoster = scopeRoster(allRoster);
      if (!onlySession) {
        root.innerHTML = '<div class="sw-brand">SNACK<em>&amp;</em>GARDEN</div><div class="sw-mark">' + MARK_SVG + '</div>'
          + '<h1 class="sw-title">링크를 찾을 수 없어요</h1><p class="sw-sub">담당자에게 새 링크를 받아 주세요.</p>';
        return;
      }
    } else {
      var hidden = {};
      allSessions = allSessions.filter(function (s) { if (isConsent(s)) { hidden[s.id] = true; return false; } return true; });
      allRoster = scopeRoster(allRoster);
    }
    // 저장된 이름으로 자동 로그인하지 않음 — 같은 기기를 여러 크루가 쓰므로 항상 이름 로그인부터
    renderLogin();
  }).catch(function () {
    root.innerHTML = '<div class="sw-brand">SNACK<em>&amp;</em>GARDEN</div><div class="sw-mark">' + MARK_SVG + '</div>'
      + '<h1 class="sw-title">불러오지 못했습니다</h1><p class="sw-sub">네트워크 상태를 확인하고 새로고침해주세요.</p>';
  });

  // 이 링크에서 보이는 세션의 명단만 남김 (전용 링크 = 그 세션, 공용 링크 = 동의서 빼고)
  function scopeRoster(rows) {
    var ids = {};
    allSessions.forEach(function (s) { ids[s.id] = true; });
    return (rows || []).filter(function (r) { return ids[r.sessionId]; });
  }

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
    if (!ONLY) interns.forEach(function (p) {
      var n = p.crewName || p.name;
      if (p.active && n && !seen[n]) { seen[n] = true; names.push({ name: n, dept: "인턴" }); }
    });
    names.sort(function (a, b) { return a.name.localeCompare(b.name, "ko"); });

    root.innerHTML = '<div class="sw-brand">SNACK<em>&amp;</em>GARDEN</div>'
      + '<div class="sw-mark">' + MARK_SVG + '</div>'
      + '<h1 class="sw-title">' + (INTERN ? "중증장애인턴제 출석" : "") + esc(INTERN ? "" : onlySession && isConsent(onlySession) ? Consent.doc.docTitle : (onlySession ? (onlySession.title || "서명") : "서명")) + '</h1>'
      + '<p class="sw-sub">' + (INTERN ? "이름을 고르면 바로 오늘 출석 · 서명해요" : onlySession ? esc(isConsent(onlySession) ? Consent.event(onlySession) : (onlySession.category || "")) + ' · 이름을 고르면 바로 서명해요' : "이름으로 로그인해주세요") + '</p>'
      + '<p class="sw-fld-label">이름을 선택하세요</p>'
      + '<div class="sw-select-wrap"><button type="button" class="sw-select is-placeholder" id="nameTrigger">이름 선택</button></div>'
      + '<div class="sw-spacer"></div>'
      + '<button class="sw-btn sw-btn--primary" id="loginBtn" disabled>로그인 →</button>'
      + '<div class="sw-login-foot"><button type="button" id="adminLoginBtn">관리자 로그인</button></div>';

    var trigger = document.getElementById("nameTrigger");
    var loginBtn = document.getElementById("loginBtn");
    var adminBtn = document.getElementById("adminLoginBtn");
    if (adminBtn) adminBtn.addEventListener("click", function () { location.href = "./index.html"; });
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
      if (INTERN) InternCrew.open(root, interns[0], renderLogin);
      else if (onlySession) renderGreet(onlySession, rosterRowFor(onlySession.id, selectedName), selectedName);
      else renderSessionSelect(selectedName);
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
      + '<h1 class="sw-title" style="font-size:20px;margin-bottom:2px">서명할 것을 선택하세요</h1>'
      + '<div class="sw-session-list" id="sessionList"></div>'
      + '<div class="sw-login-foot"><button id="logoutBtn">다른 사람으로 로그인</button></div>';

    var list = document.getElementById("sessionList");
    var ip = internFor(name);
    if (!sessions.length && !ip) {
      list.innerHTML = '<div class="sw-empty">지금 서명할 것이 없어요.<br>담당자에게 문의해주세요.</div>';
    } else {
      list.innerHTML = (ip ? internCardHtml(ip) : "") + sessions.map(function (s) {
        var row = rosterRowFor(s.id, name);
        var done = !!(row && row.signature);
        var consent = isConsent(s);   // 동의서는 교육이 아니라 '촬영 및 초상권 활용 동의서' 로 보이게
        return '<div class="sw-session-card" data-id="' + esc(s.id) + '">'
          + '<div><div class="sw-session-card__date">' + esc(s.date || "") + '</div>'
          + '<div class="sw-session-card__title">' + esc(consent ? Consent.doc.docTitle : (s.title || s.category || "교육")) + '</div>'
          + '<div class="sw-session-card__cat">' + esc(consent ? Consent.event(s) : (s.category || "")) + '</div></div>'
          + '<span class="sw-session-card__badge ' + (done ? "is-done" : "is-todo") + '">' + (done ? "서명완료" : "서명하기") + '</span>'
          + '</div>';
      }).join("");
      var ic = list.querySelector("[data-intern]");
      if (ic) ic.addEventListener("click", function () { InternCrew.open(root, ip, function () { renderSessionSelect(name); }); });
      list.querySelectorAll(".sw-session-card[data-id]").forEach(function (card) {
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

  // 중증장애인턴제 출석 카드 (교육 서명 목록 맨 위)
  function internCardHtml(p) {
    return '<div class="sw-session-card" data-intern="' + esc(p.id) + '">'
      + '<div><div class="sw-session-card__date">매일</div><div class="sw-session-card__title">중증장애인턴제 출석</div>'
      + '<div class="sw-session-card__cat">오늘 출석하고 서명해요</div></div>'
      + '<span class="sw-session-card__badge is-todo">출석하기</span></div>';
  }

  /* ---------------- 3단계: 인사 + 서명 ---------------- */
  function isConsent(session) { return !!(window.Consent && Consent.isConsent(session)); }

  // 동의서: '대략적인 내용'(쉬운 말)을 먼저 보여 주고, 원본 그대로의 동의서는 '동의서 크게 보기'로
  function consentDocHtml(session) {
    var d = Consent.doc;
    return '<div class="sw-card sw-consent">'
      + '<h3>' + esc(d.docTitle) + '</h3>'
      + '<p class="hint">' + esc(Consent.event(session)) + '</p>'
      + '<p class="sw-consent__label">대략적인 내용</p>'
      + '<dl class="sw-consent__easy">' + d.easy.map(function (x) { return '<div><dt>' + esc(x.k) + '</dt><dd>' + esc(x.t) + '</dd></div>'; }).join("") + '</dl>'
      + '<button type="button" class="sw-btn sw-consent__open" id="openDocBtn">동의서 크게 보기</button>'
      + '<p class="sw-consent__confirm">' + esc(d.confirm) + '</p>'
      + '</div>';
  }

  // 원본 1쪽 그대로의 동의서 + 내가 서명할 줄(성명 · 촬영 동의 서명)을 종이처럼 보여 줌
  function openConsentPaper(session, row) {
    var d = Consent.doc;
    var wrap = document.createElement("div");
    wrap.className = "sw-doc";
    wrap.setAttribute("role", "dialog"); wrap.setAttribute("aria-modal", "true"); wrap.setAttribute("aria-label", d.docTitle);
    wrap.innerHTML = '<div class="sw-doc__bar"><b>동의서 크게 보기</b><button type="button" class="sw-doc__x" aria-label="닫기">닫기</button></div>'
      + '<div class="sw-doc__scroll"><div class="sw-paper">' + Consent.docHtml(session)
      + '<table class="sw-paper__row"><thead><tr><th>성명</th><th>' + esc(d.sigLabel) + '</th></tr></thead>'
      + '<tbody><tr><td>' + esc(Consent.printName(row)) + '</td><td>' + (row.signature ? '<img src="' + row.signature + '" alt="내 서명" />' : '<span>여기에 내 서명이 들어가요</span>') + '</td></tr></tbody></table>'
      + '</div></div>'
      + '<div class="sw-doc__foot"><button type="button" class="sw-btn sw-btn--primary" id="docDoneBtn">다 읽었어요</button></div>';
    document.body.appendChild(wrap);
    document.body.style.overflow = "hidden";
    function close() { wrap.remove(); document.body.style.overflow = ""; }
    wrap.querySelector(".sw-doc__x").addEventListener("click", close);
    wrap.querySelector("#docDoneBtn").addEventListener("click", function () {
      close();
      var pad = document.getElementById("sigPad");
      if (pad) pad.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function renderGreet(session, row, name) {
    var consent = isConsent(session);
    root.innerHTML = '<span class="sw-back" id="backBtn">' + (onlySession ? "← 다른 사람으로 로그인" : "← 다른 서명 선택") + '</span>'
      + '<div class="sw-greet"><h1>' + esc(row.name) + '님, 안녕하세요!</h1><p>' + (consent ? esc(Consent.doc.docTitle) : esc(session.date || "") + ' · ' + esc(session.category || "")) + '</p></div>'
      + (consent ? consentDocHtml(session) : "")
      + '<div id="signArea"></div>';

    document.getElementById("backBtn").addEventListener("click", function () { if (onlySession) renderLogin(); else renderSessionSelect(name); });
    var openDoc = document.getElementById("openDocBtn");
    if (openDoc) openDoc.addEventListener("click", function () { openConsentPaper(session, rosterRowFor(session.id, name) || row); });

    if (row.signature) renderDoneCard(session, row, name);
    else if (isConsent(session) && Consent.isRefused(row)) renderRefusedCard(session, row, name);
    else if (session.locked) renderLockedCard();
    else renderSignCard(session, row, name);
  }

  // 동의하지 않음으로 기록된 상태 — 참석 O/X 는 그대로 고를 수 있고, 마음이 바뀌면 서명하러 갈 수 있음
  function renderRefusedCard(session, row, name) {
    document.getElementById("signArea").innerHTML = '<div class="sw-card">'
      + '<div class="sw-done-badge"><span class="ok is-no">✕</span><div><h3>동의하지 않음</h3><p class="hint">' + esc(fmtDateTime(row.extra.refusedAt)) + '에 기록했어요</p></div></div>'
      + '<p class="hint" style="margin-top:12px">괜찮아요. 단체 사진에서 빠지거나 얼굴을 가려요(모자이크).</p>'
      + '</div>'
      + askHtml(session, row)
      + (session.locked ? "" : '<button class="sw-btn sw-btn--ghost" id="reConsentBtn">마음이 바뀌었어요 (동의하고 서명하기)</button>');
    bindAsk(session, row);
    var re = document.getElementById("reConsentBtn");
    if (re) re.addEventListener("click", function () { renderSignCard(session, row, name); });
  }

  function renderLockedCard() {
    document.getElementById("signArea").innerHTML = '<div class="sw-card"><h3>서명이 마감되었습니다</h3><p class="hint">이 서명은 더 이상 서명을 받지 않습니다. 담당자에게 문의해주세요.</p></div>';
  }

  function renderDoneCard(session, row, name) {
    document.getElementById("signArea").innerHTML = '<div class="sw-card">'
      + '<div class="sw-done-badge"><span class="ok">✓</span><div><h3>' + (isConsent(session) ? "동의 서명 완료" : "서명 완료") + '</h3><p class="hint">' + esc(fmtDateTime(row.signedAt)) + '에 서명했어요</p></div></div>'
      + '<div class="sw-done-img"><img src="' + row.signature + '" alt="서명" /></div>'
      + '</div>'
      + (checkList(session).length ? '<div id="chkArea"></div>' : "")
      + askHtml(session, row)
      + (session.locked ? "" : '<button class="sw-btn sw-btn--ghost" id="resignBtn">다시 서명하기</button>');
    bindAsk(session, row);
    if (checkList(session).length) {
      var dPicked = pickedFrom(session, row), saveT = null;
      mountChecks(session, dPicked, !session.locked, function (p) {
        clearTimeout(saveT);
        saveT = setTimeout(function () {
          var next = extraWith(session, row, p);
          Store.updateRosterExtra(row.id, next).then(function () { row.extra = next; toast("체크를 저장했어요"); })
            .catch(function () { toast("저장하지 못했어요. 다시 눌러 주세요."); });
        }, 400);
      });
    }
    var resignBtn = document.getElementById("resignBtn");
    if (resignBtn) resignBtn.addEventListener("click", function () {
      if (!confirm("기존 서명을 지우고 다시 서명하시겠습니까?")) return;
      renderSignCard(session, row, name);
    });
  }

  /* 동의서: 서명한 뒤 크루가 직접 고르는 O/X (예: 훈련 참여 여부) → roster.extra */
  function askCols(session) {
    return isConsent(session) ? Consent.cols(session).filter(function (c) { return c.ask; }) : [];
  }
  function askHtml(session, row) {
    var x = row.extra || {};
    return askCols(session).filter(function (c) { return x[c.key] !== "-"; }).map(function (c) {
      var v = x[c.key] || "";
      return '<div class="sw-card sw-ask" data-ask="' + esc(c.key) + '">'
        + '<h3>' + esc(c.ask) + '</h3><p class="hint">' + (v ? "골랐어요. 바꾸려면 다시 누르세요." : "하나를 눌러 주세요") + '</p>'
        + '<div class="sw-ask__btns">'
        + '<button type="button" class="sw-ask__btn' + (v === "O" ? " is-on" : "") + '" data-v="O"' + (session.locked ? " disabled" : "") + '><b>O</b>참여했어요</button>'
        + '<button type="button" class="sw-ask__btn' + (v === "X" ? " is-on" : "") + '" data-v="X"' + (session.locked ? " disabled" : "") + '><b>X</b>참여 못 했어요</button>'
        + '</div></div>';
    }).join("");
  }
  function bindAsk(session, row) {
    document.querySelectorAll(".sw-ask").forEach(function (card) {
      var key = card.dataset.ask;
      card.querySelectorAll(".sw-ask__btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var next = Object.assign({}, row.extra || {});
          next[key] = btn.dataset.v;
          card.querySelectorAll(".sw-ask__btn").forEach(function (b) { b.disabled = true; });
          Store.updateRosterExtra(row.id, next).then(function () {
            row.extra = next;
            card.querySelectorAll(".sw-ask__btn").forEach(function (b) { b.disabled = false; b.classList.toggle("is-on", b === btn); });
            card.querySelector(".hint").textContent = "골랐어요. 바꾸려면 다시 누르세요.";
            toast("저장했어요");
            // 다음 질문이 아직 안 골라졌으면 그쪽으로
            var nextCard = card.nextElementSibling;
            if (nextCard && nextCard.classList.contains("sw-ask") && !nextCard.querySelector(".is-on")) nextCard.scrollIntoView({ behavior: "smooth", block: "center" });
          }).catch(function () {
            card.querySelectorAll(".sw-ask__btn").forEach(function (b) { b.disabled = false; });
            toast("저장하지 못했어요. 다시 눌러 주세요.");
          });
        });
      });
    });
  }

  /* 교육 체크 (sessions.meta.checks) — 예: 4대 법정의무교육. 들은 교육만 체크하고 서명 → roster.extra[key] = "O" */
  function checkList(session) { return (session.meta && Array.isArray(session.meta.checks)) ? session.meta.checks : []; }
  function checksHtml(session, picked, editable) {
    var L = checkList(session); if (!L.length) return "";
    var m = session.meta || {}, n = L.filter(function (c) { return picked[c.key]; }).length;
    return '<div class="sw-card sw-chk">'
      + '<div class="sw-chk__h"><h3>' + esc(m.checkTitle || "들은 교육을 골라 주세요") + '</h3>'
      + (editable ? '<button type="button" class="sw-chk__all" id="chkAll">' + (n === L.length ? "모두 해제" : "다 들었어요 · 모두 체크") + '</button>' : "") + '</div>'
      + (m.checkHint ? '<p class="hint">' + esc(m.checkHint) + '</p>' : "")
      + '<ol class="sw-tl">' + L.map(function (c, i) {
          var on = !!picked[c.key];
          return '<li class="sw-tl__i' + (on ? " is-on" : "") + '"><button type="button" class="sw-tl__b" data-chk="' + esc(c.key) + '" aria-pressed="' + on + '"' + (editable ? "" : " disabled") + '>'
            + '<span class="sw-tl__dot">' + (on ? "✓" : (i + 1)) + '</span>'
            + '<span class="sw-tl__t"><b>' + esc(c.label) + '</b>'
            + (c.am || c.pm ? '<small>' + (c.am ? "오전 " + esc(c.am) : "") + (c.am && c.pm ? " · " : "") + (c.pm ? "오후 " + esc(c.pm) : "") + '</small>' : (c.when ? '<small>' + esc(c.when) + '</small>' : ""))
            + '</span><span class="sw-tl__box" aria-hidden="true"></span></button></li>';
        }).join("") + '</ol>'
      + '<p class="sw-chk__n" id="chkCount">' + n + ' / ' + L.length + '개 체크</p>'
      + '</div>';
  }
  function pickedFrom(session, row) {
    var x = (row && row.extra) || {}, o = {};
    checkList(session).forEach(function (c) { if (x[c.key] === "O") o[c.key] = true; });
    return o;
  }
  function extraWith(session, row, picked) {
    var next = Object.assign({}, (row && row.extra) || {});
    checkList(session).forEach(function (c) { if (picked[c.key]) next[c.key] = "O"; else delete next[c.key]; });
    return next;
  }
  // 체크 칸 그리기 + 누르기. onChange(picked) 는 바뀔 때마다
  function mountChecks(session, picked, editable, onChange) {
    var box = document.getElementById("chkArea"); if (!box) return;
    box.innerHTML = checksHtml(session, picked, editable);
    if (!editable) return;
    var L = checkList(session);
    box.querySelectorAll("[data-chk]").forEach(function (b) {
      b.addEventListener("click", function () { picked[b.dataset.chk] = !picked[b.dataset.chk]; if (!picked[b.dataset.chk]) delete picked[b.dataset.chk]; mountChecks(session, picked, editable, onChange); onChange && onChange(picked); });
    });
    var all = document.getElementById("chkAll");
    if (all) all.addEventListener("click", function () {
      var full = L.every(function (c) { return picked[c.key]; });
      L.forEach(function (c) { if (full) delete picked[c.key]; else picked[c.key] = true; });
      mountChecks(session, picked, editable, onChange); onChange && onChange(picked);
    });
  }

  function renderSignCard(session, row, name) {
    var consent = isConsent(session);
    var picked = pickedFrom(session, row), hasChecks = checkList(session).length > 0;
    document.getElementById("signArea").innerHTML = (hasChecks ? '<div id="chkArea"></div>' : "")
      + '<div class="sw-card">'
      + '<h3>' + (consent ? "동의하면 여기에 서명해주세요" : hasChecks ? "체크한 다음 여기에 서명해 주세요" : "여기에 서명해주세요") + '</h3><p class="hint">손가락으로 이름을 적어주세요</p>'
      + '<canvas class="sw-sigpad" id="sigPad"></canvas>'
      + '<div class="sw-sig-actions"><button type="button" id="sigClear">다시 쓰기</button></div>'
      + '</div>'
      + '<button class="sw-btn sw-btn--primary" id="sigSave">' + (consent ? "동의하고 서명 완료" : "서명 완료") + '</button>'
      + (consent ? '<button class="sw-btn sw-btn--no" id="noConsentBtn">동의하지 않아요</button>' : "");

    if (hasChecks) mountChecks(session, picked, !session.locked);
    var noBtn = document.getElementById("noConsentBtn");
    if (noBtn) noBtn.addEventListener("click", function () {
      if (!confirm("촬영·초상권 활용에 동의하지 않는 것으로 기록할까요?" + (row.signature ? " 지금 있는 서명은 지워져요." : ""))) return;
      noBtn.disabled = true;
      var next = Object.assign({}, row.extra || {}, { refusedAt: new Date().toISOString() });
      (row.signature ? Store.unsignRoster(row.id) : Promise.resolve())
        .then(function () { return Store.updateRosterExtra(row.id, next); })
        .then(function () { return Store.listAllRoster(); })
        .then(function (fresh) {
          allRoster = scopeRoster(fresh);
          toast("동의하지 않음으로 기록했어요");
          renderRefusedCard(session, rosterRowFor(session.id, name), name);
          var ask = document.querySelector(".sw-ask");
          if (ask) ask.scrollIntoView({ behavior: "smooth", block: "center" });
        })
        .catch(function () { noBtn.disabled = false; toast("기록하지 못했어요. 다시 눌러 주세요."); });
    });

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
      if (hasChecks && !checkList(session).some(function (c) { return picked[c.key]; })) {
        toast("들은 교육을 하나 이상 체크해 주세요");
        var ca = document.getElementById("chkArea"); if (ca) ca.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (!drawn) { toast("서명을 먼저 입력해주세요"); return; }
      var out = document.createElement("canvas");
      out.width = 300; out.height = 165;
      var octx = out.getContext("2d");
      octx.fillStyle = "#fff"; octx.fillRect(0, 0, out.width, out.height);
      octx.drawImage(canvas, 0, 0, out.width, out.height);
      var dataUrl = out.toDataURL("image/png");
      Store.signRoster(row.id, dataUrl).then(function () {
        if (hasChecks) return Store.updateRosterExtra(row.id, extraWith(session, row, picked)).catch(function () { toast("체크를 저장하지 못했어요. 서명 뒤 다시 눌러 주세요."); });
      }).then(function () {
        toast("서명이 저장되었습니다");
        if (row.extra && row.extra.refusedAt) {
          var next = Object.assign({}, row.extra); delete next.refusedAt;
          return Store.updateRosterExtra(row.id, next).catch(function () {});
        }
      }).then(function () {
        return Store.listAllRoster();
      }).then(function (fresh) {
        allRoster = scopeRoster(fresh);
        var updated = rosterRowFor(session.id, name);
        renderDoneCard(session, updated, name);
        var ask = document.querySelector(".sw-ask");
        if (ask) ask.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  }
})();
