/* =========================================================
   동의서 서명 (촬영 및 초상권 활용 동의서 등)
   ---------------------------------------------------------
   교육 서명과 같은 세션·명단을 쓰고, 교육구분이 동의서면
     · 크루 서명 화면: 동의서 내용을 먼저 보여 주고 '동의하면 서명'
     · 출력(print.html): 1쪽 동의서 본문 + 2쪽 성명/서명/확인 칸 표 (원본 hwpx 서식)
   명단 한 줄의 추가 정보는 roster.extra(jsonb) — supabase/consent.sql 실행 후 저장됨
     extra.realName : 출력용 실명 (출력엔 "실명 (닉네임)")
     extra[col.key] : 확인 칸 값 "O" / "X" / "-"
   ========================================================= */
window.Consent = (function () {
  var CATEGORY = "촬영 및 초상권 활용 동의서";

  var PORTRAIT = {
    docTitle: "촬영 및 초상권 활용 동의서",
    intro: function (event) {
      return "링키지랩 '" + event + "' 행사의 원활한 운영 및 콘텐츠 제작을 위하여, 아래와 같이 참가자의 촬영 및 초상권 활용에 대한 동의를 받고자 합니다. 내용을 확인하신 후 동의 여부에 서명해 주시기 바랍니다.";
    },
    sections: [
      { h: "1. 수집 및 이용 목적", items: [
        "행사 진행 과정 기록 (사진 및 영상 촬영)",
        "사내 홍보 콘텐츠 제작 (아지트 게시글, 인스타그램, 유튜브)",
        "언론 홍보 및 보도자료 배포",
        "행사 결과 보고서 및 후기 자료 작성"] },
      { h: "2. 수집 항목", items: [
        "초상권 정보: 행사 훈련 및 대회 당일 촬영된 사진·영상 속의 얼굴, 음성, 모습 등"] },
      { h: "3. 동의 거부 권리 및 유의사항", items: [
        "귀하는 본 초상권 수집·이용 동의를 거부할 권리가 있습니다.",
        "다만, 동의를 거부하실 경우 단체 촬영 시 제외되거나, 콘텐츠 제작 시 모자이크 처리될 수 있습니다."] }
    ],
    // 크루 화면용 쉬운 말 요약 (장애 크루가 먼저 읽는 부분)
    easy: [
      "행사 날 사진과 영상을 찍어요.",
      "사진·영상은 회사 소식, 인스타그램, 유튜브, 뉴스에 나올 수 있어요.",
      "싫으면 동의하지 않아도 괜찮아요. 그러면 사진에서 빠지거나 얼굴을 가려요."
    ],
    confirmTitle: "[동의 여부 확인]",
    confirm: "본인은 위 내용을 숙지하였으며, 개인정보 및 초상권 수집·이용에 동의합니다.",
    sigLabel: "촬영 동의 서명",
    cols: [
      { key: "online", label: "온라인 교육 참여 여부", sub: "9/29 17:00 (O/X)" },
      { key: "training", label: "훈련 참여 여부", sub: "10/1 16:30 (O/X)" }
    ],
    defaultEvent: "오티즘 레이스 in 판교"
  };

  function isConsent(session) {
    return !!session && (session.category === CATEGORY || (session.meta && session.meta.kind === "consent"));
  }
  function event(session) {
    return (session && session.meta && session.meta.event) || (session && session.title) || PORTRAIT.defaultEvent;
  }
  function cols(session) {
    var m = session && session.meta && session.meta.cols;
    return Array.isArray(m) && m.length ? m : PORTRAIT.cols;
  }
  // "마린(marin.3)" → "마린"
  function nick(name) { return String(name || "").replace(/\s*\(.*\)\s*$/, "").trim(); }
  // 출력용 이름: 명단 이름 그대로 (동의서 원본 이름 "노미나 (마린)" 으로 등록) — 실명 칸을 따로 채웠으면 "실명 (닉네임)"
  function printName(r) {
    var real = r && r.extra && r.extra.realName;
    return real ? real + " (" + nick(r.name) + ")" : String((r && r.name) || "");
  }
  var MARKS = ["", "O", "X", "-"];
  function nextMark(v) { return MARKS[(MARKS.indexOf(v || "") + 1) % MARKS.length]; }

  return { CATEGORY: CATEGORY, doc: PORTRAIT, isConsent: isConsent, event: event, cols: cols, nick: nick, printName: printName, nextMark: nextMark };
})();
