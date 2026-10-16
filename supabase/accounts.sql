-- =========================================================
--  EDU — 관리자 계정 · 권한 (아이디 + 비밀번호)
--  Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 [Run] 하세요. (여러 번 실행해도 안전)
--
--  · 비밀번호는 서버에서 bcrypt(pgcrypto)로 잠가 저장하고, 확인도 서버 함수 안에서만 합니다.
--  · 계정 표(edu_users)는 브라우저(anon)에서 직접 읽거나 쓸 수 없고, 아래 함수로만 다룹니다.
--  · 권한(role): master 총괄 관리자(계정 관리 포함) · admin 관리자(교육 서명 + 교육 자료)
--                editor 자료 담당(교육 자료만) · viewer 보기만
--  · parts: 교육 자료를 만들고 고칠 수 있는 파트 (snack · garden · support). master 는 전부.
--
--  ▶ 맨 아래 "첫 총괄 관리자 만들기" 줄의 비밀번호를 바꾼 뒤 실행하세요.
--    (총괄 관리자가 한 명도 없을 때만 만들어지고, 이미 있으면 아무 일도 하지 않습니다)
-- =========================================================

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.edu_users (
  login_id   text primary key,                 -- 로그인 아이디 (소문자)
  name       text not null default '',
  role       text not null default 'viewer' check (role in ('master','admin','editor','viewer')),
  parts      text[] not null default '{}',
  pw_hash    text not null,
  active     boolean not null default true,
  created_at timestamptz default now(),
  last_login timestamptz
);
create table if not exists public.edu_tokens (
  token      text primary key,
  login_id   text references public.edu_users(login_id) on delete cascade,
  expires_at timestamptz not null
);
-- 정책 없이 RLS 만 켠다 → anon 은 표를 직접 못 본다 (함수만 통과)
alter table public.edu_users  enable row level security;
alter table public.edu_tokens enable row level security;
revoke all on public.edu_users, public.edu_tokens from anon, authenticated;

-- 공용: 사용자 정보 json
create or replace function public._edu_user_json(u public.edu_users) returns json
language sql stable as $$
  select json_build_object('id', u.login_id, 'name', u.name, 'role', u.role, 'parts', u.parts,
                           'active', u.active, 'createdAt', u.created_at, 'lastLogin', u.last_login);
$$;

-- 공용: 토큰 → 사용자 (만료·비활성이면 null)
create or replace function public._edu_who(p_token text) returns public.edu_users
language sql stable security definer set search_path = public as $$
  select u.* from public.edu_tokens t join public.edu_users u on u.login_id = t.login_id
  where t.token = p_token and t.expires_at > now() and u.active limit 1;
$$;

