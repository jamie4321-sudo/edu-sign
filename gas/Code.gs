/**
 * EDU SIGN — Google Apps Script 백엔드
 * =====================================================
 * 하나의 Google 시트에 교육 세션 · 참석자 명단(서명 포함)을 저장/조회합니다.
 * 정적 사이트(GitHub Pages / Vercel)에서 fetch 로 호출합니다.
 *
 * 시트 탭 (없으면 자동 생성, 필드가 늘어나면 끝에 컬럼을 자동 추가):
 *  - "sessions" : id | date | category | title | locked | createdAt
 *  - "roster"   : id | sessionId | seq | dept | name | signature | signedAt
 *                 (signature = base64 PNG dataURL, 서명 전에는 빈 문자열)
 *
 * 읽기/쓰기 모두 "컬럼 순서"가 아니라 "헤더 이름"으로 매칭합니다.
 *
 * 배포: 배포 > 배포 관리 > 기존 배포 수정 > 새 버전으로 배포
 *   - 실행 계정: 나 / 액세스 권한: 모든 사용자
 * 배포 후 /exec URL 을 js/config.js 의 CONFIG.endpoint 에 붙여넣으세요.
 * sign.html 에는 로그인/PIN 이 없으므로, 참석자는 세션 링크만으로 서명 API를 호출합니다.
 */

var SESSION_FIELDS = ["id", "date", "category", "title", "locked", "createdAt"];
var ROSTER_FIELDS = ["id", "sessionId", "seq", "dept", "name", "signature", "signedAt"];

// 이 스프레드시트 ID를 새로 만든 시트 ID로 바꿔주세요 (시트 URL의 /d/ 와 /edit 사이 문자열)
var SHEET_ID = "여기에_새_스프레드시트_ID를_붙여넣으세요";

function ss_() { return SHEET_ID && SHEET_ID.indexOf("여기에") !== 0 ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet(); }

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
      .sort(function (a, b) { return (+a.seq || 0) - (+b.seq || 0); });
    return json_({ session: s, roster: rosterRows });
  }

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
    upsertRowByHeader_(sh, data.id, { id: data.id, signature: data.signature || "", signedAt: new Date().toISOString() });
    return json_({ ok: true });
  }
  if (action === "delete") {
    deleteRowById_(sh, data.id);
    return json_({ ok: true });
  }
  return json_({ ok: false, error: "unknown action" });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
