/* =========================================================
   EDU SIGN — 데이터 계층
   CONFIG.endpoint 있으면 GAS 웹앱 호출(라이브), 없으면 localStorage 데모
   sessions: id|date|category|title|locked|createdAt
   roster:   id|sessionId|seq|dept|name|signature|signedAt
   ========================================================= */
window.Store = (function () {
  var LIVE = !!(window.CONFIG && window.CONFIG.endpoint);
  var LS_KEY = "edusign-demo-v1";

  function seed() {
    return { sessions: (window.SESSIONS || []).slice(), roster: (window.ROSTER || []).slice(), photos: (window.PHOTOS || []).slice() };
  }
  function persist(db) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(db)); } catch (e) {}
  }
  function load() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (raw) { var db = JSON.parse(raw); db.photos = db.photos || []; return db; }
    } catch (e) {}
    var s = seed();
    persist(s);
    return s;
  }
  var DB = LIVE ? null : load();

  function uid() { return "id" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  function api(payload) {
    return fetch(window.CONFIG.endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json(); });
  }
  function apiGet(params) {
    var qs = Object.keys(params || {}).map(function (k) { return k + "=" + encodeURIComponent(params[k]); }).join("&");
    return fetch(window.CONFIG.endpoint + (qs ? "?" + qs : "")).then(function (r) { return r.json(); });
  }

  function withCounts(sessions, roster) {
    return sessions.map(function (s) {
      var rows = roster.filter(function (r) { return String(r.sessionId) === String(s.id); });
      var signed = rows.filter(function (r) { return !!r.signature; }).length;
      return Object.assign({}, s, { total: rows.length, signed: signed });
    });
  }

  return {
    isLive: function () { return LIVE; },

    listSessions: function () {
      if (LIVE) return apiGet({ action: "sessions" }).then(function (d) { return d.sessions || []; });
      DB = load();
      return Promise.resolve(withCounts(DB.sessions, DB.roster).sort(function (a, b) { return a.date < b.date ? 1 : -1; }));
    },

    getSession: function (id) {
      if (LIVE) return apiGet({ action: "session", id: id });
      DB = load();
      var s = DB.sessions.find(function (x) { return String(x.id) === String(id); });
      var rows = DB.roster.filter(function (r) { return String(r.sessionId) === String(id); })
        .sort(function (a, b) { return (+a.seq) - (+b.seq); });
      return Promise.resolve({ session: s, roster: rows });
    },

    saveSession: function (obj) {
      if (LIVE) return api(Object.assign({ type: "session", action: obj.id ? "update" : "add" }, obj));
      DB = load();
      if (!obj.id) {
        obj.id = uid(); obj.createdAt = new Date().toISOString(); obj.locked = false;
        DB.sessions.push(obj);
      } else {
        var i = DB.sessions.findIndex(function (s) { return s.id === obj.id; });
        DB.sessions[i] = Object.assign({}, DB.sessions[i], obj);
      }
      persist(DB);
      return Promise.resolve({ ok: true, id: obj.id });
    },

    setLocked: function (id, locked) {
      if (LIVE) return api({ type: "session", action: "lock", id: id, locked: locked });
      DB = load();
      var s = DB.sessions.find(function (x) { return x.id === id; });
      if (s) s.locked = locked;
      persist(DB);
      return Promise.resolve({ ok: true });
    },

    deleteSession: function (id) {
      if (LIVE) return api({ type: "session", action: "delete", id: id });
      DB = load();
      DB.sessions = DB.sessions.filter(function (s) { return s.id !== id; });
      DB.roster = DB.roster.filter(function (r) { return r.sessionId !== id; });
      persist(DB);
      return Promise.resolve({ ok: true });
    },

    bulkAddRoster: function (sessionId, rows) {
      if (LIVE) return api({ type: "roster", action: "bulkAdd", sessionId: sessionId, rows: rows });
      DB = load();
      var maxSeq = DB.roster.filter(function (r) { return r.sessionId === sessionId; })
        .reduce(function (m, r) { return Math.max(m, +r.seq || 0); }, 0);
      rows.forEach(function (row, i) {
        DB.roster.push({ id: uid(), sessionId: sessionId, seq: maxSeq + i + 1, dept: row.dept || "", name: row.name, signature: "", signedAt: "" });
      });
      persist(DB);
      return Promise.resolve({ ok: true });
    },

    updateRoster: function (obj) {
      if (LIVE) return api(Object.assign({ type: "roster", action: "update" }, obj));
      DB = load();
      var i = DB.roster.findIndex(function (r) { return r.id === obj.id; });
      if (i > -1) DB.roster[i] = Object.assign({}, DB.roster[i], obj);
      persist(DB);
      return Promise.resolve({ ok: true });
    },

    deleteRoster: function (id) {
      if (LIVE) return api({ type: "roster", action: "delete", id: id });
      DB = load();
      DB.roster = DB.roster.filter(function (r) { return r.id !== id; });
      persist(DB);
      return Promise.resolve({ ok: true });
    },

    signRoster: function (id, signature) {
      if (LIVE) return api({ type: "roster", action: "sign", id: id, signature: signature });
      DB = load();
      var r = DB.roster.find(function (x) { return x.id === id; });
      if (r) { r.signature = signature; r.signedAt = new Date().toISOString(); }
      persist(DB);
      return Promise.resolve({ ok: true });
    },

    listPhotos: function (sessionId) {
      if (LIVE) return apiGet({ action: "photos", id: sessionId }).then(function (d) { return d.photos || []; });
      DB = load();
      return Promise.resolve(DB.photos.filter(function (p) { return p.sessionId === sessionId; })
        .sort(function (a, b) { return a.uploadedAt < b.uploadedAt ? 1 : -1; }));
    },

    uploadPhoto: function (sessionId, dataUrl, filename) {
      if (LIVE) return api({ type: "photo", action: "add", sessionId: sessionId, dataUrl: dataUrl, filename: filename });
      DB = load();
      DB.photos.push({ id: uid(), sessionId: sessionId, fileId: "", url: dataUrl, uploadedAt: new Date().toISOString() });
      persist(DB);
      return Promise.resolve({ ok: true });
    },

    deletePhoto: function (id) {
      if (LIVE) return api({ type: "photo", action: "delete", id: id });
      DB = load();
      DB.photos = DB.photos.filter(function (p) { return p.id !== id; });
      persist(DB);
      return Promise.resolve({ ok: true });
    },

    getRootFolderUrl: function () {
      if (LIVE) return apiGet({ action: "rootFolder" }).then(function (d) { return d.url || ""; });
      return Promise.resolve("");
    }
  };
})();
