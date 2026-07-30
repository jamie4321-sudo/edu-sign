/**
 * EDU SIGN — Google Apps Script 백엔드
 * =====================================================
 * 하나의 Google 시트에 교육 세션 · 참석자 명단(서명 포함) · 교육 사진을 저장/조회합니다.
 * 정적 사이트(GitHub Pages / Vercel)에서 fetch 로 호출합니다.
 *
 * 시트 탭 (없으면 자동 생성, 필드가 늘어나면 끝에 컬럼을 자동 추가):
 *  - "sessions" : id | date | category | title | locked | createdAt | driveFolderUrl
 *  - "roster"   : id | sessionId | seq | dept | name | signature | signedAt
 *                 signature = base64 PNG dataURL(짧으면) 또는 "drive:<fileId>"(길면, 자동)
 *  - "photos"   : id | sessionId | fileId | url | uploadedAt
 *
 * 교육 사진은 "EDU SIGN 교육사진" 이라는 이름의 내 드라이브 폴더 아래,
 * 세션별로 하위 폴더를 만들어 저장합니다(setupFolders() 로 미리 만들 필요 없음 — 첫 업로드 시 자동 생성).
 *
 * 읽기/쓰기 모두 "컬럼 순서"가 아니라 "헤더 이름"으로 매칭합니다.
 *
 * 배포: 배포 > 배포 관리 > 기존 배포 수정 > 새 버전으로 배포
 *   - 실행 계정: 나 / 액세스 권한: 모든 사용자
 * 배포 후 /exec URL 을 js/config.local.js 의 CONFIG.endpoint 에 붙여넣으세요.
 * (이 저장소는 공개 저장소라 config.js 에는 절대 실제 endpoint를 적지 않습니다 — config.local.js 사용)
 */

var SESSION_FIELDS = ["id", "date", "category", "title", "locked", "createdAt", "driveFolderUrl"];
var ROSTER_FIELDS = ["id", "sessionId", "seq", "dept", "name", "signature", "signedAt"];
var PHOTO_FIELDS = ["id", "sessionId", "fileId", "url", "uploadedAt"];

var ROOT_FOLDER_NAME = "EDU SIGN 교육사진";
var SIGN_FOLDER_NAME = "EDU SIGN 서명원본";
var SIGNATURE_INLINE_LIMIT = 8000; // 이보다 긴 서명 dataURL은 드라이브에 저장하고 참조만 남김

// 새로 만든 스프레드시트 ID
var SHEET_ID = "1tqD6P2IcfuIaIDGaPz2aOWst_5XPD1mH81VNFkBzrBY";

function ss_() { return SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet(); }

function sheet_(name, fields) {
  var ss = ss_();
  var sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(fields); sh.setFrozenRows(1); }
  ensureColumns_(sh, fields);
  return sh;
}

function ensureColumns_(sh, fields) {
  ensureId_(sh);
  var lastCol = Math.max(sh.getLastColumn(), 1);
  var headers = sh.getRange(1, 1, 1, lastCol).getValues()[0];
  var have = {};
  headers.forEach(function (h) { if (h) have[h] = true; });
  var missing = fields.filter(function (f) { return !have[f]; });
  if (missing.length) sh.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]);
}

function ensureId_(sh) {
  if (sh.getLastRow() === 0) { sh.getRange(1, 1).setValue("id"); return; }
  var lastCol = sh.getLastColumn();
  var headers = sh.getRange(1, 1, 1, lastCol).getValues()[0];
  for (var c = headers.length; c >= 1; c--) {
    if (headers[c - 1] === "") {
      var last0 = sh.getLastRow();
      var hasData = last0 > 1 && sh.getRange(2, c, last0 - 1, 1).getValues().some(function (row) { return row[0] !== ""; });
      if (!hasData) sh.deleteColumn(c);
    }
  }
  if (sh.getRange(1, 1).getValue() !== "id") {
    sh.insertColumnBefore(1);
    sh.getRange(1, 1).setValue("id");
  }
  var lastCol2 = sh.getLastColumn();
  for (var c2 = lastCol2; c2 >= 2; c2--) {
    if (sh.getRange(1, c2).getValue() === "id") sh.deleteColumn(c2);
  }
  var last = sh.getLastRow();
  if (last < 2) return;
  var idRange = sh.getRange(2, 1, last - 1, 1);
  var ids = idRange.getValues();
  var changed = false;
  for (var i = 0; i < ids.length; i++) {
    if (!ids[i][0]) { ids[i][0] = Utilities.getUuid(); changed = true; }
  }
  if (changed) idRange.setValues(ids);
}

function headerRow_(sh) {
  var lastCol = Math.max(sh.getLastColumn(), 1);
  return sh.getRange(1, 1, 1, lastCol).getValues()[0];
}

