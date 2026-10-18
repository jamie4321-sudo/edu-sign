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
 * 교육 사진은 지정된 드라이브 폴더(ROOT_FOLDER_ID) 아래, 세션별로 "날짜 제목"
 * 이름의 하위 폴더를 만들어 저장합니다 — 폴더는 첫 업로드 시 자동 생성됩니다.
 *
 * 읽기/쓰기 모두 "컬럼 순서"가 아니라 "헤더 이름"으로 매칭합니다.
 *
 * 배포: 배포 > 배포 관리 > 기존 배포 수정 > 새 버전으로 배포
 *   - 실행 계정: 나 / 액세스 권한: 모든 사용자
 * 배포 후 /exec URL 을 js/config.js 의 CONFIG.endpoint 에 넣고, CONFIG.apiKey 는
 * 아래 API_KEY 와 동일하게 맞춰야 합니다. 공개 저장소라 endpoint 가 노출되므로,
 * API_KEY 가 일치하는 요청만 처리해 무단 접근을 차단합니다.
 */

var SESSION_FIELDS = ["id", "date", "category", "title", "locked", "createdAt", "driveFolderUrl"];
var ROSTER_FIELDS = ["id", "sessionId", "seq", "dept", "name", "signature", "signedAt"];
var PHOTO_FIELDS = ["id", "sessionId", "fileId", "url", "uploadedAt"];

var ROOT_FOLDER_ID = "1sMragUccF7GxuTTa3htR6L1e1wdT4i-x"; // 교육 사진이 쌓이는 지정 드라이브 폴더
var PDF_FOLDER_ID = "1HRfsg1iQVrlkZY9dvpnfZRWHqFZRV4w4";  // 교육 자료 PDF 가 쌓이는 드라이브 폴더 (파트별 하위 폴더 자동 생성)
var SIGN_FOLDER_NAME = "EDU SIGN 서명원본";
var SIGNATURE_INLINE_LIMIT = 8000; // 이보다 긴 서명 dataURL은 드라이브에 저장하고 참조만 남김

// 새로 만든 스프레드시트 ID
var SHEET_ID = "1tqD6P2IcfuIaIDGaPz2aOWst_5XPD1mH81VNFkBzrBY";

// 접근 키 — 클라이언트(config.js)의 apiKey 와 반드시 동일해야 합니다.
// 공개 저장소라 endpoint 가 노출되므로, 이 키가 일치하는 요청만 처리해
// URL 만 아는 무단 접근을 차단합니다. (키를 바꾸려면 여기와 config.js 를 함께 교체 후 재배포)
var API_KEY = "sg-edusign-ydAMyHruYjli1O7kQgRgCZMcBboEC";
function keyOK_(provided) { return String(provided || "") === API_KEY; }

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
function normName_(v) { return String(v == null ? "" : v).trim().toLowerCase(); }

