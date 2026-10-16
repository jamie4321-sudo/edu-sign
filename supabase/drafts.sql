-- EDU — 교육 자료 임시보관 (SQL Editor 에서 한 번 실행, 여러 번 실행해도 안전)
alter table public.materials add column if not exists status text not null default 'published';
alter table public.materials add column if not exists updated_by text;
