/* config.local.js 템플릿 — 로컬 개발용 오버라이드 (깃/배포에 포함 안 됨)
   1) 이 파일을 같은 폴더에 config.local.js 로 복사 (파일명 그대로!)
   2) 아래 값을 실제 값으로 교체
   → 실제 배포되는 값은 js/config.js 에 넣어야 합니다(GitHub Pages 는 커밋된 파일만 배포). */
window.CONFIG = Object.assign(window.CONFIG || {}, {
  // [구글시트 모드] endpoint 만 넣으면 기존 구글시트 사용
  endpoint: "https://script.google.com/macros/s/AKfyc.../exec"

  // [Supabase 모드] 아래 주석을 풀고 값을 채우면 구글시트 대신 Supabase 사용
  // ,supabase: {
  //   url: "https://xxxx.supabase.co",
  //   anonKey: "eyJhbGci....",
  //   photoBucket: "edu-photos"
  // }
});
