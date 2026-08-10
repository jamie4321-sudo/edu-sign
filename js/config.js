/* =========================================================
   연동 설정
   ---------------------------------------------------------
   endpoint 를 비워두면 → 데모 모드 (js/data.js 목업, 새로고침하면 초기화)
   Apps Script 웹앱 /exec URL 을 넣으면 → 라이브 모드 (구글시트 공유, 기기 무관)

   ⚠️ 이 저장소는 공개(public) 저장소이고, GitHub Pages 로 배포되면 이 파일의 내용은
   누구나 볼 수 있습니다. endpoint 자체는 로그인 없는 열린 API 라, 무단 접근을 막기 위해
   apiKey(접근 키)를 함께 보냅니다 — GAS(Code.gs)의 API_KEY 와 반드시 동일해야 하며,
   키가 일치하지 않는 요청은 서버가 거부합니다.
   ※ 정적 사이트라 키도 결국 배포된 JS 에 노출됩니다(캐주얼 접근 차단용). 키를 바꾸려면
     이 파일과 Code.gs 를 함께 교체하고 GAS 를 새 버전으로 재배포하세요.
   ========================================================= */
window.CONFIG = {
  endpoint: "https://script.google.com/macros/s/AKfycbwEcs-RxDHQsGi8BJOySZql1wZ7IyJgA242JacDYfWNQTtPnKA1DXy9B-8e-SYICVrE/exec",
  apiKey: "sg-edusign-ydAMyHruYjli1O7kQgRgCZMcBboEC",
  pin: "4231" // 관리자 화면(index.html) 접속 PIN. sign.html(서명 페이지)엔 적용 안 됨
};