function rows_(name, fields) {
  var sh = sheet_(name, fields || []);
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var head = values.shift();
  return values.map(function (r) {
    var o = {};
    head.forEach(function (h, i) { if (h) o[h] = r[i]; });
    return o;
  });
}

function findRowById_(sh, id) {
  if (!id) return -1;
  var last = sh.getLastRow();
  if (last < 2) return -1;
  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return -1;
}

function upsertRowByHeader_(sh, id, valuesObj) {
  var headers = headerRow_(sh);
  var row = findRowById_(sh, id);
  if (row < 0) {
    var newRow = headers.map(function (h) { return valuesObj.hasOwnProperty(h) ? valuesObj[h] : ""; });
    sh.appendRow(newRow);
  } else {
    var existing = sh.getRange(row, 1, 1, headers.length).getValues()[0];
    var updated = headers.map(function (h, i) { return valuesObj.hasOwnProperty(h) ? valuesObj[h] : existing[i]; });
    sh.getRange(row, 1, 1, headers.length).setValues([updated]);
  }
}

function deleteRowById_(sh, id) {
  var row = findRowById_(sh, id);
  if (row > 0) sh.deleteRow(row);
}

function fmtDate_(v) {
  if (!v && v !== 0) return "";
  if (Object.prototype.toString.call(v) === "[object Date]") {
    var m = ("0" + (v.getMonth() + 1)).slice(-2), day = ("0" + v.getDate()).slice(-2);
    return v.getFullYear() + "-" + m + "-" + day;
  }
  var s = String(v);
  var iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return iso ? iso[1] : s;
}

function boolOf_(v) { return v === true || String(v).toLowerCase() === "true"; }

/* ---------------- 드라이브 폴더 ---------------- */
function rootFolder_() {
  var it = DriveApp.getFoldersByName(ROOT_FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(ROOT_FOLDER_NAME);
}
function signFolder_() {
  var it = DriveApp.getFoldersByName(SIGN_FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(SIGN_FOLDER_NAME);
}
function sessionFolder_(session) {
  var root = rootFolder_();
  var name = (session.date || "") + " " + (session.title || session.category || session.id || "");
  var it = root.getFoldersByName(name);
  return it.hasNext() ? it.next() : root.createFolder(name);
}
function resolveSignature_(v) {
  if (!v) return "";
  var s = String(v);
  if (s.indexOf("drive:") === 0) return "https://drive.google.com/thumbnail?id=" + s.slice(6) + "&sz=w400";
  return s;
}
function decodeDataUrl_(dataUrl) {
  var m = String(dataUrl || "").match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
  return m ? { mime: m[1], bytes: Utilities.base64Decode(m[2]) } : null;
}

/* ---------------- GET ---------------- */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "sessions";

  if (action === "sessions") {
    var sessions = mapSessions_(rows_("sessions", SESSION_FIELDS));
    var roster = rows_("roster", ROSTER_FIELDS);
    return json_({ sessions: withCounts_(sessions, roster) });
  }

  if (action === "session") {
    var id = e.parameter.id;
    var s = mapSessions_(rows_("sessions", SESSION_FIELDS)).filter(function (r) { return String(r.id) === String(id); })[0];
    var rosterRows = rows_("roster", ROSTER_FIELDS)
      .filter(function (r) { return String(r.sessionId) === String(id); })
      .sort(function (a, b) { return (+a.seq || 0) - (+b.seq || 0); })
      .map(function (r) { r.signature = resolveSignature_(r.signature); return r; });
    return json_({ session: s, roster: rosterRows });
  }

  if (action === "allRoster") {
    var all = rows_("roster", ROSTER_FIELDS).map(function (r) { r.signature = resolveSignature_(r.signature); return r; });
    return json_({ roster: all });
  }

  if (action === "photos") {
    var sid = e.parameter.id;
    var photos = rows_("photos", PHOTO_FIELDS).filter(function (p) { return String(p.sessionId) === String(sid); })
      .sort(function (a, b) { return a.uploadedAt < b.uploadedAt ? 1 : -1; });
    return json_({ photos: photos });
  }

  if (action === "rootFolder") return json_({ url: rootFolder_().getUrl() });

  return json_({ error: "unknown action" });
}

function mapSessions_(list) {
  return list.map(function (r) {
    r.date = fmtDate_(r.date);
    r.locked = boolOf_(r.locked);
    return r;
  });
}

function withCounts_(sessions, roster) {
  return sessions.map(function (s) {
    var rows = roster.filter(function (r) { return String(r.sessionId) === String(s.id); });
    var signed = rows.filter(function (r) { return !!r.signature; }).length;
    s.total = rows.length;
    s.signed = signed;
    return s;
  });
}

/* ---------------- POST ---------------- */
function doPost(e) {
  var data = {};
  try { data = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: "bad json" }); }
  var action = data.action || "add";

  if (data.type === "session") return handleSession_(action, data);
  if (data.type === "roster") return handleRoster_(action, data);
  if (data.type === "photo") return handlePhoto_(action, data);
  return json_({ ok: false, error: "unknown type" });
}

