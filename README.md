# EDU · SIGN — 교육 참석 서명

정기 교육(산업안전보건교육 등) 참석자 명단에 종이 대신 **온라인 서명**을 받고,
"교육참석자 명단" 원본 서식 그대로 **PDF/인쇄 출력**까지 지원하는 정적 웹앱입니다.

## 흐름
1. 관리자(`index.html`) — 교육 세션(일자·구분) 생성 → 참석 예정자 명단 등록 → 서명 링크/QR 공유
2. 참석자(`sign.html?s=세션ID`) — 링크 접속 → 이름 선택 → 손가락으로 서명 → 완료 (비밀번호 없음)
3. 관리자 — 서명 현황판에서 실시간 확인, 교육 사진(드라이브) 첨부, 마감 후 `print.html`에서 원본 서식대로 출력

## 구조
```
index.html          관리자 대시보드 (세션 목록/상세, 명단·사진 관리) — 다크+라임 톤
sign.html            참석자 서명 페이지 (로그인 없음, 링크로만 접근) — 밝은 크림+옐로우 톤, 완전히 다른 디자인
print.html           원본 서식 그대로 인쇄/PDF 출력
css/styles.css       관리자 화면 디자인
css/sign-theme.css   참석자 서명 화면 전용 디자인 (이름 선택 → 인사 → 서명, 큰 글씨/버튼)
css/print.css        인쇄 전용 스타일 (A4, 원본 서식 레이아웃)
js/store.js          데이터 계층 — endpoint 없으면 localStorage 데모, 있으면 GAS 호출
js/data.js           데모 목업 데이터
js/app.js            관리자 화면 로직
js/sign.js           참석자 서명 화면 로직 (이름 선택 → 서명 캔버스)
js/print.js          인쇄 페이지 렌더링 (40명당 1페이지, 20명씩 2열)
js/config.js         공개 설정 (endpoint는 항상 비워둠 — 아래 "공개 저장소 주의" 참고)
js/config.local.example.js  실제 endpoint를 넣는 템플릿 (config.local.js로 복사해서 사용, 깃에는 안 올라감)
gas/Code.gs          Google Apps Script 백엔드 (시트 + 드라이브 사진)
```

## 참석자 서명 화면 (`sign.html`)
장애 크루도 부담 없이 쓸 수 있도록 선택지를 최소화했습니다.
1. 이름 드롭다운에서 본인 이름 선택 → "시작하기"
2. "OOO님, 안녕하세요!" 인사 카드 + 서명 캔버스 → "서명 완료"
3. 이미 서명한 경우 완료 화면(서명 이미지 + 시각)이 바로 보이고, 필요하면 "다시 서명하기"로 재서명

## 교육 사진 (Google Drive)
관리자 화면의 세션 상세에서 "+ 사진 업로드"로 교육 진행 사진을 올릴 수 있습니다.
라이브 모드에서는 `EDU SIGN 교육사진` 드라이브 폴더 아래 세션별 하위 폴더에 실제로 저장되고,
"Drive에서 열기"로 원본 폴더를 바로 열 수 있습니다. (데모 모드에서는 브라우저에만 저장됩니다.)

## 지금 상태 / 구글시트 연동
전용 스프레드시트를 만들어뒀습니다 → https://docs.google.com/spreadsheets/d/1tqD6P2IcfuIaIDGaPz2aOWst_5XPD1mH81VNFkBzrBY/edit

라이브로 연결하려면:
1. 위 시트를 열고 확장 프로그램 > Apps Script → `gas/Code.gs` 내용 그대로 붙여넣기 (SHEET_ID는 이미 이 시트로 고정되어 있음)
2. 배포 > 새 배포 > 웹 앱 (실행: 나 / 액세스: 모든 사용자) → `/exec` URL 복사
3. `js/config.local.example.js`를 같은 폴더에 `js/config.local.js`로 복사한 뒤, 그 안의 `endpoint`를 방금 복사한 `/exec` 주소로 교체
4. `js/config.js`의 `CONFIG.pin`을 원하는 관리자 비밀번호(4자리)로 변경
5. 시트 탭(`sessions`, `roster`, `photos`)은 첫 요청 시 자동 생성됩니다

## 공개 저장소 주의
- 이 저장소는 **전체 공개(public)**입니다.
- `js/config.js`에는 절대 실제 `/exec` endpoint를 적지 않습니다 — 로그인 없는 열린 API라서, 커밋해서 공개되면 누구나 참석자 명단·서명 이미지를 조회할 수 있습니다.
- 실제 endpoint는 `js/config.local.js`(⁠`.gitignore` 처리됨, 커밋되지 않음)에만 넣으세요. 배포 시 이 파일이 함께 올라가도록 Vercel CLI로 로컬 폴더를 직접 배포하거나, 별도 비공개 경로로 관리하세요.
- QR 코드는 외부 공개 API(`api.qrserver.com`)로 생성합니다 — 세션 ID만 전달되고 개인정보는 포함되지 않습니다.

## 배포
GitHub Pages 또는 Vercel 어디든 가능합니다(공개 저장소라 Pages도 무료로 됩니다). 단, 위 "공개 저장소 주의" 사항 때문에 `config.local.js`가 저장소에 없으므로, 정적 배포본에는 별도로 그 파일을 올려야 라이브 모드가 동작합니다.
