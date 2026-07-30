# EDU · SIGN — 교육 참석 서명

법정의무교육(산업안전보건교육 등) 참석자 명단에 종이 대신 **온라인 서명**을 받고,
"교육참석자 명단" 원본 서식 그대로 **PDF/인쇄 출력**까지 지원하는 정적 웹앱입니다.

## 흐름
1. 관리자(`index.html`) — 교육 세션(일자·구분) 생성 → 참석 예정자 명단 등록 → 서명 링크/QR 공유
2. 참석자(`sign.html?s=세션ID`) — 링크 접속 → 본인 이름 탭 → 손가락/마우스로 서명 → 저장
3. 관리자 — 서명 현황판에서 실시간 확인, 마감 후 `print.html`에서 원본 서식대로 출력

## 구조
```
index.html      관리자 대시보드 (세션 목록/상세, 명단 관리)
sign.html        참석자 서명 페이지 (로그인 없음, 링크로만 접근)
print.html       원본 서식 그대로 인쇄/PDF 출력
css/styles.css   앱 디자인 (다크+라이트, 라임 accent — SNACK&GARDEN OPS 톤 재사용)
css/print.css    인쇄 전용 스타일 (A4, 원본 서식 레이아웃)
js/store.js      데이터 계층 — endpoint 없으면 localStorage 데모, 있으면 GAS 호출
js/data.js       데모 목업 데이터
js/app.js        관리자 화면 로직
js/sign.js       서명 캡처(canvas) 로직
js/print.js      인쇄 페이지 렌더링 (40명당 1페이지, 20명씩 2열)
gas/Code.gs      Google Apps Script 백엔드
```

## 지금 상태
`js/config.js`의 `endpoint`가 비어있으면 **데모 모드**(브라우저 localStorage에 저장, 새 시크릿창/다른 기기와는 공유 안 됨)로 동작합니다.

## 구글시트 연동
1. 새 Google 시트 생성 → 확장 프로그램 > Apps Script → `gas/Code.gs` 내용 붙여넣기
2. `Code.gs` 상단의 `SHEET_ID`를 새 시트 ID로 교체 (시트 URL의 `/d/`와 `/edit` 사이 문자열)
3. 배포 > 새 배포 > 웹 앱 (실행: 나 / 액세스: 모든 사용자) → `/exec` URL 복사
4. `js/config.js`의 `CONFIG.endpoint`에 붙여넣기 — 시트 탭(`sessions`, `roster`)은 첫 요청 시 자동 생성됩니다
5. `CONFIG.pin`을 원하는 관리자 비밀번호(4자리)로 변경 — `sign.html`(서명 페이지)에는 적용되지 않음(링크만 있으면 서명 가능)

## 배포
- 이 저장소는 **비공개(private)**로 유지합니다. 참석자 개인 서명 이미지가 포함되므로 공개 저장소로 전환하지 마세요.
- GitHub Pages는 비공개 저장소에서 쓰려면 유료 플랜이 필요합니다 — **Vercel**로 배포하는 것을 권장합니다(비공개 레포도 무료로 배포 가능).
- `sign.html`은 로그인이 없는 대신 **세션 링크를 아는 사람만** 서명할 수 있는 구조입니다. 링크가 외부로 유출되지 않도록 주의하세요.

## 참고
- QR 코드는 외부 공개 API(`api.qrserver.com`)로 생성합니다 — 세션 ID만 전달되고 개인정보는 포함되지 않습니다.
