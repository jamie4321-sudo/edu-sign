(function () {
  "use strict";

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmtDateTime(iso) { if (!iso) return ""; var d = new Date(iso); if (isNaN(d)) return iso; var p = function (n) { return ("0" + n).slice(-2); }; return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes()); }
  function toast(msg) {
    var el = document.createElement("div");
    el.className = "toast"; el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 2200);
  }

  var CATEGORIES = ["정기 교육", "산업안전보건교육", "장애인 인식개선교육", "성희롱 예방교육", "개인정보보호교육", "퇴직연금교육", "기타"];

  /* SNACK&GARDEN OPS의 크루 목록을 명단 등록 시 참고용으로 불러온다 (이름 · 부서만 사용) */
  var CREW_SOURCE_URL = "https://script.google.com/macros/s/AKfycbxNV7X2fDwkEB3yXnbrXfkm6y-0kChB0uLzMBUx2jKEfG61QcJXDVujQiSN8V4eOYHX/exec";
  var crewListCache = null;
  function fetchCrewList() {
    if (crewListCache) return crewListCache;
    crewListCache = fetch(CREW_SOURCE_URL + "?action=crew")
      .then(function (r) { return r.json(); })
      .then(function (list) {
        return (list || [])
          .filter(function (c) { return c.status === "재직"; })
          .map(function (c) { return { name: c.name, group: c.group || "", role: c.role || "" }; })
          .sort(function (a, b) { return (a.group || "").localeCompare(b.group || "", "ko") || a.name.localeCompare(b.name, "ko"); });
      })
      .catch(function () { crewListCache = null; return []; });
    return crewListCache;
  }

  /* ---------------- 테마 ---------------- */
  var themeBtn = document.getElementById("themeToggle");
  function applyTheme(t) {
    if (t === "light") document.documentElement.setAttribute("data-theme", "light");
    else document.documentElement.removeAttribute("data-theme");
    themeBtn.querySelector(".lbl").textContent = t === "light" ? "LIGHT" : "DARK";
  }
  applyTheme(localStorage.getItem("edusign-theme") || "dark");
  themeBtn.addEventListener("click", function () {
    var next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
    localStorage.setItem("edusign-theme", next);
    applyTheme(next);
  });

  /* ---------------- 드라이브 사진 폴더 링크 / 모드 표시 ---------------- */
  var driveNavLink = document.getElementById("driveNavLink");
  var modeLabel = document.getElementById("modeLabel");
  if (modeLabel) modeLabel.textContent = Store.isLive() ? "LIVE · 구글시트 연동" : "DEMO · 목업 데이터";
  if (driveNavLink) {
    if (!Store.isLive()) {
      driveNavLink.classList.add("nav__item--disabled");
      driveNavLink.title = "구글시트 연동(라이브 모드) 후 사용할 수 있습니다";
      driveNavLink.addEventListener("click", function (e) { e.preventDefault(); });
    } else {
      Store.getRootFolderUrl().then(function (url) { if (url) driveNavLink.href = url; });
    }
  }

  function setCrumb(text) { var el = document.getElementById("viewTitle"); if (el) el.textContent = text; }

  /* ---------------- 잠금화면 ---------------- */
  (function () {
    var dots = document.getElementById("lockDots");
    var input = document.getElementById("lockInput");
    var error = document.getElementById("lockError");
    if (localStorage.getItem("edusign-auth") === "ok") document.documentElement.setAttribute("data-authed", "1");
    if (document.documentElement.getAttribute("data-authed") === "1") return;

    function render(val) {
      dots.querySelectorAll(".lock__dot").forEach(function (d, i) { d.classList.toggle("is-filled", i < val.length); });
    }
    input.addEventListener("input", function () {
      var v = input.value.replace(/\D/g, "").slice(0, 4);
      input.value = v;
      render(v);
      error.hidden = true;
      if (v.length === 4) {
        if (v === (window.CONFIG.pin || "")) {
          localStorage.setItem("edusign-auth", "ok");
          document.documentElement.setAttribute("data-authed", "1");
        } else {
          error.hidden = false;
          dots.classList.add("is-shake");
          setTimeout(function () { dots.classList.remove("is-shake"); input.value = ""; render(""); }, 400);
        }
      }
    });
    setTimeout(function () { input.focus(); }, 50);
    dots.addEventListener("click", function () { input.focus(); });
  })();

  /* ---------------- 라우팅 ---------------- */
  var view = document.getElementById("view");
  function route() {
    var hash = location.hash.replace(/^#\/?/, "");
    var m = hash.match(/^s\/(.+)$/);
    if (m) renderDetail(m[1]); else renderList();
  }
  window.addEventListener("hashchange", route);

  /* ---------------- 목록 화면 ---------------- */
  function renderList() {
    setCrumb("SESSIONS");
    view.innerHTML = '<div class="wrap"><div class="page-head">'
      + '<div><p class="eyebrow">EDU SIGN</p><h2>교육 서명 세션</h2><p class="sub">교육 회차를 만들고 서명 링크를 공유하세요.</p></div>'
      + '<button class="btn btn--primary" id="newSessionBtn">+ 새 교육 세션</button>'
      + '</div><div id="sessionGrid" class="session-grid"><div class="empty">불러오는 중…</div></div></div>';

    document.getElementById("newSessionBtn").addEventListener("click", function () { openSessionModal(); });

    Store.listSessions().then(function (sessions) {
      var grid = document.getElementById("sessionGrid");
      if (!sessions.length) {
        grid.innerHTML = '<div class="empty" style="grid-column:1/-1">아직 등록된 교육 세션이 없습니다.<br><b>+ 새 교육 세션</b>으로 첫 세션을 만들어보세요.</div>';
        return;
      }
      grid.innerHTML = sessions.map(function (s) {
        var pct = s.total ? Math.round((s.signed / s.total) * 100) : 0;
        var badge = s.locked ? '<span class="badge badge--done">마감</span>' : '<span class="badge badge--live">진행중</span>';
        return '<a class="session-card" href="#/s/' + esc(s.id) + '">'
          + '<div class="session-card__top"><span class="session-card__date mono">' + esc(s.date || "") + '</span>' + badge + '</div>'
          + '<div><div class="session-card__title">' + esc(s.title || s.category || "제목 없음") + '</div>'
          + '<div class="session-card__cat">' + esc(s.category || "") + '</div></div>'
          + '<div class="session-card__progress"><div class="progress-bar"><div class="progress-bar__fill" style="width:' + pct + '%"></div></div>'
          + '<span class="session-card__count mono">' + s.signed + '/' + s.total + '명</span></div>'
          + (s.driveFolderUrl ? '<span class="session-card__drive" data-drive="' + esc(s.driveFolderUrl) + '">드라이브 링크</span>' : "")
          + '</a>';
      }).join("");
      grid.querySelectorAll(".session-card__drive").forEach(function (el) {
        el.addEventListener("click", function (e) {
          e.preventDefault(); e.stopPropagation();
          window.open(el.dataset.drive, "_blank", "noopener");
        });
      });
    });
  }

  /* ---------------- 상세 화면 ---------------- */
  /* sign.html은 이제 이름 로그인 → 교육 선택 → 서명 흐름의 공용 페이지라
     세션마다 다른 링크가 필요 없음 — 크루는 이 링크 하나만 북마크해두면 됨 */
  function signUrl() {
    return location.origin + location.pathname.replace(/index\.html$/, "").replace(/\/$/, "") + "/sign.html";
  }

  function renderDetail(id) {
    setCrumb("SESSION DETAIL");
    view.innerHTML = '<div class="wrap"><div class="empty">불러오는 중…</div></div>';
    Store.getSession(id).then(function (d) {
      if (!d || !d.session) { view.innerHTML = '<div class="wrap"><div class="empty">세션을 찾을 수 없습니다. <a href="#/">목록으로</a></div></div>'; return; }
      var s = d.session, roster = d.roster || [];
      var signed = roster.filter(function (r) { return !!r.signature; }).length;
      var url = signUrl();

      view.innerHTML = '<div class="wrap">'
        + '<div class="detail-head"><a class="back-link" href="#/">← 세션 목록</a></div>'
        + '<div class="page-head">'
        + '<div><p class="eyebrow">' + esc(s.date || "") + ' · ' + (s.locked ? "마감" : "진행중") + '</p>'
        + '<h2>' + esc(s.title || s.category || "제목 없음") + '</h2>'
        + '<p class="sub">' + esc(s.category || "") + '</p></div>'
        + '<div class="row-actions" style="gap:8px">'
        + '<button class="btn btn--sm" id="editSessionBtn">세션 수정</button>'
        + '<button class="btn btn--sm" id="toggleLockBtn">' + (s.locked ? "마감 해제" : "서명 마감") + '</button>'
        + '<button class="btn btn--sm btn--primary" id="printBtn">출력(PDF)</button>'
        + '</div></div>'

        + '<div class="stat-row">'
        + '<div class="stat"><div class="stat__label">전체 인원</div><div class="stat__value">' + roster.length + '</div></div>'
        + '<div class="stat"><div class="stat__label">서명 완료</div><div class="stat__value accent">' + signed + '</div></div>'
        + '<div class="stat"><div class="stat__label">미서명</div><div class="stat__value">' + (roster.length - signed) + '</div></div>'
        + '</div>'

        + '<div class="share-box">'
          + '<div style="flex:1;min-width:200px"><p class="hint" style="margin:0 0 6px">크루용 서명 페이지 (모든 세션 공용 — 한 번만 공유하면 계속 사용)</p>'
          + '<input type="text" readonly value="' + esc(url) + '" id="shareUrlInput" /></div>'
          + '<button class="btn btn--sm" id="copyLinkBtn">링크 복사</button>'
          + '<img class="qr-box" width="72" height="72" alt="QR" src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=' + encodeURIComponent(url) + '" />'
          + '</div>'

        + '<div class="board"><div class="board__head">'
        + '<h3 class="board__title">참석자 명단 <span class="chip-mono">' + roster.length + '명</span></h3>'
        + (s.locked ? "" : '<button class="btn btn--sm btn--primary" id="addRosterBtn">+ 명단 등록</button>')
        + '</div>'
        + '<div class="board__scroll"><table class="board__table"><thead><tr>'
        + '<th>연번</th><th>부서</th><th>성명</th><th>서명</th><th>서명시각</th>' + (s.locked ? "" : '<th></th>')
        + '</tr></thead><tbody>'
        + (roster.length ? roster.map(function (r, i) { return rosterRow(s.locked, r, i + 1); }).join("")
            : '<tr><td colspan="6" class="board__empty">등록된 명단이 없습니다. <b>+ 명단 등록</b>으로 참석 예정자를 추가하세요.</td></tr>')
        + '</tbody></table></div></div>'

        + '<div class="board" style="margin-top:16px">'
        + '<div class="board__head"><h3 class="board__title">교육 사진</h3>'
        + '<div style="display:flex;gap:8px">'
        + (s.driveFolderUrl ? '<a class="btn btn--sm" href="' + esc(s.driveFolderUrl) + '" target="_blank" rel="noopener">Drive에서 열기</a>' : "")
        + '<label class="btn btn--sm btn--primary" style="cursor:pointer">+ 사진 업로드<input type="file" accept="image/*" id="photoInput" multiple hidden></label>'
        + '</div></div>'
        + '<div id="photoGrid" style="padding:18px;display:flex;flex-wrap:wrap;gap:12px">불러오는 중…</div>'
        + '</div>'
        + '</div>';

      document.getElementById("editSessionBtn").addEventListener("click", function () { openSessionModal(s); });
      document.getElementById("printBtn").addEventListener("click", function () { window.open("print.html?id=" + encodeURIComponent(s.id), "_blank"); });
      document.getElementById("toggleLockBtn").addEventListener("click", function () {
        Store.setLocked(s.id, !s.locked).then(function () { toast(s.locked ? "서명을 다시 열었습니다" : "서명을 마감했습니다"); renderDetail(id); });
      });
      var copyBtn = document.getElementById("copyLinkBtn");
      if (copyBtn) copyBtn.addEventListener("click", function () {
        var input = document.getElementById("shareUrlInput");
        input.select();
        navigator.clipboard && navigator.clipboard.writeText(input.value).then(function () { toast("링크를 복사했습니다"); }).catch(function () { document.execCommand("copy"); toast("링크를 복사했습니다"); });
      });
      var addBtn = document.getElementById("addRosterBtn");
      if (addBtn) addBtn.addEventListener("click", function () { openRosterModal(s.id, roster); });

      view.querySelectorAll("[data-edit-roster]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var r = roster.find(function (x) { return x.id === btn.dataset.editRoster; });
          openRosterEditModal(r);
        });
      });
      view.querySelectorAll("[data-del-roster]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (!confirm("이 명단을 삭제할까요? 서명 기록도 함께 삭제됩니다.")) return;
          Store.deleteRoster(btn.dataset.delRoster).then(function () { renderDetail(id); });
        });
      });

      document.getElementById("photoInput").addEventListener("change", function (e) {
        var files = Array.prototype.slice.call(e.target.files || []);
        if (!files.length) return;
        Promise.all(files.map(function (file) {
          return new Promise(function (resolve) {
            var reader = new FileReader();
            reader.onload = function () { resolve(Store.uploadPhoto(s.id, reader.result, file.name)); };
            reader.readAsDataURL(file);
          });
        })).then(function () { toast("사진을 업로드했습니다"); renderPhotoGrid(s.id); });
      });
      renderPhotoGrid(s.id);
    });
  }

  function renderPhotoGrid(sessionId) {
    var grid = document.getElementById("photoGrid");
    if (!grid) return;
    Store.listPhotos(sessionId).then(function (photos) {
      if (!photos.length) { grid.innerHTML = '<span class="hint">아직 업로드된 사진이 없습니다.</span>'; return; }
      grid.innerHTML = photos.map(function (p) {
        return '<div style="position:relative">'
          + '<img src="' + esc(p.url) + '" alt="교육 사진" style="width:110px;height:110px;object-fit:cover;border-radius:10px;border:1px solid var(--line)" />'
          + '<button class="icon-btn" data-del-photo="' + esc(p.id) + '" style="position:absolute;top:4px;right:4px;background:var(--panel)">×</button>'
          + '</div>';
      }).join("");
      grid.querySelectorAll("[data-del-photo]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (!confirm("이 사진을 삭제할까요?")) return;
          Store.deletePhoto(btn.dataset.delPhoto).then(function () { renderPhotoGrid(sessionId); });
        });
      });
    });
  }

  function rosterRow(locked, r, displayNo) {
    var sig = r.signature
      ? '<img class="sig-thumb" src="' + r.signature + '" alt="서명" />'
      : '<span class="sig-empty">미서명</span>';
    return '<tr>'
      + '<td class="seq-cell mono">' + esc(displayNo) + '</td>'
      + '<td>' + esc(r.dept) + '</td>'
      + '<td><b>' + esc(r.name) + '</b></td>'
      + '<td>' + sig + '</td>'
      + '<td class="mono" style="color:var(--ink-3);font-size:12px">' + fmtDateTime(r.signedAt) + '</td>'
      + (locked ? "" : '<td><div class="row-actions">'
          + '<button class="icon-btn" data-edit-roster="' + esc(r.id) + '" title="수정">✎</button>'
          + '<button class="icon-btn" data-del-roster="' + esc(r.id) + '" title="삭제">×</button>'
          + '</div></td>')
      + '</tr>';
  }

  /* ---------------- 세션 생성/수정 모달 ---------------- */
  function openSessionModal(existing) {
    var editing = !!(existing && existing.id);
    var wrap = document.createElement("div");
    wrap.className = "modal";
    wrap.innerHTML = '<div class="modal__backdrop" data-close></div>'
      + '<div class="modal__card" role="dialog" aria-modal="true">'
      + '<div class="modal__head"><h3>' + (editing ? "교육 세션 수정" : "새 교육 세션") + '</h3><button class="modal__x" data-close>×</button></div>'
      + '<form>'
      + '<label class="fld"><span>교육일자 <em>*</em></span><input type="date" name="date" required value="' + (existing ? esc(existing.date) : "") + '"></label>'
      + '<label class="fld"><span>교육구분 <em>*</em></span><input type="text" name="category" list="categoryOptions" required autocomplete="off" placeholder="목록에서 선택하거나 새로 입력하세요" value="' + (existing ? esc(existing.category) : "정기 교육") + '">'
      + '<datalist id="categoryOptions">' + CATEGORIES.map(function (c) { return '<option value="' + esc(c) + '">'; }).join("") + '</datalist>'
      + '</label>'
      + '<label class="fld"><span>세션 제목 <em>(선택)</em></span><input type="text" name="title" maxlength="60" placeholder="예) 7월 정기 안전교육" value="' + (existing ? esc(existing.title) : "") + '"></label>'
      + '<div class="modal__foot"><div class="modal__spacer"></div><button type="button" class="btn" data-close>취소</button><button type="submit" class="btn btn--primary">저장</button></div>'
      + '</form></div>';
    document.body.appendChild(wrap);
    wrap.querySelectorAll("[data-close]").forEach(function (el) { el.addEventListener("click", function () { wrap.remove(); }); });

    Store.listSessions().then(function (sessions) {
      var datalist = wrap.querySelector("#categoryOptions");
      var known = {};
      CATEGORIES.forEach(function (c) { known[c] = true; });
      sessions.forEach(function (s) {
        if (s.category && !known[s.category]) { known[s.category] = true; datalist.insertAdjacentHTML("beforeend", '<option value="' + esc(s.category) + '">'); }
      });
    });

    wrap.querySelector("form").addEventListener("submit", function (e) {
      e.preventDefault();
      var f = e.target;
      var obj = { date: f.date.value, category: f.category.value.trim(), title: f.title.value.trim() };
      if (editing) obj.id = existing.id;
      Store.saveSession(obj).then(function (res) {
        wrap.remove();
        toast(editing ? "세션을 수정했습니다" : "새 세션을 만들었습니다");
        location.hash = "#/s/" + (editing ? existing.id : res.id);
        if (editing) route();
      });
    });
  }

  /* ---------------- 명단 일괄 등록 모달 ---------------- */
  function openRosterModal(sessionId, existingRoster) {
    var existingNames = {};
    (existingRoster || []).forEach(function (r) { existingNames[r.name] = true; });

    var wrap = document.createElement("div");
    wrap.className = "modal";
    wrap.innerHTML = '<div class="modal__backdrop" data-close></div>'
      + '<div class="modal__card modal__card--wide" role="dialog" aria-modal="true">'
      + '<div class="modal__head"><h3>명단 등록</h3><button class="modal__x" data-close>×</button></div>'
      + '<div class="roster-src-tabs">'
        + '<button type="button" class="roster-src-tab is-on" data-src="org">크루 목록에서 선택</button>'
        + '<button type="button" class="roster-src-tab" data-src="paste">직접 붙여넣기</button>'
      + '</div>'
      + '<div id="rosterSrcOrg"></div>'
      + '<form id="rosterPasteForm" hidden style="padding:16px 20px 0">'
        + '<label class="fld"><span>부서, 성명을 한 줄에 한 명씩 붙여넣으세요</span>'
        + '<textarea name="paste" class="roster-paste" placeholder="스낵, 정배라&#10;가든, 한카렌&#10;스낵, 오미라" required></textarea></label>'
        + '<p class="hint">쉼표(,) 또는 탭(엑셀에서 복사)으로 부서와 이름을 구분합니다. 부서 없이 이름만 입력해도 됩니다.</p>'
        + '<div class="modal__foot"><div class="modal__spacer"></div><button type="button" class="btn" data-close>취소</button><button type="submit" class="btn btn--primary">등록</button></div>'
      + '</form>'
      + '</div>';
    document.body.appendChild(wrap);
    wrap.querySelectorAll("[data-close]").forEach(function (el) { el.addEventListener("click", function () { wrap.remove(); }); });

    var orgBox = wrap.querySelector("#rosterSrcOrg");
    var pasteForm = wrap.querySelector("#rosterPasteForm");

    wrap.querySelectorAll(".roster-src-tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        wrap.querySelectorAll(".roster-src-tab").forEach(function (t) { t.classList.toggle("is-on", t === tab); });
        var isOrg = tab.dataset.src === "org";
        orgBox.hidden = !isOrg;
        pasteForm.hidden = isOrg;
      });
    });

    pasteForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var lines = e.target.paste.value.split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
      var rows = lines.map(function (line) {
        var parts = line.indexOf("\t") > -1 ? line.split("\t") : line.split(",");
        parts = parts.map(function (p) { return p.trim(); });
        if (parts.length >= 2) return { dept: parts[0], name: parts[1] };
        return { dept: "", name: parts[0] };
      }).filter(function (r) { return r.name; });
      if (!rows.length) return;
      Store.bulkAddRoster(sessionId, rows).then(function () {
        wrap.remove();
        toast(rows.length + "명을 추가했습니다");
        renderDetail(sessionId);
      });
    });

    orgBox.innerHTML = '<div class="org-empty">크루 목록을 불러오는 중…</div>';
    fetchCrewList().then(function (crew) {
      if (!crew.length) {
        orgBox.innerHTML = '<div class="org-empty">SNACK&amp;GARDEN OPS에서 크루 목록을 불러오지 못했습니다.<br>네트워크 상태를 확인하거나 "직접 붙여넣기"를 이용해주세요.</div>';
        return;
      }
      renderOrgPicker(orgBox, crew, existingNames, sessionId, wrap);
    });
  }

  function renderOrgPicker(orgBox, crew, existingNames, sessionId, wrap) {
    var query = "";

    function groups(list) {
      var order = [], map = {};
      list.forEach(function (c) {
        var g = c.group || "미지정";
        if (!map[g]) { map[g] = []; order.push(g); }
        map[g].push(c);
      });
      return order.map(function (g) { return { name: g, members: map[g] }; });
    }

    function render() {
      var q = query.trim().toLowerCase();
      var filtered = q ? crew.filter(function (c) { return c.name.toLowerCase().indexOf(q) > -1; }) : crew;
      var gs = groups(filtered);

      orgBox.innerHTML = '<div class="org-search"><input type="search" id="orgSearch" placeholder="이름 검색" value="' + esc(query) + '"></div>'
        + '<div class="org-toolbar"><span id="orgSelCount">0명 선택</span><button type="button" id="orgSelectAll">보이는 전체 선택</button></div>'
        + '<div class="org-list">'
        + (gs.length ? gs.map(function (g) {
            return '<div class="org-group"><div class="org-group__head"><span class="dot"></span>' + esc(g.name) + ' · ' + g.members.length + '명</div>'
              + g.members.map(function (c) {
                  var added = !!existingNames[c.name];
                  return '<label class="org-row' + (added ? " is-added" : "") + '">'
                    + '<input type="checkbox" value="' + esc(c.name) + '" data-group="' + esc(c.group) + '"' + (added ? " disabled" : "") + '>'
                    + '<span class="org-row__name">' + esc(c.name) + '</span>'
                    + '<span class="org-row__role">' + (added ? "이미 등록됨" : esc(c.role || "")) + '</span>'
                    + '</label>';
                }).join("")
              + '</div>';
          }).join("") : '<div class="org-empty">검색 결과가 없습니다.</div>')
        + '</div>'
        + '<div class="modal__foot"><div class="modal__spacer"></div><button type="button" class="btn" data-close>취소</button><button type="button" class="btn btn--primary" id="orgSubmit" disabled>선택 등록</button></div>';

      var searchInput = orgBox.querySelector("#orgSearch");
      searchInput.addEventListener("input", function () { query = searchInput.value; render(); searchInput.focus(); if (searchInput.value) searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length); });

      var boxes = Array.prototype.slice.call(orgBox.querySelectorAll('input[type="checkbox"]:not([disabled])'));
      var submitBtn = orgBox.querySelector("#orgSubmit");
      var countEl = orgBox.querySelector("#orgSelCount");
      function syncCount() {
        var n = boxes.filter(function (b) { return b.checked; }).length;
        countEl.textContent = n + "명 선택";
        submitBtn.disabled = !n;
      }
      boxes.forEach(function (b) { b.addEventListener("change", syncCount); });
      orgBox.querySelector("#orgSelectAll").addEventListener("click", function () {
        var allOn = boxes.length && boxes.every(function (b) { return b.checked; });
        boxes.forEach(function (b) { b.checked = !allOn; });
        syncCount();
      });
      orgBox.querySelectorAll("[data-close]").forEach(function (el) { el.addEventListener("click", function () { wrap.remove(); }); });
      submitBtn.addEventListener("click", function () {
        var rows = boxes.filter(function (b) { return b.checked; }).map(function (b) { return { dept: b.dataset.group, name: b.value }; });
        if (!rows.length) return;
        Store.bulkAddRoster(sessionId, rows).then(function () {
          wrap.remove();
          toast(rows.length + "명을 추가했습니다");
          renderDetail(sessionId);
        });
      });
    }

    render();
  }

  function openRosterEditModal(r) {
    var wrap = document.createElement("div");
    wrap.className = "modal";
    wrap.innerHTML = '<div class="modal__backdrop" data-close></div>'
      + '<div class="modal__card" role="dialog" aria-modal="true">'
      + '<div class="modal__head"><h3>명단 수정</h3><button class="modal__x" data-close>×</button></div>'
      + '<form>'
      + '<div class="fld-row">'
      + '<label class="fld"><span>부서</span><input type="text" name="dept" value="' + esc(r.dept) + '"></label>'
      + '<label class="fld"><span>성명 <em>*</em></span><input type="text" name="name" required value="' + esc(r.name) + '"></label>'
      + '</div>'
      + (r.signature ? '<p class="hint">이미 서명이 등록되어 있습니다. 정보만 수정되고 서명은 유지됩니다.</p>' : "")
      + '<div class="modal__foot"><div class="modal__spacer"></div><button type="button" class="btn" data-close>취소</button><button type="submit" class="btn btn--primary">저장</button></div>'
      + '</form></div>';
    document.body.appendChild(wrap);
    wrap.querySelectorAll("[data-close]").forEach(function (el) { el.addEventListener("click", function () { wrap.remove(); }); });
    wrap.querySelector("form").addEventListener("submit", function (e) {
      e.preventDefault();
      var f = e.target;
      Store.updateRoster({ id: r.id, dept: f.dept.value.trim(), name: f.name.value.trim() }).then(function () {
        wrap.remove();
        toast("수정했습니다");
        route();
      });
    });
  }

  route();

  /* ---------------- 외부(SNACK&GARDEN OPS)에서 넘어온 교육 정보 자동 채움 ----------------
     ?date=&category=&title= 쿼리로 들어오면 "새 교육 세션" 모달을 그 값으로 미리 채워서 연다.
     PIN 잠금이 아직 안 풀렸을 수 있어 잠금 해제될 때까지 잠깐 기다린다. */
  (function () {
    var qs = new URLSearchParams(location.search);
    var prefill = { date: qs.get("date") || "", category: qs.get("category") || "", title: qs.get("title") || "" };
    if (!prefill.date && !prefill.category && !prefill.title) return;

    history.replaceState(null, "", location.pathname + location.hash);

    var tries = 0;
    (function waitAuth() {
      if (document.documentElement.getAttribute("data-authed") !== "1") {
        if (tries++ > 200) return; // 60초 넘게 잠금 화면에 머물면 포기
        setTimeout(waitAuth, 300);
        return;
      }
      openSessionModal(prefill);
    })();
  })();
})();
