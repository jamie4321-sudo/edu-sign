-- =========================================================
--  중증장애인턴제 출석 (교육 서명 관리 › 중증장애인턴제 출석)
--  Supabase 대시보드 > SQL Editor 에 붙여넣고 [Run] — 여러 번 실행해도 안전
--  그다음 intern-import.sql 을 실행하면 예전 구글 출퇴근부 기록 121건이 들어와요.
--
--  intern_profiles : 인턴 1명 = 1줄 (기본 정보 · 담당자 서명 · 수습 체크 · 자기/업무 평가)
--  intern_days     : 하루 출퇴근 기록 (id = '<인턴 id>:<YYYY-MM-DD>')
--  intern_notes    : 식물 점검 기록(kind 'plant') · 나의 메모장(kind 'memo')
-- =========================================================

create table if not exists public.intern_profiles (
  id           text primary key,
  name         text not null,                       -- 인턴명 (PDF 그대로)
  crew_name    text not null default '',            -- 서명 페이지에서 고르는 이름 (비우면 인턴명)
  company      text not null default '㈜링키지랩',
  job          text not null default '',
  start_date   text not null default '',            -- YYYY-MM-DD
  end_date     text not null default '',
  manager      text not null default '',            -- PDF '사업체 담당자' 이름
  manager_sign text not null default '',            -- 담당자 서명 (PNG data URL)
  mentor       text not null default '',
  mentor_team  text not null default '',
  work_in      text not null default '07:00',       -- 정상 출근 기본 시간
  work_out     text not null default '16:00',
  active       boolean not null default true,
  prob         jsonb not null default '{}'::jsonb,  -- 수습 체크 { p01: true, … }
  self_eval    jsonb not null default '{}'::jsonb,  -- { scores: { se1: 1~5 }, comment, savedAt }
  work_eval    jsonb not null default '{}'::jsonb,  -- { scores: { we1: 1~5 }, savedAt, by }
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.intern_days (
  id            text primary key,                   -- '<인턴 id>:<YYYY-MM-DD>'
  intern_id     text not null references public.intern_profiles(id) on delete cascade,
  date          text not null,                      -- YYYY-MM-DD
  status        text not null default 'normal',     -- normal 정상출근 · absence 결근 · paid 유급휴일 · alt 대체공휴일
  half_type     text not null default 'full',       -- full 종일 · am 오전반차 · pm 오후반차 (유급휴일일 때)
  in_time       text not null default '',
  out_time      text not null default '',
  late          boolean not null default false,
  early         boolean not null default false,
  abs_chk       boolean not null default false,
  note          text not null default '',
  sign_data     text not null default '',           -- 인턴 서명 (PNG data URL)
  signed_at     timestamptz,
  legacy_signed boolean not null default false,     -- 예전 구글 출퇴근부에서 '서명완료' 였던 날 (그림 없음)
  saved_at      timestamptz default now(),
  updated_by    text not null default ''
);
create index if not exists intern_days_intern_idx on public.intern_days(intern_id, date);

create table if not exists public.intern_notes (
  id          text primary key,
  intern_id   text not null references public.intern_profiles(id) on delete cascade,
  kind        text not null,                        -- plant 식물 점검 · memo 메모장
  date        text not null default '',
  cat         text not null default '',             -- 메모 분류 plant · learn · question · mistake · feel
  body        text not null default '',
  rows        jsonb not null default '[]'::jsonb,   -- 점검표 줄 [{ name, loc, water, leaf, pest, look }]
  created_at  timestamptz not null default now(),
  created_by  text not null default ''
);
create index if not exists intern_notes_intern_idx on public.intern_notes(intern_id, kind);

-- 교육 서명과 같은 운영 모델 (서명 링크를 아는 사람은 기록 가능, 수정 · 삭제 버튼은 관리자 화면에만)
alter table public.intern_profiles enable row level security;
alter table public.intern_days     enable row level security;
alter table public.intern_notes    enable row level security;
drop policy if exists "anon all intern_profiles" on public.intern_profiles;
drop policy if exists "anon all intern_days"     on public.intern_days;
drop policy if exists "anon all intern_notes"    on public.intern_notes;
create policy "anon all intern_profiles" on public.intern_profiles for all to anon, authenticated using (true) with check (true);
create policy "anon all intern_days"     on public.intern_days     for all to anon, authenticated using (true) with check (true);
create policy "anon all intern_notes"    on public.intern_notes    for all to anon, authenticated using (true) with check (true);

-- 인턴 정보와 예전 기록은 공개 저장소에 올리지 않는 intern-import.sql(로컬 전용)로 넣어요.
-- 새 인턴은 관리자 화면 '+ 인턴 추가'로 만들어요.

notify pgrst, 'reload schema';
