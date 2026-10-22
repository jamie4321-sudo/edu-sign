-- =========================================================
--  동의서 서명 (촬영 및 초상권 활용 동의서 등)
--  Supabase 대시보드 > SQL Editor 에 붙여넣고 [Run] — 여러 번 실행해도 안전
--  · roster.extra : 확인 칸 O/X 값 (예: {"online":"O","training":"X"})
--  · sessions.meta: 동의서 설정(행사 이름 · 확인 칸 제목) — 비워 두면 기본 서식 사용
--  실행 전에도 크루 서명 · 출력은 되고, O/X 저장만 안 됩니다.
-- =========================================================
alter table public.roster   add column if not exists extra jsonb not null default '{}'::jsonb;
alter table public.sessions add column if not exists meta  jsonb not null default '{}'::jsonb;

-- PostgREST 가 새 칸을 바로 알도록
notify pgrst, 'reload schema';
