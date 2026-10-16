-- =========================================================
--  EDU — 크루 교육 자료 열람 · '다 봤어요' 기록 (이수 현황 1단계)
--  Supabase 대시보드 > SQL Editor 에 붙여넣고 [Run] (여러 번 실행해도 안전)
--
--  · 크루가 교육 자료 페이지(library.html)에 내 이름으로 들어와
--    자료를 열면 first_at · last_at · views, 끝까지 보고 '다 봤어요'를 누르면 done_at 이 남아요.
--  · 한 사람 · 한 자료당 한 줄 (id = 자료id:이름)
--  · 서명 받는 교육의 이수는 기존 교육 서명(roster.signature)으로 판단해요.
-- =========================================================

create table if not exists public.material_views (
  id          text primary key,            -- '<자료 id>:<이름>'
  material_id text not null,
  name        text not null,
  dept        text,
  first_at    timestamptz default now(),   -- 처음 연 때
  last_at     timestamptz default now(),   -- 마지막으로 연 때
  views       integer not null default 1,  -- 연 횟수
  done_at     timestamptz                  -- '다 봤어요' 누른 때 (이수)
);
create index if not exists material_views_material_idx on public.material_views(material_id);
create index if not exists material_views_name_idx on public.material_views(name);

-- 교육 서명과 같은 운영 모델 (링크를 아는 사람은 기록 가능)
alter table public.material_views enable row level security;
drop policy if exists "anon all material_views" on public.material_views;
create policy "anon all material_views" on public.material_views for all
  to anon, authenticated using (true) with check (true);

-- 열기 / 다 봤어요 기록: 처음이면 새 줄, 있으면 횟수 +1 (done 이면 done_at 도 남김, 이미 있으면 처음 기록 유지)
create or replace function public.edu_material_view(p_material text, p_name text, p_dept text, p_done boolean)
returns void language sql security definer set search_path = public as $$
  insert into public.material_views as v (id, material_id, name, dept, done_at)
  values (p_material || ':' || p_name, p_material, p_name, p_dept, case when p_done then now() end)
  on conflict (id) do update set
    last_at = now(),
    dept    = coalesce(excluded.dept, v.dept),
    views   = v.views + case when p_done then 0 else 1 end,
    done_at = coalesce(v.done_at, excluded.done_at);
$$;
grant execute on function public.edu_material_view(text, text, text, boolean) to anon, authenticated;
