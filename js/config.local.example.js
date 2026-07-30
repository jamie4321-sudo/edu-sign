/* config.local.js 템플릿 — 실제 운영 endpoint는 여기에만 적으세요.
   1) 이 파일을 같은 폴더에 config.local.js 로 복사 (파일명 그대로!)
   2) endpoint 를 실제 배포한 /exec 주소로 교체
   config.local.js 는 .gitignore 처리되어 있어 깃에 올라가지 않습니다. */
window.CONFIG = Object.assign(window.CONFIG || {}, {
  endpoint: "https://script.google.com/macros/s/AKfyc.../exec"
});
