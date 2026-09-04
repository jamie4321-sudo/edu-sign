-- =========================================================
--  EDU SIGN — Supabase 스키마
--  Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 [Run] 하세요.
--  (여러 번 실행해도 안전하도록 IF NOT EXISTS / OR REPLACE 로 작성)
-- =========================================================

-- 1) 교육 세션 -------------------------------------------------
create table if not exists public.sessions (
  id         text primary key,
  date       text,               -- 'YYYY-MM-DD'
  category   text,
  title      text,
  locked     boolean default false,
  created_at timestamptz default now()
);

-- 2) 참석자 명단(서명 포함) ------------------------------------
create table if not exists public.roster (
  id         text primary key,
  session_id text references public.sessions(id) on delete cascade,
  seq        integer,
  dept       text,
  name       text,
  signature  text,               -- 서명 base64 dataURL (없으면 빈 문자열/NULL)
  signed_at  timestamptz
);
create index if not exists roster_session_idx on public.roster(session_id);

-- 3) 교육 사진 -------------------------------------------------
create table if not exists public.photos (
  id           text primary key,
  session_id   text references public.sessions(id) on delete cascade,
  url          text,             -- Storage 공개 URL
  storage_path text,             -- 버킷 내부 경로 (삭제 시 사용)
  uploaded_at  timestamptz default now()
);
create index if not exists photos_session_idx on public.photos(session_id);

-- 4) 목록용 카운트 View ---------------------------------------
--    서명 base64 를 끌어오지 않고 개수만 집계 → 목록이 아주 빠름
create or replace view public.sessions_with_counts as
select
  s.id, s.date, s.category, s.title, s.locked, s.created_at,
  count(r.id)                                                          as total,
  count(r.signature) filter (where coalesce(r.signature,'') <> '')     as signed
from public.sessions s
left join public.roster r on r.session_id = s.id
group by s.id;

-- =========================================================
--  RLS (행 수준 보안)
--  현재 운영 모델과 동일하게 "링크를 아는 사람은 서명 가능" 수준입니다.
--  anon(익명) 키로 읽기/쓰기를 허용하고, 관리자 기능은 클라이언트 PIN 으로 막습니다.
--  ※ 더 강한 보안이 필요해지면 이 정책만 조여서 단계적으로 강화할 수 있습니다.
-- =========================================================
alter table public.sessions enable row level security;
alter table public.roster   enable row level security;
alter table public.photos   enable row level security;

drop policy if exists "anon all sessions" on public.sessions;
drop policy if exists "anon all roster"   on public.roster;
drop policy if exists "anon all photos"   on public.photos;

create policy "anon all sessions" on public.sessions for all
  to anon, authenticated using (true) with check (true);
create policy "anon all roster" on public.roster for all
  to anon, authenticated using (true) with check (true);
create policy "anon all photos" on public.photos for all
  to anon, authenticated using (true) with check (true);

grant select on public.sessions_with_counts to anon, authenticated;

-- =========================================================
--  Storage 버킷 (교육 사진용)
--  ▸ 대시보드 > Storage 에서 버킷 이름 'edu-photos' 로 "Public bucket" 생성해도 되고,
--    아래 SQL 을 실행해도 됩니다. (이미 있으면 무시)
-- =========================================================
insert into storage.buckets (id, name, public)
values ('edu-photos', 'edu-photos', true)
on conflict (id) do nothing;

-- 익명 업로드/조회/삭제 허용 (사진 버킷 한정)
drop policy if exists "edu-photos read"   on storage.objects;
drop policy if exists "edu-photos write"  on storage.objects;
drop policy if exists "edu-photos delete" on storage.objects;

create policy "edu-photos read" on storage.objects for select
  to anon, authenticated using (bucket_id = 'edu-photos');
create policy "edu-photos write" on storage.objects for insert
  to anon, authenticated with check (bucket_id = 'edu-photos');
create policy "edu-photos delete" on storage.objects for delete
  to anon, authenticated using (bucket_id = 'edu-photos');
