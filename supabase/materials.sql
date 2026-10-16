-- =========================================================
--  EDU — 교육 자료실 (가든 교육부터)
--  Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 [Run] 하세요. (여러 번 실행해도 안전)
--  사진은 기존 'edu-photos' 버킷의 materials/<자료 id>/ 아래에 저장됩니다.
-- =========================================================

create table if not exists public.materials (
  id         text primary key,
  part       text not null default 'garden',   -- garden | snack | support
  topic      text,                             -- 장비 · 도구 관리 등
  title      text,
  summary    text,                             -- 한 줄 설명
  steps      jsonb not null default '[]'::jsonb, -- [{ "u": 사진 URL, "p": 저장 경로, "text": 설명, "warn": 주의 }]  (최대 9단계)
  needs_sign boolean not null default false,  -- 이 교육은 서명을 받는지
  sign_session_id text,                       -- 서명을 받으면 연결된 교육 서명 세션(sessions.id)
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists materials_part_idx on public.materials(part);
-- 먼저 만든 테이블에도 서명 칸을 추가 (이미 있으면 그대로)
alter table public.materials add column if not exists needs_sign boolean not null default false;
alter table public.materials add column if not exists sign_session_id text;

-- 교육 서명과 같은 운영 모델: 링크를 아는 사람은 볼 수 있고, 만들기·수정은 관리자 화면(PIN)에서만
alter table public.materials enable row level security;
drop policy if exists "anon all materials" on public.materials;
create policy "anon all materials" on public.materials for all
  to anon, authenticated using (true) with check (true);
