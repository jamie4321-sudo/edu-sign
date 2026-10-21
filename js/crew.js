/* =========================================================
   EDU — 크루 이름 로그인 (교육 자료 보기 · library.html)
   · 교육 서명(sign.html)과 같은 방식: 명단에 있는 내 이름을 골라 들어온다 (자동 로그인 없음)
   · 같은 저장 열쇠(edusign-login-name)를 써서 서명 페이지와 로그인이 이어진다
   · 비밀번호는 없다 (장애 크루도 부담 없이) — 누가 봤는지 구분하기 위한 로그인
   ========================================================= */
(function () {
  "use strict";
  var KEY = "edusign-login-name";
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function get() { try { return localStorage.getItem(KEY) || ""; } catch (e) { return ""; } }
  function set(v) { try { if (v) localStorage.setItem(KEY, v); else localStorage.removeItem(KEY); } catch (e) {} }

  // 이름 목록 = OPS 재직 명단(Supabase edu_crews). 표가 없거나 비었으면 교육 서명 명단으로
  function names() {
    return Store.listCrews().then(function (rows) {
      var on = (rows || []).filter(function (c) { return c.status === "재직"; });
      if (!on.length) throw new Error("재직 명단 없음");
      return on.map(function (c) { return { name: c.name, dept: c.group || "" }; })
        .sort(function (a, b) { return a.name.localeCompare(b.name, "ko"); });
    }).catch(function () { return rosterNames(); });
  }
  function rosterNames() {
    return Store.listCrewNames().then(function (rows) {
      var seen = {}, out = [];
      rows.forEach(function (r) { if (r.name && !seen[r.name]) { seen[r.name] = 1; out.push({ name: r.name, dept: r.dept || "" }); } });
      return out.sort(function (a, b) { return a.name.localeCompare(b.name, "ko"); });
    });
  }

  function pickSheet(list, selected, onPick) {
    var w = document.createElement("div"); w.className = "cl-sheet";
    w.innerHTML = '<div class="cl-sheet__bg"></div><div class="cl-sheet__panel" role="dialog" aria-label="이름 고르기"><div class="cl-sheet__grip"></div>'
      + '<div class="cl-sheet__head"><b>내 이름을 골라요</b><button type="button" class="cl-sheet__x">닫기</button></div>'
      + '<div class="cl-sheet__search"><input type="search" placeholder="이름 찾기" aria-label="이름 찾기" autocomplete="off"></div>'
      + '<div class="cl-sheet__list"></div></div>';
    document.body.appendChild(w);
    var listEl = w.querySelector(".cl-sheet__list"), q = w.querySelector("input");
    var paint = function () {
      var t = q.value.trim(), shown = list.filter(function (n) { return !t || n.name.indexOf(t) > -1; });
      listEl.innerHTML = shown.length ? shown.map(function (n) {
        return '<button type="button" class="cl-row' + (n.name === selected ? " is-on" : "") + '" data-n="' + esc(n.name) + '">' + esc(n.name) + (n.dept ? ' <span>' + esc(n.dept) + '</span>' : "") + '</button>';
      }).join("") : '<p class="cl-empty">찾는 이름이 없어요</p>';
      listEl.querySelectorAll("[data-n]").forEach(function (b) { b.onclick = function () { onPick(b.dataset.n); w.remove(); }; });
    };
    q.oninput = paint; paint();
    w.querySelector(".cl-sheet__bg").onclick = w.querySelector(".cl-sheet__x").onclick = function () { w.remove(); };
  }

  // 로그인 화면 → 이름이 정해지면 onIn(name)
  function gate(root, title, onIn) {
    root.innerHTML = '<div class="cl"><p class="cl-wait">불러오는 중…</p></div>';
    names().then(function (list) {
      var deptOf = function (nm) { var x = list.filter(function (n) { return n.name === nm; })[0]; return x ? x.dept : ""; };
      // 저장된 이름으로 자동 로그인하지 않음 — 같은 기기를 여러 크루가 쓰므로 항상 이름 고르기부터 (서명 페이지와 같음)
      var sel = "";
      root.innerHTML = '<div class="cl"><div class="cl-card">'
        + '<div class="cl-brand">SNACK<em>&amp;</em>GARDEN EDU</div>'
        + '<h1>' + esc(title) + '</h1><p class="cl-sub">내 이름으로 들어와요</p>'
        + '<button type="button" class="cl-pick is-empty" id="clPick">이름 고르기</button>'
        + '<button type="button" class="cl-go" id="clGo" disabled>들어가기</button>'
        + '<p class="cl-note">내 이름이 없으면 매니저에게 알려 주세요.</p></div></div>';
      var pick = document.getElementById("clPick"), go = document.getElementById("clGo");
      pick.onclick = function () { pickSheet(list, sel, function (n) { sel = n; pick.textContent = n; pick.classList.remove("is-empty"); go.disabled = false; go.focus(); }); };
      go.onclick = function () { if (!sel) return; set(sel); onIn(sel, deptOf(sel)); };
    }).catch(function (e) {
      console.warn(e);
      root.innerHTML = '<div class="cl"><div class="cl-card"><h1>불러오지 못했어요</h1><p class="cl-sub">인터넷 연결을 확인하고 새로고침해 주세요.</p></div></div>';
    });
  }

  window.EduCrew = { gate: gate, name: get, logout: function () { set(""); location.reload(); } };
})();
