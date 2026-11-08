-- =========================================================
--  EDU — 스낵 교육 · 스낵&가든 AI 스터디 (Gemini 업무 활용 YouTube 강의)
--  Supabase 대시보드 > SQL Editor 에 붙여넣고 [Run] (여러 번 실행해도 안전)
--
--  · 한 사람당 한 줄: 본 강의(done = 강의 키 배열 c1~c5) · 하반기 계획 · 비고(추가로 본 자료 링크)
--  · 처음 채우는 값 = 구글 시트 「26년_스낵&가든사업팀 AI 스터디」 2026-11-08 기준
--    (이미 있는 사람은 덮어쓰지 않아요 — 사이트에서 고친 값이 지켜져요)
-- =========================================================

create table if not exists public.snack_study (
  name        text primary key,
  seq         integer not null default 0,
  done        jsonb   not null default '[]'::jsonb,   -- 예: ["c1","c2"]
  plan        text    not null default '',
  note        text    not null default '',
  updated_at  timestamptz default now(),
  updated_by  text
);

-- 교육 서명과 같은 운영 모델 (관리자 화면에서만 고침)
alter table public.snack_study enable row level security;
drop policy if exists "anon all snack_study" on public.snack_study;
create policy "anon all snack_study" on public.snack_study for all
  to anon, authenticated using (true) with check (true);

insert into public.snack_study (name, seq, done, plan) values
  ('엔조',   1, '["c1","c2","c3","c4","c5"]', '하반기에는 AI를 활용해 오아시스 현장관리 시스템을 완성하고, 현장에 전파·정착시켜 활용도를 높이는 한편, 링크업 프로젝트에도 적극 참여하겠습니다.'),
  ('스완',   2, '[]', ''),
  ('린지',   3, '["c1","c2","c3","c4","c5"]', '하반기 윤리강령포스터를 포스터 및 영상으로도 만들어, 4h크루가 더욱 이해하기 쉽고 집중할 수 있는 자료를 만들겠습니다.'),
  ('마린',   4, '["c1","c2","c3"]', ''),
  ('아셀라', 5, '["c1","c2","c3","c4","c5"]', ''),
  ('애셔',   6, '["c1","c2","c3","c4","c5"]', ''),
  ('튜브',   7, '[]', ''),
  ('니아',   8, '["c1","c2"]', ''),
  ('베라',   9, '["c2","c4","c5"]', ''),
  ('엘리',  10, '[]', '')
on conflict (name) do nothing;
