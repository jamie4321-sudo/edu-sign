/* 크루 실명 — OPS 크루 목록의 '실명' 칸 → 출력·관리 화면에 '실명(영문)' 으로
   예) 제이미(jamie.4321) → 조윤희(jamie.4321). 실명이 없으면 원래 이름 그대로.
   크루가 서명할 때 고르는 이름(닉네임)은 바꾸지 않는다. */
(function () {
  "use strict";
  var SRC = "https://script.google.com/macros/s/AKfycbxNV7X2fDwkEB3yXnbrXfkm6y-0kChB0uLzMBUx2jKEfG61QcJXDVujQiSN8V4eOYHX/exec?action=realnames";
  var KEY = "edu-realnames";
  var map = null, byId = null, pending = null;
  try { map = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { map = null; }

  function ldap(name) { var m = String(name || "").match(/\(([^)]+)\)\s*$/); return m ? m[1].trim() : ""; }
  function index() {
    byId = {};
    Object.keys(map || {}).forEach(function (k) { var id = ldap(k); if (id) byId[id.toLowerCase()] = map[k]; });
  }
  if (map) index();

  function refresh() {
    if (pending) return pending;
    pending = Promise.race([
      fetch(SRC).then(function (r) { return r.json(); }),
      new Promise(function (_, rej) { setTimeout(function () { rej(new Error("timeout")); }, 15000); })
    ]).then(function (d) {
      if (d && d.ok && d.names) {
        map = d.names; index();
        try { localStorage.setItem(KEY, JSON.stringify(map)); } catch (e) {}
      }
      return map || {};
    }).catch(function () { pending = null; return map || {}; });
    return pending;
  }

  function realOf(name) {
    if (!map) return "";
    if (map[name]) return map[name];
    var id = ldap(name);
    return id && byId ? (byId[id.toLowerCase()] || "") : "";
  }

  window.RealName = {
    // 저장된 목록이 있으면 바로, 없으면 OPS 에서 받아 올 때까지 (뒤에서 항상 새로 고침)
    load: function () { var p = refresh(); return map ? Promise.resolve(map) : p; },
    real: realOf,
    // '조윤희(jamie.4321)' — 실명 없으면 원래 이름
    display: function (name) {
      var real = realOf(name), id = ldap(name);
      if (!real) return String(name || "");
      return id ? real + "(" + id + ")" : real;
    },
    ldap: ldap
  };
})();
