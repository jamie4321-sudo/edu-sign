/* =========================================================
   EDU SIGN — 데이터 계층 (3-way)
   ---------------------------------------------------------
   우선순위:
     1) CONFIG.supabase (url+anonKey) 있으면 → Supabase (라이브, 빠름)
     2) CONFIG.endpoint 있으면            → 구글시트 GAS (기존 라이브)
     3) 둘 다 없으면                       → localStorage 데모
   ⚠️ Supabase 설정을 지우면 자동으로 (2)→(3) 로 폴백 → 즉시 롤백 가능

   테이블/필드 (앱이 기대하는 모양 — 여기서 snake_case ↔ camelCase 매핑):
     sessions: id | date | category | title | locked | createdAt   (+total,+signed)
     roster:   id | sessionId | seq | dept | name | signature | signedAt
     photos:   id | sessionId | url | uploadedAt
   ========================================================= */
window.Store = (function () {
  // ?demo=1 → 실제 DB 를 건드리지 않는 로컬 데모 (화면 확인용)
  var DEMO = /[?&]demo=1(&|$)/.test(location.search);
  var SUPA = !DEMO && !!(window.CONFIG && window.CONFIG.supabase && window.CONFIG.supabase.url && window.CONFIG.supabase.anonKey);
  var LIVE = !DEMO && !SUPA && !!(window.CONFIG && window.CONFIG.endpoint);
  var LS_KEY = "edusign-demo-v1";
  var PHOTO_BUCKET = (window.CONFIG && window.CONFIG.supabase && window.CONFIG.supabase.photoBucket) || "edu-photos";

  /* ---------------- 데모(localStorage) ---------------- */
  function seed() {
    return { sessions: (window.SESSIONS || []).slice(), roster: (window.ROSTER || []).slice(), photos: (window.PHOTOS || []).slice(), materials: [] };
  }
  function persist(db) { try { localStorage.setItem(LS_KEY, JSON.stringify(db)); } catch (e) {} }
  function load() {
    try { var raw = localStorage.getItem(LS_KEY); if (raw) { var db = JSON.parse(raw); db.photos = db.photos || []; db.materials = db.materials || []; return db; } } catch (e) {}
    var s = seed(); persist(s); return s;
  }
  var DB = (SUPA || LIVE) ? null : load();

  function uid() { return "id" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function apiKey() { return (window.CONFIG && window.CONFIG.apiKey) || ""; }

  /* ---------------- GAS(구글시트) HTTP ---------------- */
  function api(payload) {
    return fetch(window.CONFIG.endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(Object.assign({ key: apiKey() }, payload))
    }).then(function (r) { return r.json(); });
  }
  function apiGet(params) {
    var all = Object.assign({ key: apiKey() }, params || {});
    var qs = Object.keys(all).map(function (k) { return k + "=" + encodeURIComponent(all[k]); }).join("&");
    return fetch(window.CONFIG.endpoint + (qs ? "?" + qs : "")).then(function (r) { return r.json(); });
  }

  /* ---------------- Supabase ---------------- */
  var _sb = null;
  function sb() {
    if (!_sb) {
      if (!window.supabase || !window.supabase.createClient) {
        throw new Error("supabase-js 가 로드되지 않았습니다. HTML 에 <script src=\"https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2\"> 를 store.js 앞에 추가하세요.");
      }
      _sb = window.supabase.createClient(window.CONFIG.supabase.url, window.CONFIG.supabase.anonKey);
    }
    return _sb;
  }
  function must(res) { if (res.error) throw res.error; return res.data; }

  // DB(snake) → 앱(camel) 매핑
  function mapSession(r) {
    if (!r) return r;
    return { id: r.id, date: r.date || "", category: r.category || "", title: r.title || "",
      locked: !!r.locked, createdAt: r.created_at || "",
      total: (r.total != null ? Number(r.total) : undefined),
      signed: (r.signed != null ? Number(r.signed) : undefined) };
  }
  function mapRoster(r) {
    return { id: r.id, sessionId: r.session_id, seq: r.seq, dept: r.dept || "",
      name: r.name || "", signature: r.signature || "", signedAt: r.signed_at || "" };
  }
  function mapMaterial(r) {
    return { id: r.id, part: r.part || "garden", topic: r.topic || "", title: r.title || "", summary: r.summary || "",
      steps: Array.isArray(r.steps) ? r.steps : [], needsSign: !!r.needs_sign, signSessionId: r.sign_session_id || "",
      status: r.status === "draft" ? "draft" : "published", updatedBy: r.updated_by || "", createdBy: r.created_by || "", createdAt: r.created_at || "", updatedAt: r.updated_at || "" };
  }
  function mapPhoto(r) {
    return { id: r.id, sessionId: r.session_id, url: r.url || "", uploadedAt: r.uploaded_at || "" };
  }
  function dataUrlToBlob(dataUrl) {
    var parts = String(dataUrl || "").split(",");
    var m = (parts[0] || "").match(/:(.*?);/);
    var mime = m ? m[1] : "image/jpeg";
    var bin = atob(parts[1] || "");
    var n = bin.length, u8 = new Uint8Array(n);
    while (n--) u8[n] = bin.charCodeAt(n);
    return new Blob([u8], { type: mime });
  }

  /* client-side 카운트 (데모용) */
  function withCounts(sessions, roster) {
    return sessions.map(function (s) {
      var rows = roster.filter(function (r) { return String(r.sessionId) === String(s.id); });
      var signed = rows.filter(function (r) { return !!r.signature; }).length;
      return Object.assign({}, s, { total: rows.length, signed: signed });
    });
  }

  return {
    isLive: function () { return SUPA || LIVE; },
    backend: function () { return SUPA ? "supabase" : (LIVE ? "gas" : "demo"); },

    /* ---------- 세션 목록 ---------- */
    listSessions: function () {
      if (SUPA) {
        return sb().from("sessions_with_counts").select("*").order("date", { ascending: false })
          .then(must).then(function (rows) { return (rows || []).map(mapSession); });
      }
      if (LIVE) return apiGet({ action: "sessions" }).then(function (d) { return d.sessions || []; });
      DB = load();
      return Promise.resolve(withCounts(DB.sessions, DB.roster).sort(function (a, b) { return a.date < b.date ? 1 : -1; }));
    },

    /* ---------- 세션 상세 ---------- */
    getSession: function (id) {
      if (SUPA) {
        return Promise.all([
          sb().from("sessions").select("*").eq("id", id).maybeSingle().then(must),
          sb().from("roster").select("*").eq("session_id", id).order("seq", { ascending: true }).then(must)
        ]).then(function (arr) {
          return { session: arr[0] ? mapSession(arr[0]) : null, roster: (arr[1] || []).map(mapRoster) };
        });
      }
      if (LIVE) return apiGet({ action: "session", id: id });
      DB = load();
      var s = DB.sessions.find(function (x) { return String(x.id) === String(id); });
      var rows = DB.roster.filter(function (r) { return String(r.sessionId) === String(id); })
        .sort(function (a, b) { return (+a.seq) - (+b.seq); });
      return Promise.resolve({ session: s, roster: rows });
    },

    /* ---------- 세션 추가/수정 ---------- */
    saveSession: function (obj) {
      if (SUPA) {
        if (obj.id) {
          var patch = { date: obj.date || "", category: obj.category || "", title: obj.title || "" };
          if (obj.hasOwnProperty("locked")) patch.locked = !!obj.locked;
          return sb().from("sessions").update(patch).eq("id", obj.id).then(must)
            .then(function () { return { ok: true, id: obj.id }; });
        }
        var id = uid();
        var row = { id: id, date: obj.date || "", category: obj.category || "", title: obj.title || "",
          locked: false, created_at: new Date().toISOString() };
        return sb().from("sessions").insert(row).then(must).then(function () { return { ok: true, id: id }; });
      }
      if (LIVE) return api(Object.assign({ type: "session", action: obj.id ? "update" : "add" }, obj));
      DB = load();
      if (!obj.id) { obj.id = uid(); obj.createdAt = new Date().toISOString(); obj.locked = false; DB.sessions.push(obj); }
      else { var i = DB.sessions.findIndex(function (s) { return s.id === obj.id; }); DB.sessions[i] = Object.assign({}, DB.sessions[i], obj); }
      persist(DB);
      return Promise.resolve({ ok: true, id: obj.id });
    },

    /* ---------- 잠금 ---------- */
    setLocked: function (id, locked) {
      if (SUPA) return sb().from("sessions").update({ locked: !!locked }).eq("id", id).then(must).then(function () { return { ok: true }; });
      if (LIVE) return api({ type: "session", action: "lock", id: id, locked: locked });
      DB = load(); var s = DB.sessions.find(function (x) { return x.id === id; }); if (s) s.locked = locked; persist(DB);
      return Promise.resolve({ ok: true });
    },

    /* ---------- 세션 삭제(명단·사진 cascade) ---------- */
    deleteSession: function (id) {
      if (SUPA) {
        // 사진 파일도 Storage 에서 정리
        return sb().from("photos").select("storage_path").eq("session_id", id).then(must).then(function (rows) {
          var paths = (rows || []).map(function (r) { return r.storage_path; }).filter(Boolean);
          var pre = paths.length ? sb().storage.from(PHOTO_BUCKET).remove(paths) : Promise.resolve();
          return pre.then(function () { return sb().from("sessions").delete().eq("id", id).then(must); });
        }).then(function () { return { ok: true }; });
      }
      if (LIVE) return api({ type: "session", action: "delete", id: id });
      DB = load();
      DB.sessions = DB.sessions.filter(function (s) { return s.id !== id; });
      DB.roster = DB.roster.filter(function (r) { return r.sessionId !== id; });
      persist(DB);
      return Promise.resolve({ ok: true });
    },

    /* ---------- 명단 일괄 추가(이름 중복 제거 + seq 자동) ---------- */
    bulkAddRoster: function (sessionId, rows) {
      if (SUPA) {
        return sb().from("roster").select("seq,name").eq("session_id", sessionId).then(must).then(function (existing) {
          existing = existing || [];
          var maxSeq = existing.reduce(function (m, r) { return Math.max(m, +r.seq || 0); }, 0);
          var seen = {};
          existing.forEach(function (r) { seen[String(r.name || "").trim().toLowerCase()] = true; });
          var toInsert = [], skipped = 0;
          (rows || []).forEach(function (row) {
            var key = String(row.name || "").trim().toLowerCase();
            if (!key || seen[key]) { skipped++; return; }
            seen[key] = true; maxSeq += 1;
            toInsert.push({ id: uid(), session_id: sessionId, seq: maxSeq, dept: row.dept || "", name: row.name, signature: "", signed_at: null });
          });
          var ins = toInsert.length ? sb().from("roster").insert(toInsert).then(must) : Promise.resolve();
          return ins.then(function () { return { ok: true, added: toInsert.length, skipped: skipped }; });
        });
      }
      if (LIVE) return api({ type: "roster", action: "bulkAdd", sessionId: sessionId, rows: rows });
      DB = load();
      var existing = DB.roster.filter(function (r) { return r.sessionId === sessionId; });
      var maxSeq = existing.reduce(function (m, r) { return Math.max(m, +r.seq || 0); }, 0);
      var seen = {}; existing.forEach(function (r) { seen[String(r.name || "").trim().toLowerCase()] = true; });
      var added = 0, skipped = 0;
      (rows || []).forEach(function (row) {
        var key = String(row.name || "").trim().toLowerCase();
        if (!key || seen[key]) { skipped++; return; }
        seen[key] = true; maxSeq += 1;
        DB.roster.push({ id: uid(), sessionId: sessionId, seq: maxSeq, dept: row.dept || "", name: row.name, signature: "", signedAt: "" });
        added++;
      });
      persist(DB);
      return Promise.resolve({ ok: true, added: added, skipped: skipped });
    },

    /* ---------- 명단 수정 ---------- */
    updateRoster: function (obj) {
      if (SUPA) return sb().from("roster").update({ dept: obj.dept || "", name: obj.name || "" }).eq("id", obj.id).then(must).then(function () { return { ok: true }; });
      if (LIVE) return api(Object.assign({ type: "roster", action: "update" }, obj));
      DB = load(); var i = DB.roster.findIndex(function (r) { return r.id === obj.id; }); if (i > -1) DB.roster[i] = Object.assign({}, DB.roster[i], obj); persist(DB);
      return Promise.resolve({ ok: true });
    },

    /* ---------- 명단 삭제 ---------- */
    deleteRoster: function (id) {
      if (SUPA) return sb().from("roster").delete().eq("id", id).then(must).then(function () { return { ok: true }; });
      if (LIVE) return api({ type: "roster", action: "delete", id: id });
      DB = load(); DB.roster = DB.roster.filter(function (r) { return r.id !== id; }); persist(DB);
      return Promise.resolve({ ok: true });
    },

    /* ---------- 서명 ---------- */
    signRoster: function (id, signature) {
      if (SUPA) return sb().from("roster").update({ signature: signature, signed_at: new Date().toISOString() }).eq("id", id).then(must).then(function () { return { ok: true }; });
      if (LIVE) return api({ type: "roster", action: "sign", id: id, signature: signature });
      DB = load(); var r = DB.roster.find(function (x) { return x.id === id; }); if (r) { r.signature = signature; r.signedAt = new Date().toISOString(); } persist(DB);
      return Promise.resolve({ ok: true });
    },

    /* ---------- 전체 명단 ---------- */
    /* ---------- 교육 자료 열람 · '다 봤어요' 기록 (material_views) ---------- */
    markView: function (materialId, name, dept, done) {
      if (!materialId || !name) return Promise.resolve();
      if (SUPA) return sb().rpc("edu_material_view", { p_material: materialId, p_name: name, p_dept: dept || null, p_done: !!done }).then(must);
      DB = load(); DB.views = DB.views || [];
      var id = materialId + ":" + name, now = new Date().toISOString(), v = DB.views.filter(function (x) { return x.id === id; })[0];
      if (!v) DB.views.push({ id: id, materialId: materialId, name: name, dept: dept || "", firstAt: now, lastAt: now, views: done ? 0 : 1, doneAt: done ? now : "" });
      else { v.lastAt = now; if (!done) v.views++; if (done && !v.doneAt) v.doneAt = now; }
      persist(DB); return Promise.resolve();
    },
    listViews: function (filter) {
      var f = filter || {};
      if (SUPA) {
        var q = sb().from("material_views").select("*");
        if (f.name) q = q.eq("name", f.name);
        return q.then(must).then(function (rows) { return (rows || []).map(function (r) {
          return { id: r.id, materialId: r.material_id, name: r.name, dept: r.dept || "", firstAt: r.first_at, lastAt: r.last_at, views: r.views, doneAt: r.done_at || "" }; }); });
      }
      DB = load(); return Promise.resolve((DB.views || []).filter(function (v) { return !f.name || v.name === f.name; }));
    },

    // 이수 현황용: 서명 세션 명단을 서명 이미지 없이 (이름 · 부서 · 서명 시각만)
    listRosterLite: function (sessionIds) {
      var ids = (sessionIds || []).filter(Boolean);
      if (!ids.length) return Promise.resolve([]);
      if (SUPA) return sb().from("roster").select("session_id,name,dept,signed_at").in("session_id", ids).then(must)
        .then(function (rows) { return (rows || []).map(function (r) { return { sessionId: r.session_id, name: r.name || "", dept: r.dept || "", signedAt: r.signed_at || "" }; }); });
      return this.listAllRoster().then(function (rows) { return rows.filter(function (r) { return ids.indexOf(r.sessionId) > -1; })
        .map(function (r) { return { sessionId: r.sessionId, name: r.name, dept: r.dept, signedAt: r.signature ? (r.signedAt || "서명") : "" }; }); });
    },

    // 크루 이름 로그인용: 이름 · 부서만 (서명 이미지는 받지 않아 가볍다)
    listCrewNames: function () {
      if (SUPA) return sb().from("roster").select("name,dept").then(must).then(function (rows) { return rows || []; });
      return this.listAllRoster();
    },
    listAllRoster: function () {
      if (SUPA) return sb().from("roster").select("*").then(must).then(function (rows) { return (rows || []).map(mapRoster); });
      if (LIVE) return apiGet({ action: "allRoster" }).then(function (d) { return d.roster || []; });
      DB = load(); return Promise.resolve(DB.roster.slice());
    },

    /* ---------- 사진 목록 ---------- */
    listPhotos: function (sessionId) {
      if (SUPA) return sb().from("photos").select("*").eq("session_id", sessionId).order("uploaded_at", { ascending: false }).then(must).then(function (rows) { return (rows || []).map(mapPhoto); });
      if (LIVE) return apiGet({ action: "photos", id: sessionId }).then(function (d) { return d.photos || []; });
      DB = load();
      return Promise.resolve(DB.photos.filter(function (p) { return p.sessionId === sessionId; }).sort(function (a, b) { return a.uploadedAt < b.uploadedAt ? 1 : -1; }));
    },

    /* ---------- 세션별 참석 부서 (명단의 부서만 가볍게) → { 세션 id: ["가든","스낵",…] } ---------- */
    listSessionDepts: function () {
      var group = function (rows, key) { var out = {}; (rows || []).forEach(function (r) { var k = r[key]; out[k] = out[k] || []; if (r.dept && out[k].indexOf(r.dept) < 0) out[k].push(r.dept); }); return out; };
      if (SUPA) return sb().from("roster").select("session_id,dept").then(must).then(function (rows) { return group(rows, "session_id"); });
      if (LIVE) return Promise.resolve({});
      DB = load(); return Promise.resolve(group(DB.roster, "sessionId"));
    },

    /* ---------- 교육 자료실 (materials) ----------
       steps: [{ u: 사진 URL, p: Storage 경로, text: 설명, warn: 주의 }] */
    listMaterials: function (part) {
      if (SUPA) {
        return sb().from("materials").select("*").eq("part", part || "garden").order("created_at", { ascending: false })
          .then(must).then(function (rows) { return (rows || []).map(mapMaterial); });
      }
      DB = load();
      return Promise.resolve(DB.materials.filter(function (m) { return m.part === (part || "garden"); })
        .sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; }));
    },
    getMaterial: function (id) {
      if (SUPA) return sb().from("materials").select("*").eq("id", id).maybeSingle().then(must).then(function (r) { return r ? mapMaterial(r) : null; });
      DB = load();
      return Promise.resolve(DB.materials.find(function (m) { return m.id === id; }) || null);
    },
    newMaterialId: function () { return uid(); },
    saveMaterial: function (m) {
      var now = new Date().toISOString();
      if (SUPA) {
        var row = { id: m.id, part: m.part || "garden", topic: m.topic || "", title: m.title || "", summary: m.summary || "",
          steps: m.steps || [], needs_sign: !!m.needsSign, sign_session_id: m.signSessionId || null, created_by: m.createdBy || "", updated_at: now,
          status: m.status === "draft" ? "draft" : "published", updated_by: m.updatedBy || "" };
        var up = function (r) { return sb().from("materials").upsert(r, { onConflict: "id" }).then(must); };
        // 임시보관 칸(status · updated_by)이 아직 없으면: 게시는 예전처럼 저장, 임시보관은 SQL 안내
        return up(row).catch(function (err) {
          if (!/status|updated_by/.test(String(err && err.message))) throw err;
          if (row.status === "draft") { var x = new Error("NEED_DRAFT_SQL"); x.needSql = true; throw x; }
          delete row.status; delete row.updated_by; return up(row);
        }).then(function () { return m.id; });
      }
      DB = load();
      var i = DB.materials.findIndex(function (x) { return x.id === m.id; });
      var rec = Object.assign({}, m, { updatedAt: now, createdAt: i < 0 ? now : DB.materials[i].createdAt });
      if (i < 0) DB.materials.push(rec); else DB.materials[i] = rec;
      persist(DB); return Promise.resolve(m.id);
    },
    deleteMaterial: function (m) {
      if (SUPA) {
        var paths = (m.steps || []).map(function (st) { return st.p; }).filter(Boolean);
        return sb().from("materials").delete().eq("id", m.id).then(must).then(function () {
          if (paths.length) return sb().storage.from(PHOTO_BUCKET).remove(paths).then(function () {}, function () {});
        });
      }
      DB = load(); DB.materials = DB.materials.filter(function (x) { return x.id !== m.id; }); persist(DB); return Promise.resolve();
    },
    // 사진 한 장 올리기 → { u, p }. 데모 모드는 사진을 브라우저에만 둔다
    uploadMaterialPhoto: function (materialId, dataUrl, filename) {
      if (SUPA) {
        var blob = dataUrlToBlob(dataUrl);
        var path = "materials/" + materialId + "/" + Date.now() + "_" + Math.random().toString(36).slice(2, 8) + ".jpg";
        return sb().storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: blob.type || "image/jpeg", upsert: false }).then(must).then(function () {
          return { u: sb().storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl, p: path };
        });
      }
      return Promise.resolve({ u: dataUrl, p: "" });
    },
    removeMaterialPhotos: function (paths) {
      paths = (paths || []).filter(Boolean);
      if (!SUPA || !paths.length) return Promise.resolve();
      return sb().storage.from(PHOTO_BUCKET).remove(paths).then(function () {}, function () {});
    },

    /* ---------- 사진 업로드 (Storage) ---------- */
    uploadPhoto: function (sessionId, dataUrl, filename) {
      if (SUPA) {
        var blob = dataUrlToBlob(dataUrl);
        var ext = (filename && filename.indexOf(".") > -1) ? filename.split(".").pop() : (blob.type.split("/")[1] || "jpg");
        var path = sessionId + "/" + Date.now() + "_" + Math.random().toString(36).slice(2, 8) + "." + ext;
        return sb().storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: blob.type, upsert: false }).then(must).then(function () {
          var pub = sb().storage.from(PHOTO_BUCKET).getPublicUrl(path);
          var url = pub.data.publicUrl;
          var id = uid();
          return sb().from("photos").insert({ id: id, session_id: sessionId, url: url, storage_path: path, uploaded_at: new Date().toISOString() }).then(must)
            .then(function () { return { ok: true, id: id, url: url }; });
        });
      }
      if (LIVE) return api({ type: "photo", action: "add", sessionId: sessionId, dataUrl: dataUrl, filename: filename });
      DB = load(); DB.photos.push({ id: uid(), sessionId: sessionId, fileId: "", url: dataUrl, uploadedAt: new Date().toISOString() }); persist(DB);
      return Promise.resolve({ ok: true });
    },

    /* ---------- 사진 삭제 ---------- */
    deletePhoto: function (id) {
      if (SUPA) {
        return sb().from("photos").select("storage_path").eq("id", id).maybeSingle().then(must).then(function (row) {
          var pre = (row && row.storage_path) ? sb().storage.from(PHOTO_BUCKET).remove([row.storage_path]) : Promise.resolve();
          return pre.then(function () { return sb().from("photos").delete().eq("id", id).then(must); });
        }).then(function () { return { ok: true }; });
      }
      if (LIVE) return api({ type: "photo", action: "delete", id: id });
      DB = load(); DB.photos = DB.photos.filter(function (p) { return p.id !== id; }); persist(DB);
      return Promise.resolve({ ok: true });
    },

    /* ---------- (구글드라이브 전용) 루트 폴더 URL ---------- */
    getRootFolderUrl: function () {
      if (SUPA) return Promise.resolve("");          // Supabase 모드엔 해당 없음
      if (LIVE) return apiGet({ action: "rootFolder" }).then(function (d) { return d.url || ""; });
      return Promise.resolve("");
    }
  };
})();
