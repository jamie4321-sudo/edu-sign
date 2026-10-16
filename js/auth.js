/* =========================================================
   EDU — 관리자 로그인(아이디 + 비밀번호) · 권한 · 계정 관리
   · 비밀번호 확인은 Supabase 서버 함수(supabase/accounts.sql)에서만 한다. 브라우저는 토큰만 가진다.
   · accounts.sql 을 아직 실행하지 않았으면 예전 4자리 PIN 잠금으로 돌아간다(잠기지 않게).
   · 권한: master 총괄 관리자 · admin 관리자 · editor 자료 담당 · viewer 보기만
   ========================================================= */
(function () {
  "use strict";
  var ROLES = {
    master: { label: "총괄 관리자", desc: "모든 기능 + 계정 · 권한 관리" },
    admin:  { label: "관리자",     desc: "교육 서명 관리 + 맡은 파트의 교육 자료 만들기 · 수정" },
    editor: { label: "자료 담당",   desc: "맡은 파트의 교육 자료만 만들기 · 수정 (서명은 보기만)" },
    viewer: { label: "보기만",     desc: "모든 화면을 볼 수만 있어요" }
  };
  var PARTS = [["snack", "스낵큐레이션"], ["garden", "가든"], ["support", "총무지원"]];
  var K_TOKEN = "edu-token", K_USER = "edu-user";

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function toast(msg) { var el = document.createElement("div"); el.className = "toast"; el.textContent = msg; document.body.appendChild(el); setTimeout(function () { el.remove(); }, 2400); }
  var _sb = null;
  function sb() { if (!_sb) _sb = window.supabase.createClient(window.CONFIG.supabase.url, window.CONFIG.supabase.anonKey, { auth: { persistSession: false } }); return _sb; }
  function hasSupa() { return !!(window.CONFIG && window.CONFIG.supabase && window.CONFIG.supabase.url && window.supabase && !/[?&]demo=1(&|$)/.test(location.search)); }
  function rpc(fn, args) {
    return sb().rpc(fn, args).then(function (r) { if (r.error) throw r.error; return r.data; });
  }
  function missingFn(e) { return !!e && (e.code === "PGRST202" || /Could not find the function/i.test(e.message || "")); }
  function errMsg(e) { var m = (e && (e.message || e.details)) || ""; return /권한|아이디|비밀번호|계정|값 오류/.test(m) ? m : "저장하지 못했어요. 인터넷 연결을 확인해 주세요."; }

  /* ---------------- 상태 ---------------- */
  var Auth = {
    mode: "account",        // account | pin (accounts.sql 실행 전)
    user: null,
    token: function () { return ls(K_TOKEN) || ""; },
    can: function (what) {
      var u = this.user; if (!u) return false;
      if (u.role === "master") return true;
      if (what === "sign" || what === "delete") return u.role === "admin";
      if (what === "accounts") return false;
      var m = /^material:(\w+)$/.exec(what);
      if (m) return (u.role === "admin" || u.role === "editor") && (u.parts || []).indexOf(m[1]) > -1;
      return false;
    },
    roleLabel: function (r) { return (ROLES[r] || {}).label || r; },
    logout: function () {
      var t = this.token();
      if (t && hasSupa() && this.mode === "account") rpc("edu_logout", { p_token: t }).catch(function () {});
      ls(K_TOKEN, null); ls(K_USER, null); ls("edusign-auth", null); ls("edusign-admin", null);
      location.reload();
    }
  };
  window.Auth = Auth;

  function setUser(u) {
    Auth.user = u;
    var html = document.documentElement;
    if (u) {
      ls(K_USER, JSON.stringify(u));
      html.setAttribute("data-authed", "1");
      html.setAttribute("data-role", u.role);
      ["sign", "accounts"].forEach(function (p) { if (Auth.can(p)) html.setAttribute("data-can-" + p, "1"); else html.removeAttribute("data-can-" + p); });
    } else {
      ls(K_USER, null);
      ["data-authed", "data-role", "data-can-sign", "data-can-accounts"].forEach(function (a) { html.removeAttribute(a); });
    }
    paintBadge();
    document.dispatchEvent(new CustomEvent("edu-auth", { detail: u }));
  }

  /* 사이드바 아래: 이름 · 권한 · 비밀번호 변경 · 로그아웃 */
  function paintBadge() {
    var foot = document.querySelector(".side__foot"); if (!foot) return;
    var box = document.getElementById("whoBox");
    if (!box) { box = document.createElement("div"); box.id = "whoBox"; box.className = "who"; foot.appendChild(box); }
    var u = Auth.user;
    if (!u) { box.innerHTML = ""; return; }
    box.innerHTML = '<span class="who__n"><b>' + esc(u.name || u.id) + '</b> · ' + esc(Auth.roleLabel(u.role)) + '</span>'
      + (Auth.mode === "account" ? '<button type="button" class="admin-logout" id="myPwBtn">비밀번호 변경</button>' : "")
      + '<button type="button" class="admin-logout" id="logoutBtn">로그아웃</button>';
    document.getElementById("logoutBtn").onclick = function () { if (confirm("로그아웃할까요?")) Auth.logout(); };
    var pw = document.getElementById("myPwBtn"); if (pw) pw.onclick = openMyPw;
  }

  /* ---------------- 로그인 화면 ---------------- */
  function showLogin(msg) {
    var card = document.querySelector("#lockScreen .lock__card");
    card.innerHTML = '<div class="lock__brand">SNACK<em>&amp;</em>GARDEN EDU</div>'
      + '<form class="login" id="loginForm" autocomplete="on">'
      + '<label class="fld"><span>아이디</span><input name="id" autocomplete="username" autocapitalize="off" spellcheck="false" required></label>'
      + '<label class="fld"><span>비밀번호</span><input name="pw" type="password" autocomplete="current-password" required></label>'
      + '<p class="lock__error" id="loginErr"' + (msg ? "" : " hidden") + '>' + esc(msg || "") + '</p>'
      + '<button class="btn btn--primary btn--lg" type="submit">로그인</button>'
      + '<p class="hint" style="margin:0;text-align:center">계정은 총괄 관리자가 만들어 드려요.</p></form>';
    var f = document.getElementById("loginForm");
    f.id.focus();
    f.onsubmit = function (e) {
      e.preventDefault();
      var btn = f.querySelector("button"), err = document.getElementById("loginErr");
      btn.disabled = true; btn.textContent = "확인 중…"; err.hidden = true;
      rpc("edu_login", { p_id: f.id.value, p_pw: f.pw.value }).then(function (r) {
        if (!r) { err.textContent = "아이디 또는 비밀번호가 맞지 않아요"; err.hidden = false; btn.disabled = false; btn.textContent = "로그인"; f.pw.select(); return; }
        ls(K_TOKEN, r.token); setUser(r.user);
      }).catch(function (e) {
        console.warn(e); err.textContent = "로그인하지 못했어요. 인터넷 연결을 확인해 주세요."; err.hidden = false; btn.disabled = false; btn.textContent = "로그인";
      });
    };
  }

  /* accounts.sql 실행 전: 예전 PIN 잠금 (config.js admins) */
  function showPin() {
    Auth.mode = "pin";
    var list = ((window.CONFIG && window.CONFIG.admins) || []).filter(function (x) { return x && x.pin; });
    if (!list.length && window.CONFIG && window.CONFIG.pin) list = [{ name: "관리자", pin: String(window.CONFIG.pin) }];
    if (ls("edusign-auth") === "ok") { setUser({ id: "pin", name: ls("edusign-admin") || "관리자", role: "master", parts: ["snack", "garden", "support"] }); return; }
    var card = document.querySelector("#lockScreen .lock__card");
    card.innerHTML = '<div class="lock__brand">SNACK<em>&amp;</em>GARDEN EDU</div><p class="lock__label">관리자 비밀번호 4자리를 입력하세요</p>'
      + '<div class="lock__dots" id="lockDots"><span class="lock__dot"></span><span class="lock__dot"></span><span class="lock__dot"></span><span class="lock__dot"></span>'
      + '<input type="tel" inputmode="numeric" pattern="[0-9]*" maxlength="4" id="lockInput" class="lock__input" autocomplete="off" aria-label="비밀번호 4자리" /></div>'
      + '<p class="lock__error" id="lockError" hidden>비밀번호가 올바르지 않습니다</p>';
    var dots = document.getElementById("lockDots"), input = document.getElementById("lockInput"), error = document.getElementById("lockError");
    var render = function (v) { dots.querySelectorAll(".lock__dot").forEach(function (d, i) { d.classList.toggle("is-filled", i < v.length); }); };
    input.addEventListener("input", function () {
      var v = input.value.replace(/\D/g, "").slice(0, 4); input.value = v; render(v); error.hidden = true;
      if (v.length < 4) return;
      var a = list.filter(function (x) { return String(x.pin) === v; })[0];
      if (a) { ls("edusign-auth", "ok"); ls("edusign-admin", a.name || ""); setUser({ id: "pin", name: a.name || "관리자", role: "master", parts: ["snack", "garden", "support"] }); }
      else { error.hidden = false; dots.classList.add("is-shake"); setTimeout(function () { dots.classList.remove("is-shake"); input.value = ""; render(""); }, 400); }
    });
    setTimeout(function () { input.focus(); }, 50);
    dots.addEventListener("click", function () { input.focus(); });
  }

  function init() {
    // 데모(?demo=1)·Supabase 없음 → 총괄로 바로 (화면 확인용)
    if (!hasSupa()) { Auth.mode = "pin"; setUser({ id: "demo", name: "데모", role: "master", parts: ["snack", "garden", "support"] }); return; }
    var t = Auth.token(), cached = null;
    try { cached = JSON.parse(ls(K_USER) || "null"); } catch (e) {}
    if (t && cached) setUser(cached);                 // 빠르게 먼저 열고, 서버에서 다시 확인
    rpc("edu_me", { p_token: t || "-" }).then(function (u) {
      if (u) setUser(u);
      else { ls(K_TOKEN, null); setUser(null); showLogin(t ? "다시 로그인해 주세요" : ""); }
    }).catch(function (e) {
      if (missingFn(e)) { ls(K_TOKEN, null); setUser(null); showPin(); return; }
      console.warn(e);
      if (!cached) showLogin("서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.");
    });
  }

  /* ---------------- 내 비밀번호 변경 ---------------- */
  function modal(title, body, onSubmit, submitLabel) {
    var wrap = document.createElement("div"); wrap.className = "modal";
    wrap.innerHTML = '<div class="modal__backdrop" data-close></div><div class="modal__card"><div class="modal__head"><h3>' + esc(title) + '</h3><button type="button" class="modal__x" data-close aria-label="닫기">×</button></div>'
      + '<form autocomplete="off">' + body + '<p class="lock__error" data-err hidden></p><div class="modal__foot"><span class="modal__spacer"></span>'
      + '<button type="button" class="btn" data-close>취소</button><button type="submit" class="btn btn--primary">' + esc(submitLabel || "저장") + '</button></div></form></div>';
    document.body.appendChild(wrap);
    wrap.querySelectorAll("[data-close]").forEach(function (b) { b.onclick = function () { wrap.remove(); }; });
    var form = wrap.querySelector("form"), err = wrap.querySelector("[data-err]"), btn = form.querySelector('[type="submit"]');
    form.onsubmit = function (e) {
      e.preventDefault(); err.hidden = true; btn.disabled = true;
      Promise.resolve(onSubmit(form)).then(function (ok) { if (ok !== false) wrap.remove(); else btn.disabled = false; })
        .catch(function (x) { err.textContent = typeof x === "string" ? x : errMsg(x); err.hidden = false; btn.disabled = false; });
    };
    var first = form.querySelector("input:not([readonly])"); if (first) first.focus();
    return wrap;
  }
  function openMyPw() {
    modal("내 비밀번호 변경",
      '<label class="fld"><span>지금 비밀번호</span><input name="old" type="password" autocomplete="current-password" required></label>'
      + '<label class="fld"><span>새 비밀번호 (4자 이상)</span><input name="nw" type="password" autocomplete="new-password" minlength="4" required></label>'
      + '<label class="fld"><span>새 비밀번호 한 번 더</span><input name="nw2" type="password" autocomplete="new-password" minlength="4" required></label>',
      function (f) {
        if (f.nw.value !== f.nw2.value) return Promise.reject("새 비밀번호가 서로 달라요");
        return rpc("edu_change_pw", { p_token: Auth.token(), p_old: f.old.value, p_new: f.nw.value }).then(function (ok) {
          if (!ok) throw "지금 비밀번호가 맞지 않아요"; toast("비밀번호를 바꿨어요");
        });
      }, "바꾸기");
  }

  /* ---------------- 관리자 설정: 계정 · 권한 ---------------- */
  function partsLabel(u) {
    if (u.role === "master") return "전체";
    if (u.role === "viewer") return "–";
    var p = PARTS.filter(function (x) { return (u.parts || []).indexOf(x[0]) > -1; }).map(function (x) { return x[1]; });
    return p.length ? p.join(" · ") : "없음";
  }
  function fmt(d) { if (!d) return "–"; var t = new Date(d); return (t.getMonth() + 1) + "월 " + t.getDate() + "일 " + ("0" + t.getHours()).slice(-2) + ":" + ("0" + t.getMinutes()).slice(-2); }
  function renderAccounts(view, setCrumb) {
    setCrumb("EDU · 관리자 설정");
    var head = '<div class="wrap"><div class="page-head"><div><p class="eyebrow">EDU · ADMIN</p><h2>관리자 설정</h2>'
      + '<p class="sub">관리자 화면에 들어올 수 있는 계정을 만들고 권한을 정해요.</p></div>'
      + (Auth.mode === "account" ? '<button class="btn btn--primary" id="addUserBtn">+ 계정 추가</button>' : "") + '</div>';
    var roles = '<div class="role-grid">' + Object.keys(ROLES).map(function (r) {
      return '<div class="role-card"><b>' + ROLES[r].label + '</b><p>' + ROLES[r].desc + '</p></div>'; }).join("") + '</div>';
    if (Auth.mode !== "account") {
      view.innerHTML = head + '<div class="prep"><b>계정 기능을 켜려면 SQL 을 한 번 실행해야 해요</b>'
        + '<p>Supabase SQL Editor 에서 <b>supabase/accounts.sql</b> 을 실행하면 아이디 · 비밀번호 로그인으로 바뀌어요. 그 전까지는 지금처럼 4자리 PIN 으로 들어와요.</p></div>'
        + '<div class="sec-h"><h3>권한 종류</h3></div>' + roles + '</div>';
      return;
    }
    if (!Auth.can("accounts")) { view.innerHTML = head + '<div class="prep"><b>총괄 관리자만 볼 수 있어요</b></div></div>'; return; }
    view.innerHTML = head + '<div class="board"><div class="board__head"><h3 class="board__title">계정 <span class="chip-mono" id="userCnt">–</span></h3></div>'
      + '<div class="board__scroll"><table class="board__table acct-table"><thead><tr><th>아이디</th><th>이름</th><th>권한</th><th>교육 자료 파트</th><th>마지막 로그인</th><th></th></tr></thead>'
      + '<tbody id="userRows"><tr><td colspan="6" class="board__empty">불러오는 중…</td></tr></tbody></table></div></div>'
      + '<div class="sec-h"><h3>권한 종류</h3></div>' + roles + '</div>';
    var users = [];
    var paint = function () {
      document.getElementById("userCnt").textContent = users.length + "명";
      document.getElementById("userRows").innerHTML = users.map(function (u) {
        var me = Auth.user && u.id === Auth.user.id;
        return '<tr class="' + (u.active ? "" : "is-off") + '"><td><b>' + esc(u.id) + '</b>' + (me ? ' <span class="chip-mono">나</span>' : "") + '</td>'
          + '<td>' + esc(u.name) + '</td><td><span class="role-pill role-pill--' + u.role + '">' + esc(Auth.roleLabel(u.role)) + '</span>' + (u.active ? "" : ' <span class="chip-mono">사용 안 함</span>') + '</td>'
          + '<td>' + esc(partsLabel(u)) + '</td><td class="mono">' + fmt(u.lastLogin) + '</td>'
          + '<td><div class="row-actions"><button type="button" class="btn btn--sm" data-edit-user="' + esc(u.id) + '">수정</button>'
          + (me ? "" : '<button type="button" class="btn btn--sm btn--danger" data-del-user="' + esc(u.id) + '">삭제</button>') + '</div></td></tr>';
      }).join("") || '<tr><td colspan="6" class="board__empty">계정이 없어요</td></tr>';
      view.querySelectorAll("[data-edit-user]").forEach(function (b) { b.onclick = function () { openUser(users.filter(function (u) { return u.id === b.dataset.editUser; })[0]); }; });
      view.querySelectorAll("[data-del-user]").forEach(function (b) { b.onclick = function () {
        if (!confirm("'" + b.dataset.delUser + "' 계정을 삭제할까요? 바로 로그인할 수 없게 돼요.")) return;
        rpc("edu_user_delete", { p_token: Auth.token(), p_id: b.dataset.delUser }).then(function () { toast("계정을 삭제했어요"); load(); }).catch(function (e) { toast(errMsg(e)); });
      }; });
    };
    var load = function () {
      rpc("edu_users_list", { p_token: Auth.token() }).then(function (list) { users = list || []; paint(); })
        .catch(function (e) { document.getElementById("userRows").innerHTML = '<tr><td colspan="6" class="board__empty">' + esc(errMsg(e)) + '</td></tr>'; });
    };
    var openUser = function (u) {
      var isNew = !u; u = u || { id: "", name: "", role: "editor", parts: ["garden"], active: true };
      var me = Auth.user && u.id === Auth.user.id;
      var w = modal(isNew ? "계정 추가" : "계정 수정 · " + u.id,
        '<div class="fld-row"><label class="fld"><span>아이디 <em>*</em></span><input name="id" value="' + esc(u.id) + '" ' + (isNew ? 'required pattern="[a-zA-Z0-9._\\-]{2,30}" placeholder="영문·숫자 (예: george)" autocapitalize="off" spellcheck="false"' : "readonly") + '></label>'
        + '<label class="fld"><span>이름 <em>*</em></span><input name="name" value="' + esc(u.name) + '" required placeholder="예: 조지"></label></div>'
        + '<div class="fld"><span>권한</span><div class="role-pick">' + Object.keys(ROLES).map(function (r) {
            return '<label class="role-opt"><input type="radio" name="role" value="' + r + '"' + (u.role === r ? " checked" : "") + (me && r !== "master" ? " disabled" : "") + '><span><b>' + ROLES[r].label + '</b><small>' + ROLES[r].desc + '</small></span></label>'; }).join("") + '</div></div>'
        + '<div class="fld" data-parts><span>교육 자료를 만들 수 있는 파트</span><div class="part-pick">' + PARTS.map(function (p) {
            return '<label><input type="checkbox" name="parts" value="' + p[0] + '"' + ((u.parts || []).indexOf(p[0]) > -1 ? " checked" : "") + '> ' + p[1] + '</label>'; }).join("") + '</div></div>'
        + '<label class="fld"><span>' + (isNew ? "비밀번호 (4자 이상) <em>*</em>" : "새 비밀번호 (바꿀 때만 입력)") + '</span><input name="pw" type="text" autocomplete="off" minlength="4" ' + (isNew ? "required" : "") + ' placeholder="' + (isNew ? "처음 쓸 비밀번호" : "비워 두면 그대로") + '"></label>'
        + (me ? "" : '<label class="part-pick"><label><input type="checkbox" name="active"' + (u.active ? " checked" : "") + '> 사용 중 (끄면 로그인할 수 없어요)</label></label>'),
        function (f) {
          var role = (f.querySelector('[name="role"]:checked') || {}).value || u.role;
          var parts = [].slice.call(f.querySelectorAll('[name="parts"]:checked')).map(function (x) { return x.value; });
          if (role === "master") parts = PARTS.map(function (p) { return p[0]; });
          if (role === "viewer") parts = [];
          return rpc("edu_user_save", { p_token: Auth.token(), p_id: f.id.value, p_name: f.name.value.trim(), p_role: role, p_parts: parts,
            p_active: me ? true : !!(f.active && f.active.checked), p_pw: f.pw.value || null })
            .then(function () { toast(isNew ? "계정을 만들었어요 · 아이디와 비밀번호를 본인에게 전해 주세요" : "계정을 고쳤어요"); load(); });
        }, isNew ? "만들기" : "저장");
      var syncParts = function () { var r = (w.querySelector('[name="role"]:checked') || {}).value; w.querySelector("[data-parts]").hidden = r === "master" || r === "viewer"; };
      w.querySelectorAll('[name="role"]').forEach(function (x) { x.onchange = syncParts; }); syncParts();
    };
    document.getElementById("addUserBtn").onclick = function () { openUser(null); };
    load();
  }

  window.EduAuth = { init: init, renderAccounts: renderAccounts, ROLES: ROLES };
})();