/* ---------------- 드라이브 폴더 ---------------- */
function rootFolder_() {
  return DriveApp.getFolderById(ROOT_FOLDER_ID);
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
  if (!keyOK_(e && e.parameter && e.parameter.key)) return json_({ error: "unauthorized" });
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
  if (!keyOK_(data.key)) return json_({ ok: false, error: "unauthorized" });
  var action = data.action || "add";

  if (data.type === "session") return handleSession_(action, data);
  if (data.type === "roster") return handleRoster_(action, data);
  if (data.type === "photo") return handlePhoto_(action, data);
  if (data.type === "pdf") return handlePdf_(action, data);
  if (data.type === "ai") return handleAi_(action, data);
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
    // 같은 세션에 이미 있는 이름은 다시 추가하지 않는다(이름 기준 중복 제거).
    // 들어온 배치 안의 중복도 함께 제거 → 명단이 무한히 늘어나지 않도록.
    var seen = {};
    existing.forEach(function (r) { seen[normName_(r.name)] = true; });
    var added = 0, skipped = 0;
    (data.rows || []).forEach(function (row) {
      var key = normName_(row.name);
      if (!key || seen[key]) { skipped++; return; }
      seen[key] = true;
      maxSeq += 1;
      var id = Utilities.getUuid();
      var seq = maxSeq;
      sh.appendRow(headerRow_(sh).map(function (h) {
        var obj = { id: id, sessionId: data.sessionId, seq: seq, dept: row.dept || "", name: row.name, signature: "", signedAt: "" };
        return obj.hasOwnProperty(h) ? obj[h] : "";
      }));
      added++;
    });
    return json_({ ok: true, added: added, skipped: skipped });
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

/* ---------------- 교육 자료 PDF → 드라이브 ----------------
   같은 자료(materialId)의 예전 PDF 는 휴지통으로 보내고 새 PDF 하나만 남긴다 (제목이 바뀌어도 같은 자료로 인식) */
function handlePdf_(action, data) {
  if (action !== "save") return json_({ ok: false, error: "unknown action" });
  var m = String(data.dataUrl || "").match(/^data:application\/pdf;base64,(.*)$/);
  if (!m) return json_({ ok: false, error: "invalid pdf" });
  var root = DriveApp.getFolderById(PDF_FOLDER_ID);
  var sub = String(data.folder || "").trim(), folder = root;
  if (sub) { var it = root.getFoldersByName(sub); folder = it.hasNext() ? it.next() : root.createFolder(sub); }
  var tag = "edu-material:" + String(data.materialId || "");
  if (data.materialId) {
    var files = folder.getFiles();
    while (files.hasNext()) { var f = files.next(); if (f.getDescription() === tag) f.setTrashed(true); }
  }
  var name = String(data.name || "교육자료.pdf").replace(/[\\\/:*?"<>|]/g, "_");
  var file = folder.createFile(Utilities.newBlob(Utilities.base64Decode(m[1]), "application/pdf", name));
  file.setDescription(tag);
  return json_({ ok: true, url: file.getUrl(), folderUrl: folder.getUrl(), name: name });
}

/* ---------------- PDF → 쉬운 말 교육 단계 (Gemini) ----------------
 * 사이트에서 PDF(또는 쪽별 글)를 보내면, 크루가 보기 쉬운 말로 최대 9단계 교육 순서를 만들어 돌려준다.
 * 키: Apps Script > 프로젝트 설정 > 스크립트 속성 GEMINI_API_KEY (aistudio.google.com/apikey)
 * 키가 없거나 실패하면 사이트가 스스로 만든 초안을 쓴다.
 */
// 모델: 앞에서부터 시도하고, 없어진 모델(404)이면 다음 것으로. 바꾸고 싶으면 스크립트 속성 GEMINI_MODEL 에 이름을 넣는다.
// gemini-flash-latest = 늘 최신 Flash 를 가리키는 이름이라 모델이 없어져도 코드를 안 고쳐도 된다.
var AI_MODELS = ["gemini-flash-latest", "gemini-3.8-flash", "gemini-2.5-flash"];
function gemini_(key, body) {
  var props = PropertiesService.getScriptProperties(), pref = props.getProperty("GEMINI_MODEL");
  var models = (pref ? [pref] : []).concat(AI_MODELS), tried = [], res = null;
  var call = function (m) {
    tried.push(m);
    return UrlFetchApp.fetch("https://generativelanguage.googleapis.com/v1beta/models/" + m + ":generateContent?key=" + encodeURIComponent(key),
      { method: "post", contentType: "application/json", payload: JSON.stringify(body), muteHttpExceptions: true });
  };
  for (var i = 0; i < models.length; i++) {
    res = call(models[i]);
    if (res.getResponseCode() !== 404) return { res: res, model: models[i], tried: tried };
  }
  // 다 없으면: 이 키로 쓸 수 있는 모델 목록에서 Flash 를 골라 쓰고, 찾은 이름을 GEMINI_MODEL 에 기억
  var found = availableFlash_(key, tried);
  for (var k = 0; k < found.length; k++) {
    res = call(found[k]);
    if (res.getResponseCode() !== 404) { if (res.getResponseCode() === 200) props.setProperty("GEMINI_MODEL", found[k]); return { res: res, model: found[k], tried: tried }; }
  }
  return { res: res, model: tried[tried.length - 1], tried: tried };
}
function availableFlash_(key, skip) {
  try {
    var r = UrlFetchApp.fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=" + encodeURIComponent(key), { muteHttpExceptions: true });
    if (r.getResponseCode() !== 200) return [];
    return (JSON.parse(r.getContentText()).models || []).filter(function (m) {
      var n = String(m.name || "").replace(/^models\//, "");
      return (m.supportedGenerationMethods || []).indexOf("generateContent") >= 0 && /flash/.test(n) && !/lite|image|tts|live|audio|thinking|exp/.test(n) && skip.indexOf(n) < 0;
    }).map(function (m) { return String(m.name).replace(/^models\//, ""); })
      .sort(function (a, b) { return b.localeCompare(a, "en", { numeric: true }); }).slice(0, 4);
  } catch (e) { return []; }
}
// 편집기에서 ▶ 실행: 바깥 요청 권한을 받고, GEMINI_API_KEY 가 맞는지 확인한다 (실행 로그에 결과)
function testGemini() {
  var key = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  if (!key) { Logger.log("❌ 스크립트 속성에 GEMINI_API_KEY 가 없어요"); return; }
  var g = gemini_(key, { contents: [{ role: "user", parts: [{ text: "'안녕하세요'라고만 답해 줘" }] }] });
  Logger.log(g.res.getResponseCode() === 200 ? "✅ 연결 성공 (모델 " + g.model + ")" : "❌ " + g.res.getResponseCode() + " (시도한 모델: " + g.tried.join(", ") + ") " + g.res.getContentText().slice(0, 300));
}
function handleAi_(action, data) {
  var key = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  if (!key) return json_({ ok: false, error: "no key" });
  var max = Math.min(Number(data.maxSteps) || 9, 9);
  var topics = (data.topics || []).join(", ");
  var prompt = [
    "너는 글을 읽고 이해하는 데 도움이 필요한 크루에게 현장 업무를 가르치는 교육 담당자야.",
    "첨부한 교육 자료(PDF)를 읽고, 크루가 휴대폰이나 큰 화면에서 한 단계씩 보며 따라 할 수 있는 교육 순서를 만들어.",
    "",
    "규칙:",
    "- 단계는 " + max + "개 이하(10개 미만). 자료가 짧으면 더 적게. 꼭 필요한 순서만 남기고 비슷한 내용은 합쳐.",
    "- 단계 설명(text)은 아주 쉬운 말로 1~2문장, 40자 안팎(최대 70자). 한 문장에 한 가지 행동만.",
    "- '~해요' 존댓말. 어려운 한자어·외래어·전문 용어는 쉬운 말로 바꿔. 꼭 써야 하는 이름(장비 이름 등)은 그대로.",
    "- 숫자·시간·횟수는 구체적으로(예: '물을 컵 1개만큼 줘요').",
    "- 띄어쓰기와 맞춤법을 한국어 표준에 맞게 바르게 써. PDF에서 뽑은 글은 띄어쓰기가 깨져 있을 수 있으니(예: '실 시합니다', '분무기를사용') 그대로 옮기지 말고 고쳐서 써. 제목·한 줄 설명·주의도 똑같이.",
    "- 주의(warn)는 다치거나 망가질 수 있는 것만 짧게 한 문장(최대 40자). 없으면 빈 문자열.",
    "- page 는 그 단계에 가장 잘 맞는 그림이 있는 PDF 쪽 번호(1부터). 표지 쪽은 고르지 마. 같은 쪽을 여러 번 써도 돼.",
    "- title: 자료 제목(20자 이내, 쉬운 말). summary: 이 교육으로 무엇을 배우는지 한 문장(40자 이내).",
    "- topic: 다음 중 가장 맞는 것 하나 — " + topics,
    "- 자료에 없는 내용은 지어내지 마.",
    "- 크루의 특성이나 크루를 부르는 말은 쓰지 말고, 할 일만 써."
  ].join("\n");
  var parts = [{ text: prompt }];
  if (data.pdf) parts.push({ inline_data: { mime_type: "application/pdf", data: String(data.pdf).replace(/^data:[^,]*,/, "") } });
  if (data.pagesText) parts.push({ text: "쪽별 글(PDF에서 뽑은 것):\n" + String(data.pagesText).slice(0, 60000) });
  var schema = {
    type: "OBJECT",
    properties: {
      title: { type: "STRING" }, summary: { type: "STRING" }, topic: { type: "STRING" },
      steps: { type: "ARRAY", items: { type: "OBJECT", properties: { page: { type: "INTEGER" }, text: { type: "STRING" }, warn: { type: "STRING" } }, required: ["page", "text", "warn"] } }
    },
    required: ["title", "summary", "topic", "steps"]
  };
  var body = { contents: [{ role: "user", parts: parts }],
    generationConfig: { temperature: 0.3, responseMimeType: "application/json", responseSchema: schema } };
  try {
    var g = gemini_(key, body), res = g.res;
    var code = res.getResponseCode();
    if (code !== 200) return json_({ ok: false, error: "gemini " + code, tried: g.tried, detail: res.getContentText().slice(0, 300) });
    var out = JSON.parse(res.getContentText());
    var txt = out.candidates && out.candidates[0] && out.candidates[0].content && out.candidates[0].content.parts.map(function (p) { return p.text || ""; }).join("");
    var r = JSON.parse(txt);
    r.steps = (r.steps || []).slice(0, max);
    return json_({ ok: true, result: r, model: g.model });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
