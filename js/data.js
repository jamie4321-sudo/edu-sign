/* 데모 모드 목업 데이터 — 시트 헤더와 1:1
   sessions : id | date | category | title | locked | createdAt
   roster   : id | sessionId | seq | dept | name | signature | signedAt */

window.SESSIONS = [
  { id: "sess1", date: "2026-07-15", category: "산업안전보건교육", title: "7월 정기 안전교육", locked: false, createdAt: "2026-07-14T09:00:00" },
  { id: "sess2", date: "2026-06-10", category: "장애인 인식개선교육", title: "6월 장애인식개선교육", locked: true, createdAt: "2026-06-08T09:00:00" },
];

window.ROSTER = [
  { id: "r1", sessionId: "sess1", seq: 1, dept: "스낵", name: "정배라", signature: "", signedAt: "" },
  { id: "r2", sessionId: "sess1", seq: 2, dept: "가든", name: "한카렌", signature: "", signedAt: "" },
  { id: "r3", sessionId: "sess1", seq: 3, dept: "스낵", name: "오미라", signature: "", signedAt: "" },
  { id: "r4", sessionId: "sess1", seq: 4, dept: "가든", name: "신엔조", signature: "", signedAt: "" },
  { id: "r5", sessionId: "sess1", seq: 5, dept: "스낵", name: "강아라", signature: "", signedAt: "" },

  { id: "r6", sessionId: "sess2", seq: 1, dept: "스낵", name: "정배라",
    signature: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iNDAiPjxwYXRoIGQ9Ik01IDMwIFEgMzAgNSA2MCAyNSBUIDExNSAxNSIgc3Ryb2tlPSIjMTExIiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjwvc3ZnPg==",
    signedAt: "2026-06-10T10:04:00" },
  { id: "r7", sessionId: "sess2", seq: 2, dept: "가든", name: "한카렌",
    signature: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iNDAiPjxwYXRoIGQ9Ik01IDMwIFEgMzAgNSA2MCAyNSBUIDExNSAxNSIgc3Ryb2tlPSIjMTExIiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjwvc3ZnPg==",
    signedAt: "2026-06-10T10:05:30" },
  { id: "r8", sessionId: "sess2", seq: 3, dept: "스낵", name: "오미라", signature: "", signedAt: "" },
];

/* 데모 모드용 사진 목록 — 라이브 모드에서는 구글 드라이브에 실제로 저장됨 */
window.PHOTOS = [];
