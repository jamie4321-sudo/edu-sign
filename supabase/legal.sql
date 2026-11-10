-- =========================================================
--  EDU — 법정의무교육 링크 (년도별)
--  Supabase 대시보드 > SQL Editor 에 붙여넣고 [Run] (여러 번 실행해도 안전)
--
--  · 한 해에 한 줄: links = { agit, meet, privacy, pension } (아지트 공지 · 구글 미트 · 개인정보 온라인 · 퇴직연금 자료)
--  · 관리자 화면 #/legal '링크 넣기'로 채움 → 크루용 /legal 페이지 버튼에 바로 보임
--  · 교육 내용(시간표 · 확인 사항)은 js/legal.js 의 YEARS 에 있어요
-- =========================================================

create table if not exists public.edu_legal (
  year        integer primary key,
  links       jsonb   not null default '{}'::jsonb,
  updated_at  timestamptz default now(),
  updated_by  text
);

-- 교육 서명 · AI 스터디와 같은 운영 모델 (관리자 화면에서만 고침)
alter table public.edu_legal enable row level security;
drop policy if exists "anon all edu_legal" on public.edu_legal;
create policy "anon all edu_legal" on public.edu_legal for all
  to anon, authenticated using (true) with check (true);

insert into public.edu_legal (year) values (2026) on conflict (year) do nothing;