-- 로그인 → { token, user } 또는 null
create or replace function public.edu_login(p_id text, p_pw text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare u public.edu_users; tk text;
begin
  select * into u from public.edu_users where login_id = lower(trim(p_id)) and active;
  if u.login_id is null or u.pw_hash <> crypt(p_pw, u.pw_hash) then
    perform pg_sleep(0.4);              -- 연속 대입 늦추기
    return null;
  end if;
  tk := encode(gen_random_bytes(24), 'hex');
  insert into public.edu_tokens(token, login_id, expires_at) values (tk, u.login_id, now() + interval '30 days');
  delete from public.edu_tokens where expires_at < now();
  update public.edu_users set last_login = now() where login_id = u.login_id;
  return json_build_object('token', tk, 'user', public._edu_user_json(u));
end $$;

create or replace function public.edu_me(p_token text) returns json
language plpgsql security definer set search_path = public as $$
declare u public.edu_users;
begin
  u := public._edu_who(p_token);
  if u.login_id is null then return null; end if;
  return public._edu_user_json(u);
end $$;

create or replace function public.edu_logout(p_token text) returns void
language sql security definer set search_path = public as $$
  delete from public.edu_tokens where token = p_token;
$$;

-- 내 비밀번호 바꾸기
create or replace function public.edu_change_pw(p_token text, p_old text, p_new text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare u public.edu_users;
begin
  u := public._edu_who(p_token);
  if u.login_id is null or u.pw_hash <> crypt(p_old, u.pw_hash) then return false; end if;
  if length(coalesce(p_new, '')) < 4 then raise exception '비밀번호는 4자 이상'; end if;
  update public.edu_users set pw_hash = crypt(p_new, gen_salt('bf')) where login_id = u.login_id;
  delete from public.edu_tokens where login_id = u.login_id and token <> p_token;  -- 다른 기기는 로그아웃
  return true;
end $$;

-- ── 총괄 관리자 전용: 계정 목록 · 추가/수정 · 삭제 ──
create or replace function public.edu_users_list(p_token text) returns json
language plpgsql security definer set search_path = public as $$
declare u public.edu_users;
begin
  u := public._edu_who(p_token);
  if u.role is distinct from 'master' then raise exception '권한 없음'; end if;
  return coalesce((select json_agg(public._edu_user_json(x) order by x.created_at) from public.edu_users x), '[]'::json);
end $$;

-- p_pw 가 비어 있으면 비밀번호는 그대로 (새 계정은 꼭 필요)
create or replace function public.edu_user_save(p_token text, p_id text, p_name text, p_role text, p_parts text[], p_active boolean, p_pw text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare u public.edu_users; lid text := lower(trim(p_id)); x public.edu_users;
begin
  u := public._edu_who(p_token);
  if u.role is distinct from 'master' then raise exception '권한 없음'; end if;
  if lid !~ '^[a-z0-9._-]{2,30}$' then raise exception '아이디는 영문 소문자·숫자·._- 2~30자'; end if;
  if p_role not in ('master','admin','editor','viewer') then raise exception '권한 값 오류'; end if;
  if lid = u.login_id and (p_role <> 'master' or not p_active) then raise exception '내 계정의 총괄 권한은 끌 수 없어요'; end if;
  select * into x from public.edu_users where login_id = lid;
  if x.login_id is null then
    if length(coalesce(p_pw, '')) < 4 then raise exception '비밀번호는 4자 이상'; end if;
    insert into public.edu_users(login_id, name, role, parts, active, pw_hash)
    values (lid, coalesce(p_name, ''), p_role, coalesce(p_parts, '{}'), coalesce(p_active, true), crypt(p_pw, gen_salt('bf')));
  else
    update public.edu_users set name = coalesce(p_name, ''), role = p_role, parts = coalesce(p_parts, '{}'), active = coalesce(p_active, true),
      pw_hash = case when length(coalesce(p_pw, '')) >= 4 then crypt(p_pw, gen_salt('bf')) else pw_hash end
    where login_id = lid;
    if length(coalesce(p_pw, '')) >= 4 or not coalesce(p_active, true) then delete from public.edu_tokens where login_id = lid; end if;
  end if;
  select * into x from public.edu_users where login_id = lid;
  return public._edu_user_json(x);
end $$;

create or replace function public.edu_user_delete(p_token text, p_id text) returns boolean
language plpgsql security definer set search_path = public as $$
declare u public.edu_users;
begin
  u := public._edu_who(p_token);
  if u.role is distinct from 'master' then raise exception '권한 없음'; end if;
  if lower(trim(p_id)) = u.login_id then raise exception '내 계정은 지울 수 없어요'; end if;
  delete from public.edu_users where login_id = lower(trim(p_id));
  return true;
end $$;

-- 첫 총괄 관리자 만들기 (총괄이 한 명도 없을 때만)
create or replace function public._edu_bootstrap(p_id text, p_name text, p_pw text) returns text
language plpgsql security definer set search_path = public, extensions as $$
begin
  if exists (select 1 from public.edu_users where role = 'master') then return '이미 총괄 관리자가 있어요 (그대로 둠)'; end if;
  insert into public.edu_users(login_id, name, role, parts, pw_hash)
  values (lower(trim(p_id)), p_name, 'master', '{snack,garden,support}', crypt(p_pw, gen_salt('bf')));
  return '총괄 관리자를 만들었어요: ' || lower(trim(p_id));
end $$;

revoke all on function public._edu_bootstrap(text, text, text) from public, anon, authenticated;
revoke all on function public._edu_who(text) from public, anon, authenticated;
grant execute on function public.edu_login(text, text), public.edu_me(text), public.edu_logout(text), public.edu_change_pw(text, text, text),
  public.edu_users_list(text), public.edu_user_save(text, text, text, text, text[], boolean, text), public.edu_user_delete(text, text)
  to anon, authenticated;

-- ▶ 첫 총괄 관리자: 아이디 jamie, 비밀번호를 '여기에_비밀번호' 대신 원하는 값(4자 이상)으로 바꿔서 실행
select public._edu_bootstrap('jamie', '제이미', '여기에_비밀번호');
