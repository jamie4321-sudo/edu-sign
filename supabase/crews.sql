-- =========================================================
--  EDU — 크루 명단 (OPS 구글 시트 → Supabase 복사본)
--  Supabase 대시보드 > SQL Editor 에 붙여넣고 [Run] (여러 번 실행해도 안전)
--
--  · 이수 현황 · 명단 등록은 이 표를 바로 읽어요 (빠름).
--  · 관리자 화면이 OPS 구글 시트를 뒤에서 확인해서 바뀐 내용을 이 표에 맞춰 둬요.
-- =========================================================

create table if not exists public.edu_crews (
  name      text primary key,      -- 예: 엘리(ellie.227) — 교육 서명 명단과 같은 형식
  grp       text,                  -- 파트: 가든 · 스낵 · 총무지원
  role      text,
  status    text,                  -- 재직 · 퇴사 등 (OPS 그대로)
  synced_at timestamptz default now()
);
create index if not exists edu_crews_grp_idx on public.edu_crews(grp);

-- 교육 서명과 같은 운영 모델
alter table public.edu_crews enable row level security;
drop policy if exists "anon all edu_crews" on public.edu_crews;
create policy "anon all edu_crews" on public.edu_crews for all
  to anon, authenticated using (true) with check (true);

select to_regclass('public.edu_crews') as crews_table;
