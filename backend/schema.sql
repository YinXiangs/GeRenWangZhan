begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;
-- Run in the selected Supabase project after the owner account is created.
-- Bind the owner by immutable auth user ID, never by client-supplied email.
create table if not exists public.site_admins (
 user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.site_admins enable row level security;
revoke all on public.site_admins from anon, authenticated;
create or replace function private.is_site_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.site_admins where user_id = auth.uid()); $$;
revoke all on function private.is_site_admin() from public;
grant execute on function private.is_site_admin() to anon, authenticated;
create table if not exists public.journal_posts (
 id text primary key,
 title text not null check(length(title) between 1 and 200),
 category text not null check(category in ('life','study','work','portrait','art','photo')),
 body text not null default '' check(length(body)<=100000),
 images jsonb not null default '[]' check(jsonb_typeof(images)='array' and jsonb_array_length(images)<=30),
 status text not null default 'draft' check(status in ('draft','published')),
 date timestamptz not null default now()
);
alter table public.journal_posts enable row level security;
create policy "public reads published posts" on public.journal_posts for select to anon,authenticated
using(status='published' or private.is_site_admin());
create policy "owner creates posts" on public.journal_posts for insert to authenticated with check(private.is_site_admin());
create policy "owner updates posts" on public.journal_posts for update to authenticated using(private.is_site_admin()) with check(private.is_site_admin());
create policy "owner deletes posts" on public.journal_posts for delete to authenticated using(private.is_site_admin());
grant select on public.journal_posts to anon,authenticated;
grant insert,update,delete on public.journal_posts to authenticated;
-- Private storage: draft attachments are not anonymously readable.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('journal-media','journal-media',false,8388608,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
create policy "owner manages media" on storage.objects for all to authenticated
using(bucket_id='journal-media' and private.is_site_admin())
with check(bucket_id='journal-media' and private.is_site_admin());
create policy "public reads published attachments" on storage.objects for select to anon,authenticated
using(bucket_id='journal-media' and exists(
 select 1 from public.journal_posts p
 where p.status='published' and p.images ? storage.objects.name
));

commit;