function sessionValuesObj_(data) {
  return {
    id: data.id, date: data.date || "", category: data.category || "",
    title: data.title || "", locked: !!data.locked
  };
}

function handleSession_(action, data) {
  var sh = sheet_("sessions", SESSION_FIELDS);

  if (action === "add") {
    var id = Utilities.getUuid();
    var obj = sessionValuesObj_(Object.assign({}, data, { id: id }));
    obj.createdAt = new Date().toISOString();
    upsertRowByHeader_(sh, id, obj);
    return json_({ ok: true, id: id });
  }
  if (action === "update") {
    upsertRowByHeader_(sh, data.id, sessionValuesObj_(data));
    return json_({ ok: true, id: data.id });
  }
  if (action === "lock") {
    upsertRowByHeader_(sh, data.id, { id: data.id, locked: !!data.locked });
    return json_({ ok: true });
  }
  if (action === "delete") {
    deleteRowById_(sh, data.id);
    var rsh = sheet_("roster", ROSTER_FIELDS);
    rows_("roster", ROSTER_FIELDS).forEach(function (r) {
      if (String(r.sessionId) === String(data.id)) deleteRowById_(rsh, r.id);
    });
    var psh = sheet_("photos", PHOTO_FIELDS);
    rows_("photos", PHOTO_FIELDS).forEach(function (p) {
      if (String(p.sessionId) === String(data.id)) deleteRowById_(psh, p.id);
    });
    return json_({ ok: true });
  }
  return json_({ ok: false, error: "unknown action" });
}

function handleRoster_(action, data) {
  var sh = sheet_("roster", ROSTER_FIELDS);

  if (action === "bulkAdd") {
    var existing = rows_("roster", ROSTER_FIELDS).filter(function (r) { return String(r.sessionId) === String(data.sessionId); });
    var maxSeq = existing.reduce(function (m, r) { return Math.max(m, +r.seq || 0); }, 0);
    (data.rows || []).forEach(function (row, i) {
      var id = Utilities.getUuid();
      sh.appendRow(headerRow_(sh).map(function (h) {
        var obj = { id: id, sessionId: data.sessionId, seq: maxSeq + i + 1, dept: row.dept || "", name: row.name, signature: "", signedAt: "" };
        return obj.hasOwnProperty(h) ? obj[h] : "";
      }));
    });
    return json_({ ok: true });
  }
  if (action === "update") {
    upsertRowByHeader_(sh, data.id, { id: data.id, dept: data.dept || "", name: data.name || "" });
    return json_({ ok: true });
  }
  if (action === "sign") {
    var sig = data.signature || "";
    var stored = sig;
    if (sig.length > SIGNATURE_INLINE_LIMIT) {
      var decoded = decodeDataUrl_(sig);
      if (decoded) {
        var blob = Utilities.newBlob(decoded.bytes, decoded.mime, "sign_" + data.id + ".png");
        var file = signFolder_().createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        stored = "drive:" + file.getId();
      }
    }
    upsertRowByHeader_(sh, data.id, { id: data.id, signature: stored, signedAt: new Date().toISOString() });
    return json_({ ok: true });
  }
  if (action === "delete") {
    deleteRowById_(sh, data.id);
    return json_({ ok: true });
  }
  return json_({ ok: false, error: "unknown action" });
}

function handlePhoto_(action, data) {
  var sh = sheet_("photos", PHOTO_FIELDS);

  if (action === "add") {
    var decoded = decodeDataUrl_(data.dataUrl);
    if (!decoded) return json_({ ok: false, error: "invalid image" });

    var session = rows_("sessions", SESSION_FIELDS).filter(function (s) { return String(s.id) === String(data.sessionId); })[0] || { id: data.sessionId };
    var folder = sessionFolder_(session);
    var blob = Utilities.newBlob(decoded.bytes, decoded.mime, data.filename || ("photo_" + Date.now() + ".jpg"));
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var url = "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w600";
    var id = Utilities.getUuid();
    upsertRowByHeader_(sh, id, { id: id, sessionId: data.sessionId, fileId: file.getId(), url: url, uploadedAt: new Date().toISOString() });

    var ssh = sheet_("sessions", SESSION_FIELDS);
    upsertRowByHeader_(ssh, data.sessionId, { id: data.sessionId, driveFolderUrl: folder.getUrl() });

    return json_({ ok: true, id: id, url: url, folderUrl: folder.getUrl() });
  }
  if (action === "delete") {
    var row = rows_("photos", PHOTO_FIELDS).filter(function (p) { return p.id === data.id; })[0];
    if (row && row.fileId) { try { DriveApp.getFileById(row.fileId).setTrashed(true); } catch (err) {} }
    deleteRowById_(sh, data.id);
    return json_({ ok: true });
  }
  return json_({ ok: false, error: "unknown action" });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
