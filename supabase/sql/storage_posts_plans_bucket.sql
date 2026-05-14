-- =============================================================================
-- حاوية عامة واحدة: منشورات (posts) + خطط (plans)
-- معرف الحاوية (bucket id): posts-and-plans
-- المجلدات داخل الحاوية (أول جزء من المسار):
--   posts images/<user-uuid>/...
--   plans images/<user-uuid>/...
-- يتطلب وجود دالة public.is_admin() في المشروع (انظر schema.sql الرئيسي).
-- انسخ كامل هذا الملف إلى SQL Editor وشغّله مرة واحدة.
-- =============================================================================

create or replace function public.normalize_storage_path_prefix(path text)
returns text
language sql
immutable
as $$
  select replace(replace(split_part(path, '/', 1), '%20', ' '), '+', ' ');
$$;

insert into storage.buckets (id, name, public)
values ('posts-and-plans', 'posts-and-plans', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "public_images_read" on storage.objects;
drop policy if exists "public_images_admin_insert" on storage.objects;
drop policy if exists "public_images_admin_update" on storage.objects;
drop policy if exists "public_images_admin_delete" on storage.objects;
drop policy if exists "public_images_hyphen_read" on storage.objects;
drop policy if exists "public_images_hyphen_admin_insert" on storage.objects;
drop policy if exists "public_images_hyphen_admin_update" on storage.objects;
drop policy if exists "public_images_hyphen_admin_delete" on storage.objects;
drop policy if exists "posts_plans_media_read" on storage.objects;
drop policy if exists "posts_plans_media_admin_insert" on storage.objects;
drop policy if exists "posts_plans_media_admin_update" on storage.objects;
drop policy if exists "posts_plans_media_admin_delete" on storage.objects;

create policy "posts_plans_media_read"
on storage.objects for select
using (bucket_id = 'posts-and-plans');

create policy "posts_plans_media_admin_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'posts-and-plans'
  and public.is_admin()
  and public.normalize_storage_path_prefix(name) in ('posts images', 'plans images')
);

create policy "posts_plans_media_admin_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'posts-and-plans'
  and public.is_admin()
  and public.normalize_storage_path_prefix(name) in ('posts images', 'plans images')
)
with check (
  bucket_id = 'posts-and-plans'
  and public.is_admin()
  and public.normalize_storage_path_prefix(name) in ('posts images', 'plans images')
);

create policy "posts_plans_media_admin_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'posts-and-plans'
  and public.is_admin()
  and public.normalize_storage_path_prefix(name) in ('posts images', 'plans images')
);
