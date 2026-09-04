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

  // 관리자 화면(index.html) 접속 PIN. sign.html(서명 페이지)엔 적용 안 됨.
  // pin 은 예전 단일 관리자용 폴백입니다. 여러 명을 두려면 아래 admins 를 사용하세요.
  pin: "4231",

  // 관리자를 여러 명 설정할 수 있습니다. 각자 자기 PIN(4자리, 서로 다르게)으로 로그인하며,
  // 로그인한 관리자 이름이 화면에 표시됩니다. 교육 서명 세션 "삭제"는 관리자만 가능합니다.
  // ⚠️ 공개 저장소라 PIN 이 소스에 노출됩니다(캐주얼 차단용). 관리자별로 겹치지 않는 값을 쓰세요.
  admins: [
    { name: "제이미", pin: "4231" }
  ],

  /* =======================================================
     Supabase (신규 DB) — 채우면 자동으로 구글시트 대신 Supabase 사용
     ---------------------------------------------------------
     · Supabase 대시보드 > Project Settings > API 에서 복사:
         url     = Project URL
         anonKey = Project API keys 의 "anon public"
     · anon 키는 공개돼도 되는 키입니다(설계상 공개). 실제 보안은 DB의 RLS 정책이 담당합니다.
     · 이 블록을 지우거나 url/anonKey 를 비우면 → 즉시 위 endpoint(구글시트)로 롤백됩니다.
     ======================================================= */
  supabase: {
    url: "https://qdwynctnhjndkmykecbu.supabase.co",
    anonKey: "sb_publishable_gv8l9z7imNyR0_lsUmVLxw_cFFclQ6O",
    photoBucket: "edu-photos"
  }
};
