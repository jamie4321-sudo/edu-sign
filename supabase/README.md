# EDU SIGN — Supabase 전환 가이드

구글시트(GAS) 대신 **Supabase(PostgreSQL)** 로 DB를 옮기는 방법입니다.
`store.js` 가 3-way 로 되어 있어, **config 만 채우면 Supabase, 지우면 구글시트로 즉시 롤백**됩니다.

---

## 1. Supabase 프로젝트 만들기
1. https://supabase.com → 로그인 → **New project**
2. 이름/DB 비밀번호 아무거나, Region 은 **Northeast Asia (Seoul)** 추천
3. 생성 완료까지 1~2분 대기

## 2. 테이블 만들기 (SQL 1번 실행)
1. 좌측 **SQL Editor** → **New query**
2. `supabase/schema.sql` 내용 전체 복사 → 붙여넣기 → **Run**
3. `Success` 나오면 테이블 3개(sessions·roster·photos) + 사진 버킷 생성 완료

## 3. 접속 정보 넣기
1. 좌측 **Project Settings → API**
2. `Project URL`, `anon public` 키를 복사
3. `js/config.js` 의 `supabase` 블록에 붙여넣기:
   ```js
   supabase: {
     url: "https://xxxx.supabase.co",
     anonKey: "eyJhbGci....",
     photoBucket: "edu-photos"
   }
   ```
   > anon 키는 공개돼도 되는 키입니다(설계상 공개). 실제 보안은 DB의 RLS 정책이 담당합니다.

## 4. 기존 데이터 옮기기 (1번)
1. 브라우저로 `supabase/migrate.html` 열기 (로컬 서버 또는 배포 후)
2. **마이그레이션 시작** 클릭 → 로그가 `✅ 완료` 되면 끝
3. 여러 번 눌러도 안전합니다(같은 id 덮어씀)

## 5. 확인 & 배포
1. `index.html`(관리자) 열어서 세션/명단/서명이 그대로 보이는지 확인
2. 콘솔에서 `Store.backend()` → `"supabase"` 면 정상
3. 이상 없으면 커밋 & GitHub Pages 배포

---

## 롤백 (문제 생기면)
`js/config.js` 의 `supabase.url` / `anonKey` 를 **빈 문자열로** 바꾸면 끝.
→ 자동으로 기존 구글시트(endpoint)로 돌아갑니다. 데이터도 시트에 그대로 있습니다.

## 참고
- **서명**: base64 로 `roster.signature` 컬럼에 직접 저장 (빠름). 예전에 드라이브에 저장됐던 아주 긴 서명은 드라이브 이미지 링크로 이전됩니다.
- **사진**: 새로 올리는 건 Supabase Storage(`edu-photos` 버킷). 기존 사진은 드라이브 링크를 그대로 복사해 계속 보입니다.
- **속도 포인트**: 목록은 `sessions_with_counts` 뷰로 개수만 집계 → 서명 데이터를 안 끌어와서 빠릅니다.
- **보안**: 현재는 "링크 아는 사람 서명 가능 + 관리자 PIN" 모델(기존과 동일). 더 강화하려면 `schema.sql` 의 RLS 정책만 단계적으로 조이면 됩니다.
