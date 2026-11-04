/* =========================================================
   중증장애인턴제 출석 — 데이터 · 기준값 · 집계 · 출퇴근 기록부(PDF) 양식
   ---------------------------------------------------------
   예전 구글 출퇴근부(Apps Script)의 모든 항목을 그대로 옮김.
   표: supabase/intern.sql (intern_profiles · intern_days · intern_notes)
   ?demo=1 이거나 Supabase 설정이 없으면 브라우저(localStorage) 데모.
   관리자 화면 = js/intern-admin.js · 인턴 서명 화면 = js/intern-crew.js · 출력 = intern-print.html
   ========================================================= */
window.Intern = (function () {
  "use strict";
  var DEMO = /[?&]demo=1(&|$)/.test(location.search);
  var SUPA = !DEMO && !!(window.CONFIG && CONFIG.supabase && CONFIG.supabase.url && CONFIG.supabase.anonKey && window.supabase);
  var LS_KEY = "edusign-intern-demo-v1";

  function p2(n) { return ("0" + n).slice(-2); }
  function dk(d) { return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()); }
  function today() { return dk(new Date()); }
  function uid() { return "n" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var DOW = ["일", "월", "화", "수", "목", "금", "토"];
  function parse(key) { var p = String(key).split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function dayLabel(key) { var d = parse(key); return (d.getMonth() + 1) + "/" + d.getDate() + "(" + DOW[d.getDay()] + ")"; }
  function isWeekend(key) { var w = parse(key).getDay(); return w === 0 || w === 6; }

  /* ---------------- 기준값 (원본 그대로) ---------------- */
  var STATUS = {
    normal:  { label: "정상 출근", short: "정상출근", sub: "07:00 ~ 16:00 근무" },
    absence: { label: "결근", short: "결근", sub: "미출근 · 무단결근" },
    paid:    { label: "유급 휴일", short: "유급휴일", sub: "연차 · 반차" },
    alt:     { label: "대체 공휴일", short: "대체공휴일", sub: "대체 휴가" }
  };
  var HALF = { full: { label: "종일", inT: "07:00", outT: "16:00" }, am: { label: "오전 반차", inT: "07:00", outT: "11:00" }, pm: { label: "오후 반차", inT: "12:00", outT: "16:00" } };

  var PROB_WEEKS = [
    { week: 1, title: "적응 & 환경 파악", sub: "5/18(월) ~ 5/22(금)", icon: "👋", groups: [
      { label: "첫날 OT", items: [
        { id: "p01", title: "팀원 크루들과 인사 나누기", desc: "아지트 전체 크루 소개 및 서로 인사. 이름 외우기!", tags: ["meeting"] },
        { id: "p02", title: "현장 라운딩 — 담당 구역 파악", desc: "아지트 전체 조경 구역 동선 확인. 주요 식물 위치 파악", tags: ["practice"] }] },
      { label: "공간 & 도구 이해", items: [
        { id: "p03", title: "휴게실 · 면담실 위치 확인", desc: "편의 공간 이용 방법, 개인 사물함 배정", tags: ["meeting"] },
        { id: "p04", title: "카페 / 오아시스 이용 방법 숙지", desc: "음료 주문 방법 안내", tags: ["theory"] },
        { id: "p05", title: "관리 도구 종류 파악 및 보관 위치 확인", desc: "가위·전정가위·물뿌리개·분무기·걸레 등 도구별 용도 설명", tags: ["practice", "theory"] },
        { id: "p06", title: "관리 도구 사용법 기초 교육", desc: "올바른 사용법, 안전 수칙, 사용 후 세척 및 보관 방법", tags: ["practice", "safety"] }] },
      { label: "안전 교육", items: [
        { id: "p07", title: "기초 안전 교육 이수", desc: "미끄럼 방지, 날카로운 도구 취급, 약품 기초 안전", tags: ["safety", "theory"] }] }] },
    { week: 2, title: "기초 관리 실습", sub: "5/25(월) ~ 5/29(금)", icon: "💧", groups: [
      { label: "관수 실습", items: [
        { id: "p10", title: "식물별 관수 주기 & 수분 확인법", desc: "손가락 토양 테스트, 수분 확인 도구(사과씨칼) 사용법. 과습 · 물 부족 증상 구별", tags: ["theory", "practice"] },
        { id: "p11", title: "관수 실습 — 실내 화분", desc: "화분 크기별 물 양 조절. 배수 확인 후 받침대 물 제거", tags: ["practice"] },
        { id: "p12", title: "관수 실습 — 실외 · 화단", desc: "호스 사용법, 물 압력 조절, 잎에 직접 닿지 않게 관수, 토양 가까이 관수", tags: ["practice"] }] },
      { label: "정리정돈 습관", items: [
        { id: "p13", title: "관리 완료 후 정리정돈 루틴 습득", desc: "도구 세척 → 건조 → 제자리 보관. 작업 공간 청결 유지", tags: ["practice"] },
        { id: "p14", title: "낙엽 및 고사 잎 제거 실습", desc: "핀셋·작은 가위 사용법. 식물 스트레스 최소화하며 제거", tags: ["practice"] },
        { id: "p15", title: "화분 외부 닦기 & 주변 정리", desc: "화분 몸통·받침 청소. 선반 먼지 제거, 진열 정돈", tags: ["practice"] }] },
      { label: "기록 & 소통", items: [
        { id: "p16", title: "출퇴근 기록 앱 숙지", desc: "이 앱으로 매일 기록하는 법. 서명까지 완료하는 습관 만들기", tags: ["theory"] }] }] },
    { week: 3, title: "심화 관리 실습", sub: "6/1(월) ~ 6/5(금)", icon: "🌿", groups: [
      { label: "방제 실습", items: [
        { id: "p20", title: "해충 · 병해 기초 식별법", desc: "응애·깍지벌레·흰가루병 등 주요 병해충 육안 확인법", tags: ["theory"] },
        { id: "p21", title: "방제 약품 종류 및 희석 방법", desc: "친환경 약제 vs 화학 약제 구분, 안전한 희석 비율, 개인보호장구 착용", tags: ["theory", "safety"] },
        { id: "p22", title: "분무기 이용 방제 실습", desc: "잎 앞뒷면 고르게 분사, 환기 후 작업, 분무 후 도구 세척", tags: ["practice", "safety"] }] },
      { label: "잎 세정 실습", items: [
        { id: "p23", title: "잎 세정(광택) 작업 이론", desc: "세정이 필요한 식물 종류, 올바른 약제 사용방법, 주의 식물 목록", tags: ["theory"] },
        { id: "p24", title: "잎 세정 실습 — 대엽식물 중심", desc: "몬스테라·고무나무 등 대엽종 잎 닦기. 결 방향으로 부드럽게", tags: ["practice"] },
        { id: "p25", title: "광택제 도포 실습", desc: "적정량 조절, 과도 도포 시 문제점, 완료 후 외관 점검", tags: ["practice"] }] },
      { label: "식물 건강 체크", items: [
        { id: "p26", title: "주간 식물 상태 점검표 작성", desc: "이상 징후 식물 기록, 교체 필요 여부 보고 방법 숙지", tags: ["practice", "theory"], action: "plant" }] }] },
    { week: 4, title: "평가 & 면담", sub: "6/8(월) ~ 6/13(토)", icon: "📋", groups: [
      { label: "중간 점검", items: [
        { id: "p30", title: "교육 스탭 적응 면담", desc: "수습 동안 배운 내용 점검, 어려운 점 이야기, 추가 지원 사항 논의", tags: ["meeting", "eval"] },
        { id: "p31", title: "자기 평가 체크리스트 작성", desc: "관수·방제·세정·정리정돈 각 항목 자기 점수 기입", tags: ["eval"], action: "self" }] },
      { label: "팀리더 면담", items: [
        { id: "p32", title: "팀리더 면담", desc: "수습 전반 피드백, 정규 배치 구역 확정, 향후 역할 논의", tags: ["meeting", "eval"] },
        { id: "p33", title: "업무 수행 평가 진행", desc: "관수·방제·세정 3개 항목. 평가 결과 즉시 피드백", tags: ["eval", "practice"], action: "work" }] },
      { label: "마무리", items: [
        { id: "p34", title: "수습 총정리 & 소감 나누기", desc: "크루 전체와 함께 소감 공유. 잘한 점·아쉬운 점 솔직하게 이야기", tags: ["meeting"] },
        { id: "p35", title: "정규 배치 후 스캐줄표 전달", desc: "멘토 엘리에게 최종 확인", tags: ["meeting"] }] }] }
  ];
  var TAGS = { practice: "실습", theory: "이론", eval: "평가", meeting: "면담", safety: "안전" };
  var ROUTINE = [
    { dow: "월요일", icon: "🌅", items: ["🪴 전체 구역 식물 상태 점검", "💧 주간 관수 시작 (수분 확인)", "🗒️ 주간 업무 계획 확인"] },
    { dow: "화 · 수요일", icon: "✂️", items: ["🌿 관수 및 낙엽 · 고사 잎 제거", "✨ 잎 세정 (광택) 작업", "🧹 화분 외부 · 선반 정리"] },
    { dow: "목요일", icon: "🔬", items: ["🐛 병해충 순찰 · 방제 (격주)", "📋 이상 식물 교체 요청 보고", "🌱 신규 식물 배치 지원"] },
    { dow: "금요일", icon: "📝", items: ["🧹 주간 마무리 정리정돈", "📊 주간 식물 상태 기록 완료", "💬 멘토 엘리와 주간 소통"] }
  ];
  var ROUTINE_NOTE = "위 스케줄은 기본 루틴이며, 실제 업무는 팀리더 면담 후 확정된 담당 구역과 주간 스케줄에 따라 진행됩니다. 계절·날씨·행사에 따라 유동적으로 조정될 수 있어요.";
  var SE_ITEMS = [
    { id: "se1", cat: "관수", title: "관수 — 식물별 수분 확인 및 관수", desc: "토양 수분 확인 → 적정량 관수 → 배수 확인까지 혼자 할 수 있어요" },
    { id: "se2", cat: "관수", title: "관수 — 화분 크기별 물 양 조절", desc: "소형·중형·대형 화분에 맞는 물 양을 감각적으로 조절할 수 있어요" },
    { id: "se3", cat: "정리", title: "정리정돈 — 작업 후 도구 세척·보관", desc: "사용한 도구를 세척하고 제자리에 정돈하는 루틴이 몸에 배었어요" },
    { id: "se4", cat: "정리", title: "정리정돈 — 낙엽·고사 잎 제거", desc: "식물에 스트레스 없이 고사 잎을 제거할 수 있어요" },
    { id: "se5", cat: "방제", title: "방제 — 병해충 육안 식별", desc: "응애·깍지벌레 등 주요 병해충을 직접 발견할 수 있어요" },
    { id: "se6", cat: "방제", title: "방제 — 약제 희석 및 분무기 사용", desc: "안전하게 약제를 희석하고 잎 앞뒷면에 고르게 분사할 수 있어요" },
    { id: "se7", cat: "세정", title: "잎 세정 — 광택 작업", desc: "대엽 식물 잎을 결 방향으로 부드럽게 닦고 광택을 낼 수 있어요" },
    { id: "se8", cat: "소통", title: "소통 — 이상 징후 보고", desc: "식물의 이상 징후를 발견하면 멘토에게 적시에 보고할 수 있어요" }
  ];
  var SE_LABELS = ["", "못 하겠어요", "조금 할 수 있어요", "할 수 있어요", "잘 할 수 있어요", "완벽해요!"];
  var WE_ITEMS = [
    { id: "we1", cat: "🌊 관수", title: "관수 정확성", desc: "식물별 적정 수분을 확인하고 적절한 양으로 관수한다" },
    { id: "we2", cat: "🌊 관수", title: "관수 후 처리", desc: "배수 확인 및 받침대 물 제거, 작업 후 도구 정리를 빠짐없이 한다" },
    { id: "we3", cat: "🌿 잎 관리", title: "고사 잎 제거", desc: "식물에 스트레스를 주지 않고 자연스럽게 고사 잎을 제거한다" },
    { id: "we4", cat: "🌿 잎 관리", title: "잎 세정 및 광택", desc: "잎의 결 방향으로 부드럽게 닦고 균일한 광택을 낸다" },
    { id: "we5", cat: "🐛 방제", title: "병해충 식별 능력", desc: "육안으로 주요 병해충(응애·깍지벌레 등)을 발견하고 구별한다" },
    { id: "we6", cat: "🐛 방제", title: "방제 작업 안전", desc: "약제를 안전하게 희석하고 보호 장구를 착용하여 방제한다" },
    { id: "we7", cat: "🧹 정리정돈", title: "작업 후 정리", desc: "사용 도구 세척·보관, 작업 공간 청결 유지를 습관적으로 한다" },
    { id: "we8", cat: "💬 소통·보고", title: "이상 징후 보고", desc: "식물 이상 징후를 발견 시 즉시 담당자에게 보고한다" },
    { id: "we9", cat: "💬 소통·보고", title: "출퇴근 기록 성실도", desc: "매일 빠짐없이 출퇴근 기록 및 서명을 완료한다" }
  ];
  var WE_LABELS = { 1: "🔴 미흡", 2: "🟡 보통", 3: "🟢 양호", 4: "⭐ 우수", 5: "🏆 탁월" };
  function weSummary(scores) {
    var done = WE_ITEMS.filter(function (i) { return scores && scores[i.id]; });
    if (!done.length) return null;
    var avg = done.reduce(function (s, i) { return s + scores[i.id]; }, 0) / done.length;
    var grade = avg >= 4.5 ? "탁월" : avg >= 3.5 ? "우수" : avg >= 2.5 ? "양호" : avg >= 1.5 ? "보통" : "미흡";
    var icon = avg >= 4.5 ? "🏆" : avg >= 3.5 ? "⭐" : avg >= 2.5 ? "🟢" : avg >= 1.5 ? "🟡" : "🔴";
    return { count: done.length, total: WE_ITEMS.length, avg: avg, grade: grade, icon: icon };
  }
  var MEMO_CATS = [
    { key: "plant", label: "🌿 식물 관찰", ex: "1층 로비 몬스테라 잎 뒷면에 흰 점들이 보임. 엘리 멘토한테 물어보니 깍지벌레 초기 증상일 수 있다고 해서 다음주 방제 때 집중 관찰 예정." },
    { key: "learn", label: "💡 배운 것", ex: "관수할 때 잎에 물이 닿으면 햇빛에 렌즈 역할을 해서 잎이 탈 수 있다는 걸 오늘 처음 알았다. 특히 직사광선이 드는 창가 식물 관수 시 주의!" },
    { key: "question", label: "❓ 궁금한 것", ex: "산세베리아가 다른 식물보다 물을 훨씬 적게 줘야 하는 이유가 뭔지? 건조한 환경에서 자라는 식물이라 과습에 약하다고 하는데 정확한 주기를 엘리한테 물어봐야겠다." },
    { key: "mistake", label: "🔧 실수 & 개선", ex: "광택제를 너무 많이 발랐더니 잎이 번들거리고 이상해 보임. 적정량은 잎 크기 손바닥 정도에 2~3방울이라고 배움. 다음엔 먼저 손등에 찍어보고 사용할 것!" },
    { key: "feel", label: "💬 오늘의 소감", ex: "처음으로 혼자 관수 작업을 완료했다. 생각보다 시간이 많이 걸렸지만 식물들이 물 마시고 생기 있어 보이는 게 뿌듯했다. 내일은 더 빠르게 할 수 있을 것 같아!" }
  ];
  var PLANT_STATUS = ["양호", "주의", "이상"];
  var PLANT_FIELDS = [["water", "수분"], ["leaf", "잎 상태"], ["pest", "병해충"], ["look", "외관"]];
  var PLANT_EXAMPLE = [
    ["🪴 몬스테라", "1층 로비", ["good", "적당"], ["good", "양호"], ["good", "없음"], ["good", "깨끗"], ""],
    ["🌵 산세베리아", "2층 복도", ["warn", "건조"], ["good", "양호"], ["good", "없음"], ["good", "양호"], "관수 필요"],
    ["🌿 아이비", "휴게실", ["good", "적당"], ["bad", "황변"], ["bad", "응애 의심"], ["warn", "처짐"], "방제 · 보고"],
    ["🌴 야자나무", "1층 카페", ["good", "적당"], ["good", "양호"], ["good", "없음"], ["warn", "먼지"], "잎 세정"]
  ];
  function plantLine(r) {
    var st = [r.water, r.leaf, r.pest, r.look];
    var badge = st.indexOf("이상") > -1 ? "🔴" : st.indexOf("주의") > -1 ? "🟡" : "🟢";
    var need = st.some(function (s) { return s !== "양호"; });
    return badge + " " + r.name + (r.loc ? " (" + r.loc + ")" : "") + " — 수분:" + r.water + " / 잎:" + r.leaf + " / 병해충:" + r.pest + " / 외관:" + r.look + (need ? " → 조치 필요" : " → 이상 없음");
  }

  /* ---------------- 저장소 ---------------- */
  var _sb = null;
  function sb() { if (!_sb) _sb = window.supabase.createClient(CONFIG.supabase.url, CONFIG.supabase.anonKey); return _sb; }
  function must(res) { if (res.error) throw res.error; return res.data; }

  function mapProfile(r) {
    return { id: r.id, name: r.name || "", crewName: r.crew_name || r.name || "", company: r.company || "", job: r.job || "",
      startDate: r.start_date || "", endDate: r.end_date || "", manager: r.manager || "", managerSign: r.manager_sign || "",
      mentor: r.mentor || "", mentorTeam: r.mentor_team || "", workIn: r.work_in || "07:00", workOut: r.work_out || "16:00",
      active: r.active !== false, prob: r.prob || {}, selfEval: r.self_eval || {}, workEval: r.work_eval || {}, updatedAt: r.updated_at || "" };
  }
  function unmapProfile(p) {
    var o = {}, M = { name: "name", crewName: "crew_name", company: "company", job: "job", startDate: "start_date", endDate: "end_date",
      manager: "manager", managerSign: "manager_sign", mentor: "mentor", mentorTeam: "mentor_team", workIn: "work_in", workOut: "work_out",
      active: "active", prob: "prob", selfEval: "self_eval", workEval: "work_eval" };
    Object.keys(M).forEach(function (k) { if (p.hasOwnProperty(k)) o[M[k]] = p[k]; });
    return o;
  }
  function mapDay(r) {
    return { id: r.id, internId: r.intern_id, date: r.date, status: r.status || "normal", halfType: r.half_type || "full",
      inTime: r.in_time || "", outTime: r.out_time || "", late: !!r.late, early: !!r.early, absChk: !!r.abs_chk, note: r.note || "",
      signData: r.sign_data || "", signedAt: r.signed_at || "", legacySigned: !!r.legacy_signed, savedAt: r.saved_at || "", updatedBy: r.updated_by || "" };
  }
  function unmapDay(d) {
    return { id: d.internId + ":" + d.date, intern_id: d.internId, date: d.date, status: d.status, half_type: d.halfType || "full",
      in_time: d.inTime || "", out_time: d.outTime || "", late: !!d.late, early: !!d.early, abs_chk: !!d.absChk, note: d.note || "",
      sign_data: d.signData || "", signed_at: d.signedAt || null, legacy_signed: !!d.legacySigned, saved_at: new Date().toISOString(), updated_by: d.updatedBy || "" };
  }
  function mapNote(r) { return { id: r.id, internId: r.intern_id, kind: r.kind, date: r.date || "", cat: r.cat || "", body: r.body || "", rows: r.rows || [], createdAt: r.created_at || "", createdBy: r.created_by || "" }; }

  // 데모: 브라우저에 저장 (예시 인턴 1명 + 지난 평일 기록)
  function demoSeed() {
    var p = { id: "demo-intern", name: "예시 인턴(demo)", crew_name: "예시 인턴(demo)", company: "㈜링키지랩", job: "조경관리(화초 및 식물 관리, 낙엽청소, 조경 도구 정리 등)",
      start_date: "2026-05-18", end_date: "2026-11-17", manager: "홍길동", manager_sign: "", mentor: "엘리 (ellie)", mentor_team: "스낵&가든 사업팀",
      work_in: "07:00", work_out: "16:00", active: true, prob: { p01: true, p02: true, p03: true, p04: true, p05: true, p06: true, p07: true }, self_eval: {}, work_eval: {} };
    var days = [], d = new Date(2026, 8, 1), end = new Date();
    for (; d <= end; d.setDate(d.getDate() + 1)) {
      var key = dk(d); if (isWeekend(key)) continue;
      var r = { id: "demo-intern:" + key, intern_id: "demo-intern", date: key, status: "normal", half_type: "full", in_time: "07:00", out_time: "16:00",
        late: false, early: false, abs_chk: false, note: "", sign_data: "", legacy_signed: d.getMonth() < 9, saved_at: d.toISOString(), updated_by: "데모" };
      if (key === "2026-09-23") Object.assign(r, { status: "paid", in_time: "", out_time: "", note: "연차", legacy_signed: false });
      if (key === "2026-10-05") Object.assign(r, { status: "alt", in_time: "", out_time: "", legacy_signed: false });
      if (key === "2026-10-15") Object.assign(r, { status: "paid", half_type: "am", out_time: "11:00" });
      if (key === "2026-10-22") Object.assign(r, { late: true, in_time: "07:20", note: "버스 지연" });
      days.push(r);
    }
    return { profiles: [p], days: days, notes: [] };
  }
  function L() { try { var raw = localStorage.getItem(LS_KEY); if (raw) return JSON.parse(raw); } catch (e) {} var s = demoSeed(); W(s); return s; }
  function W(db) { try { localStorage.setItem(LS_KEY, JSON.stringify(db)); } catch (e) {} }

  var Store = {
    // 표가 없으면(SQL 실행 전) NEED_SQL 오류
    listProfiles: function () {
      if (SUPA) return sb().from("intern_profiles").select("*").order("created_at", { ascending: false }).then(must).then(function (r) { return (r || []).map(mapProfile); });
      return Promise.resolve(L().profiles.map(mapProfile));
    },
    getProfile: function (id) {
      if (SUPA) return sb().from("intern_profiles").select("*").eq("id", id).maybeSingle().then(must).then(function (r) { return r ? mapProfile(r) : null; });
      var r = L().profiles.filter(function (x) { return x.id === id; })[0]; return Promise.resolve(r ? mapProfile(r) : null);
    },
    saveProfile: function (p) {
      var row = unmapProfile(p); row.updated_at = new Date().toISOString();
      if (!p.id) { p.id = "in" + Date.now().toString(36); row.id = p.id; }
      else row.id = p.id;
      if (SUPA) return sb().from("intern_profiles").upsert(row, { onConflict: "id" }).then(must).then(function () { return p.id; });
      var db = L(), i = db.profiles.findIndex(function (x) { return x.id === p.id; });
      if (i < 0) db.profiles.unshift(Object.assign({ prob: {}, self_eval: {}, work_eval: {}, active: true }, row)); else db.profiles[i] = Object.assign({}, db.profiles[i], row);
      W(db); return Promise.resolve(p.id);
    },
    deleteProfile: function (id) {
      if (SUPA) return sb().from("intern_profiles").delete().eq("id", id).then(must);
      var db = L(); db.profiles = db.profiles.filter(function (x) { return x.id !== id; });
      db.days = db.days.filter(function (x) { return x.intern_id !== id; }); db.notes = db.notes.filter(function (x) { return x.intern_id !== id; });
      W(db); return Promise.resolve();
    },
    listDays: function (internId) {
      if (SUPA) return sb().from("intern_days").select("*").eq("intern_id", internId).order("date").then(must).then(function (r) { return (r || []).map(mapDay); });
      return Promise.resolve(L().days.filter(function (x) { return x.intern_id === internId; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; }).map(mapDay));
    },
    saveDay: function (d) {
      var row = unmapDay(d);
      if (SUPA) return sb().from("intern_days").upsert(row, { onConflict: "id" }).then(must).then(function () { return mapDay(row); });
      var db = L(), i = db.days.findIndex(function (x) { return x.id === row.id; });
      if (i < 0) db.days.push(row); else db.days[i] = row; W(db); return Promise.resolve(mapDay(row));
    },
    saveDays: function (list) {
      var rows = list.map(unmapDay);
      if (SUPA) return rows.length ? sb().from("intern_days").upsert(rows, { onConflict: "id" }).then(must) : Promise.resolve();
      var db = L(); rows.forEach(function (row) { var i = db.days.findIndex(function (x) { return x.id === row.id; }); if (i < 0) db.days.push(row); else db.days[i] = row; });
      W(db); return Promise.resolve();
    },
    deleteDay: function (internId, date) {
      var id = internId + ":" + date;
      if (SUPA) return sb().from("intern_days").delete().eq("id", id).then(must);
      var db = L(); db.days = db.days.filter(function (x) { return x.id !== id; }); W(db); return Promise.resolve();
    },
    listNotes: function (internId) {
      if (SUPA) return sb().from("intern_notes").select("*").eq("intern_id", internId).order("created_at", { ascending: false }).then(must).then(function (r) { return (r || []).map(mapNote); });
      return Promise.resolve(L().notes.filter(function (x) { return x.intern_id === internId; }).sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; }).map(mapNote));
    },
    addNote: function (n) {
      var row = { id: uid(), intern_id: n.internId, kind: n.kind, date: n.date || today(), cat: n.cat || "", body: n.body || "", rows: n.rows || [], created_at: new Date().toISOString(), created_by: n.createdBy || "" };
      if (SUPA) return sb().from("intern_notes").insert(row).then(must).then(function () { return mapNote(row); });
      var db = L(); db.notes.push(row); W(db); return Promise.resolve(mapNote(row));
    },
    deleteNote: function (id) {
      if (SUPA) return sb().from("intern_notes").delete().eq("id", id).then(must);
      var db = L(); db.notes = db.notes.filter(function (x) { return x.id !== id; }); W(db); return Promise.resolve();
    }
  };
  function needSql(err) { var m = String((err && (err.message || err.code)) || ""); return /intern_|relation|does not exist|schema cache|PGRST20|42P01/.test(m); }

  /* ---------------- 집계 (원본 계산 그대로) ---------------- */
  function monthsOf(p) {
    var s = (p.startDate || today()).slice(0, 7), e = (p.endDate || today()).slice(0, 7), out = [];
    var y = +s.slice(0, 4), m = +s.slice(5, 7);
    while ((y + "-" + p2(m)) <= e && out.length < 36) { out.push(y + "-" + p2(m)); m++; if (m > 12) { m = 1; y++; } }
    return out.length ? out : [today().slice(0, 7)];
  }
  function isSigned(r) { return !!(r && (r.signData || r.legacySigned)); }
  // ym = 'YYYY-MM' 이면 그 달, 없으면 전체
  function stats(p, days, ym) {
    var start = p.startDate || "", recs = days.filter(function (r) { return (!ym || r.date.slice(0, 7) === ym) && (!start || r.date >= start); });
    var s = { work: 0, abs: 0, paid: 0, full: 0, am: 0, pm: 0, alt: 0, late: 0, early: 0, unsigned: [], records: recs.length };
    recs.forEach(function (r) {
      if (r.status === "normal") { s.work += 1; if (!isSigned(r)) s.unsigned.push(r); }
      if (r.status === "absence") s.abs++;
      if (r.status === "paid") { var half = r.halfType === "am" || r.halfType === "pm"; s.paid += half ? 0.5 : 1; if (half) s.work += 0.5; s[r.halfType === "am" ? "am" : r.halfType === "pm" ? "pm" : "full"]++; }
      if (r.status === "alt") s.alt++;
      if (r.late) s.late++;
      if (r.early) s.early++;
    });
    if (ym) {
      var y = +ym.slice(0, 4), m = +ym.slice(5, 7), last = new Date(y, m, 0).getDate(), wd = 0;
      for (var d = 1; d <= last; d++) { var w = new Date(y, m - 1, d).getDay(); if (w !== 0 && w !== 6) wd++; }
      var normal = recs.filter(function (r) { return r.status === "normal"; }).length;
      s.weekdays = wd; s.normal = normal; s.pct = wd ? Math.round(normal / wd * 100) : 0;
    }
    return s;
  }
  function fmtN(v) { return Number.isInteger(v) ? String(v) : v.toFixed(1); }
  function probCount(p) {
    var all = []; PROB_WEEKS.forEach(function (w) { w.groups.forEach(function (g) { all = all.concat(g.items); }); });
    var done = all.filter(function (it) { return p.prob && p.prob[it.id]; }).length;
    return { done: done, total: all.length, pct: all.length ? Math.round(done / all.length * 100) : 0 };
  }
  function period(p) {
    if (!p.startDate || !p.endDate) return { pct: 0, left: null };
    var s = parse(p.startDate), e = parse(p.endDate), n = parse(today());
    var pct = Math.max(0, Math.min(100, Math.round((n - s) / (e - s) * 100)));
    return { pct: pct, left: Math.round((e - n) / 86400000) };
  }
  function spaced(name) { var n = String(name || "").replace(/\(.*\)/, "").trim(); return /\s/.test(n) || n.length > 4 ? n : n.split("").join(" "); }

  /* ---------------- 출퇴근 기록부 A4 (원본 makePrintHTML 그대로) ---------------- */
  var LOGO = "./img/seoul-jobcenter-logo.jpg";
  var PRINT_CSS = ".pt-page{font-family:'Noto Sans KR','Noto Sans CJK KR','Malgun Gothic',sans-serif;color:#000;background:#fff;width:186mm;margin:0 auto}"
    + ".pt-title-wrap{text-align:center;margin-bottom:4mm}"
    + ".pt-title-text{display:inline;font-size:14pt;font-weight:700;letter-spacing:.5px;border-bottom:1.5px solid #000;padding-bottom:1.5px}"
    + ".pt-info{width:100%;border-collapse:collapse;table-layout:fixed;border:1px solid #000}"
    + ".pt-info td{border:.5px solid #bbb;padding:1.2mm 2.5mm;vertical-align:middle;height:8mm}"
    + ".pt-info tr:last-child td{height:auto;min-height:8mm;padding:1.5mm 2.5mm}"
    + ".pt-info .lbl{background:#e8e8e8;font-weight:700;text-align:center;font-size:8pt}"
    + ".pt-info .val{text-align:center;font-size:8pt}"
    + ".pt-info .val-s{text-align:left;font-size:7.5pt;white-space:normal;word-break:keep-all;line-height:1.45}"
    + ".pt-main{width:100%;border-collapse:collapse;table-layout:fixed;border:1px solid #000;border-bottom:none}"
    + ".pt-main th{border:.5px solid #bbb;text-align:center;vertical-align:middle;background:#e8e8e8;font-weight:700;padding:.5mm 0}"
    + ".pt-main th.h1{height:5.5mm;font-size:8pt}.pt-main th.h2{height:5mm;font-size:7.5pt}"
    + ".pt-main td{border:.5px solid #bbb;text-align:center;vertical-align:middle;padding:0;height:5.5mm;font-size:7.5pt;overflow:hidden}"
    + ".pt-main td.td-date{white-space:nowrap}.pt-main td.td-note{font-size:7pt;padding:0 .5mm}"
    + ".pt-main td.td-sign{padding:0;overflow:hidden}.pt-main td.td-sign img{display:block;width:100%;height:5.4mm;object-fit:contain;object-position:center}"
    + ".pt-sum{width:100%;border-collapse:collapse;table-layout:fixed;border:1px solid #000;border-top:none;border-bottom:none}"
    + ".pt-sum td{border:.5px solid #bbb;text-align:center;vertical-align:middle;font-weight:700;height:9mm;font-size:8pt;background:#e8e8e8;padding:0;width:16.667%}"
    + ".pt-sign{width:100%;border-collapse:collapse;border:1px solid #000;border-top:none}"
    + ".pt-sign td{height:22mm;font-size:8pt;vertical-align:bottom;padding:2mm 5mm}"
    + ".pt-logo{text-align:center;margin-top:3mm}.pt-logo img{height:10mm;width:auto;display:inline-block}";

  function printHtml(p, days, ym, opt) {
    opt = opt || {};
    var y = +ym.slice(0, 4), month = +ym.slice(5, 7), last = new Date(y, month, 0).getDate();
    var map = {}; days.forEach(function (r) { map[r.date] = r; });
    var startKey = p.startDate || "", rows = "", work = 0, abs = 0, paid = 0;
    for (var d = 1; d <= last; d++) {
      var key = y + "-" + p2(month) + "-" + p2(d), r = map[key], dt = new Date(y, month - 1, d), wk = dt.getDay() === 0 || dt.getDay() === 6;
      var before = startKey && key < startKey;
      var style = before ? "background:#f0f0f0;color:#bbb;" : wk ? "background:#f7f7f7;" : "background:#fff;";
      var paidCell = "", signCell = "", noteCell = "";
      if (!before && r) {
        if (r.status === "paid") paidCell = r.halfType === "am" ? "오전반차" : r.halfType === "pm" ? "오후반차" : "✓";
        if (r.signData) signCell = '<img src="' + r.signData + '" alt="서명">';
        noteCell = esc(r.note || (r.status === "alt" ? "대체공휴일" : ""));
        if (r.status === "normal") work += 1;
        if (r.status === "absence") abs++;
        if (r.status === "paid") { var h = r.halfType === "am" || r.halfType === "pm"; paid += h ? 0.5 : 1; if (h) work += 0.5; }
      }
      var show = !before && r && (r.status === "normal" || r.status === "paid");
      rows += '<tr style="' + style + '"><td class="td-date">' + month + "/" + d + "(" + DOW[dt.getDay()] + ")</td>"
        + "<td>" + (show ? esc(r.inTime) : "") + "</td><td>" + (show ? esc(r.outTime) : "") + "</td>"
        + "<td>" + (!before && r && r.late ? "✓" : "") + "</td><td>" + (!before && r && r.early ? "✓" : "") + "</td><td>" + (!before && r && r.absChk ? "✓" : "") + "</td>"
        + "<td>" + paidCell + '</td><td class="td-sign">' + signCell + '</td><td class="td-note">' + noteCell + "</td></tr>";
    }
    var sd = (p.startDate || "").replace(/-/g, "."), ed = (p.endDate || "").replace(/-/g, ".");
    return '<div class="pt-page">'
      + '<div class="pt-title-wrap"><span class="pt-title-text">중증장애인 인턴제 (&nbsp;&nbsp;' + month + '&nbsp;&nbsp;)월 출·퇴근 기록부</span></div>'
      + '<table class="pt-info"><colgroup><col style="width:13.5%"><col style="width:23%"><col style="width:13.5%"><col></colgroup>'
      + '<tr><td class="lbl">사업체명</td><td class="val">' + esc(p.company) + '</td><td class="lbl">인턴 약정기간</td><td class="val">' + sd + " ~ " + ed + "</td></tr>"
      + '<tr><td class="lbl">인턴명</td><td class="val">' + esc(p.name) + '</td><td class="lbl">직무내용</td><td class="val-s">' + esc(p.job) + "</td></tr></table>"
      + '<table class="pt-main"><colgroup><col style="width:15.4%"><col style="width:10.9%"><col style="width:10.9%"><col style="width:7.5%"><col style="width:7.5%"><col style="width:7.5%"><col style="width:12.1%"><col style="width:12.1%"><col style="width:16.1%"></colgroup>'
      + '<thead><tr><th class="h1" rowspan="2">근무일</th><th class="h1" colspan="2">실제 근무시간</th><th class="h1" colspan="3">출퇴근 외 사항</th><th class="h1" rowspan="2">유급휴일</th><th class="h1" rowspan="2">인턴 서명</th><th class="h1" rowspan="2">비고</th></tr>'
      + '<tr><th class="h2">출근시간</th><th class="h2">퇴근시간</th><th class="h2">지각</th><th class="h2">조퇴</th><th class="h2">결근</th></tr></thead>'
      + "<tbody>" + rows + "</tbody></table>"
      + '<table class="pt-sum"><tr><td>총 근무일</td><td>' + fmtN(work) + "일</td><td>결근일</td><td>" + abs + "일</td><td>유급휴일</td><td>" + fmtN(paid) + "일</td></tr></table>"
      + '<table class="pt-sign"><tr><td style="text-align:right;padding:3mm 8mm 3mm;"><div style="display:inline-block;position:relative;">'
      + (p.managerSign ? '<img src="' + p.managerSign + '" alt="담당자서명" style="position:absolute;bottom:0;right:-4mm;height:10mm;width:auto;max-width:40mm;object-fit:contain;object-position:right bottom;z-index:1;">' : "")
      + '<div style="font-size:9pt;line-height:1.8;white-space:nowrap;">사업체 담당자 : &nbsp;' + esc(spaced(p.manager)) + "&nbsp;(서명 또는 인)</div></div></td></tr></table>"
      + '<div class="pt-logo"><img src="' + (opt.logo || LOGO) + '" alt="서울특별시장애인일자리센터"></div></div>';
  }

  /* ---------------- 서명판 (관리자 · 인턴 공용) ---------------- */
  function sigPad(canvas, width) {
    var ctx = canvas.getContext("2d"), drawn = false, drawing = false, lx = 0, ly = 0, lw = width || 3;
    function resize() {
      var r = canvas.getBoundingClientRect(), ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(10, r.width * ratio); canvas.height = Math.max(10, r.height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.lineWidth = lw; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#000";
    }
    setTimeout(resize, 0);
    function pos(e) { var r = canvas.getBoundingClientRect(), t = e.touches ? e.touches[0] : e; return { x: t.clientX - r.left, y: t.clientY - r.top }; }
    function start(e) { e.preventDefault(); drawing = true; drawn = true; canvas.classList.add("has-ink"); var q = pos(e); lx = q.x; ly = q.y; }
    function move(e) { if (!drawing) return; e.preventDefault(); var q = pos(e); ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(q.x, q.y); ctx.stroke(); lx = q.x; ly = q.y; }
    function end() { drawing = false; }
    canvas.addEventListener("pointerdown", start); canvas.addEventListener("pointermove", move); window.addEventListener("pointerup", end);
    canvas.addEventListener("touchstart", start, { passive: false }); canvas.addEventListener("touchmove", move, { passive: false }); canvas.addEventListener("touchend", end);
    return {
      isEmpty: function () { return !drawn; },
      clear: function () { ctx.clearRect(0, 0, canvas.width, canvas.height); drawn = false; canvas.classList.remove("has-ink"); },
      width: function (w) { lw = w; ctx.lineWidth = w; },
      // 투명 배경 PNG (출퇴근 기록부 칸에 그대로 얹힘)
      dataUrl: function () {
        var out = document.createElement("canvas"); out.width = 360; out.height = Math.round(360 * canvas.height / canvas.width) || 120;
        out.getContext("2d").drawImage(canvas, 0, 0, out.width, out.height); return out.toDataURL("image/png");
      }
    };
  }

  return {
    store: Store, needSql: needSql, isDemo: !SUPA,
    STATUS: STATUS, HALF: HALF, PROB_WEEKS: PROB_WEEKS, TAGS: TAGS, ROUTINE: ROUTINE, ROUTINE_NOTE: ROUTINE_NOTE,
    SE_ITEMS: SE_ITEMS, SE_LABELS: SE_LABELS, WE_ITEMS: WE_ITEMS, WE_LABELS: WE_LABELS, weSummary: weSummary,
    MEMO_CATS: MEMO_CATS, PLANT_STATUS: PLANT_STATUS, PLANT_FIELDS: PLANT_FIELDS, PLANT_EXAMPLE: PLANT_EXAMPLE, plantLine: plantLine,
    p2: p2, dk: dk, today: today, parse: parse, dayLabel: dayLabel, isWeekend: isWeekend, DOW: DOW, esc: esc,
    monthsOf: monthsOf, stats: stats, fmtN: fmtN, isSigned: isSigned, probCount: probCount, period: period,
    PRINT_CSS: PRINT_CSS, printHtml: printHtml, sigPad: sigPad
  };
})();
