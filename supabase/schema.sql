-- Tourism website schema for Supabase.
-- Run this file in Supabase Dashboard > SQL Editor.
-- 
-- Storage buckets: run the block near the END of this file (section STORAGE),
-- or use supabase/sql/storage_posts_plans_bucket.sql for the public posts/plans bucket only.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  full_name text,
  phone text,
  role text not null default 'traveler' check (role in ('traveler', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists full_name text,
  add column if not exists phone text,
  add column if not exists region text,
  add column if not exists passport_image_url text;

alter table public.profiles
  add column if not exists email text;

create table if not exists public.destinations (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  tag text,
  description text,
  image_url text not null,
  location text,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.travel_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  subtitle text,
  duration text,
  price_label text,
  image_url text not null,
  accent text not null default 'marine' check (accent in ('marine', 'jade', 'saffron')),
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plan_highlights (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.travel_plans(id) on delete cascade,
  body text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.plan_images (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.travel_plans(id) on delete cascade,
  image_url text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.plan_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  plan_id uuid references public.travel_plans(id) on delete set null,
  plan_code text,
  full_name text not null,
  email text,
  phone text not null,
  travelers_count integer not null default 1 check (travelers_count > 0),
  preferred_date date,
  notes text,
  status text not null default 'new' check (status in ('new', 'contacted', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists destinations_published_order_idx
  on public.destinations (is_published, sort_order, created_at);

create unique index if not exists destinations_image_url_key
  on public.destinations (image_url);

create index if not exists travel_plans_published_order_idx
  on public.travel_plans (is_published, sort_order, created_at);

create index if not exists plan_highlights_plan_order_idx
  on public.plan_highlights (plan_id, sort_order);

create index if not exists plan_images_plan_order_idx
  on public.plan_images (plan_id, sort_order);

create index if not exists plan_requests_user_created_idx
  on public.plan_requests (user_id, created_at desc);

alter table public.plan_requests
  add column if not exists payment_proof_url text;

alter table public.plan_requests
  add column if not exists passport_proof_url text;

alter table public.plan_requests
  add column if not exists booking_type text;

alter table public.plan_requests
  add column if not exists solo_companions int not null default 0;

alter table public.plan_requests
  add column if not exists family_members_count int;

alter table public.plan_requests
  add column if not exists quoted_total_usd int;

alter table public.plan_requests
  add column if not exists price_summary text;

alter table public.plan_requests drop constraint if exists plan_requests_status_check;
alter table public.plan_requests add constraint plan_requests_status_check
  check (status = any (array['new'::text, 'contacted'::text, 'confirmed'::text, 'cancelled'::text, 'rejected'::text]));

alter table public.plan_requests drop constraint if exists plan_requests_booking_type_check;
alter table public.plan_requests add constraint plan_requests_booking_type_check
  check (booking_type is null or booking_type = any (array['solo'::text, 'family'::text]));

alter table public.plan_requests drop constraint if exists plan_requests_solo_companions_check;
alter table public.plan_requests add constraint plan_requests_solo_companions_check
  check (solo_companions >= 0 and solo_companions <= 20);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_destinations_updated_at on public.destinations;
create trigger set_destinations_updated_at
before update on public.destinations
for each row execute function public.set_updated_at();

drop trigger if exists set_travel_plans_updated_at on public.travel_plans;
create trigger set_travel_plans_updated_at
before update on public.travel_plans
for each row execute function public.set_updated_at();

drop trigger if exists set_plan_requests_updated_at on public.plan_requests;
create trigger set_plan_requests_updated_at
before update on public.plan_requests
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, full_name, phone, region, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'region', ''),
    coalesce(new.email, '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.destinations enable row level security;
alter table public.travel_plans enable row level security;
alter table public.plan_highlights enable row level security;
alter table public.plan_images enable row level security;
alter table public.plan_requests enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles for select
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (id = auth.uid())
with check (
  id = auth.uid()
  and role in ('traveler', 'admin')
);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
with check (id = auth.uid() and role = 'traveler');

drop policy if exists "profiles_delete_admin" on public.profiles;
create policy "profiles_delete_admin"
on public.profiles for delete
using (public.is_admin());

drop policy if exists "destinations_public_read" on public.destinations;
create policy "destinations_public_read"
on public.destinations for select
using (is_published = true or public.is_admin());

drop policy if exists "destinations_admin_all" on public.destinations;
create policy "destinations_admin_all"
on public.destinations for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "travel_plans_public_read" on public.travel_plans;
create policy "travel_plans_public_read"
on public.travel_plans for select
using (is_published = true or public.is_admin());

drop policy if exists "travel_plans_admin_all" on public.travel_plans;
create policy "travel_plans_admin_all"
on public.travel_plans for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "plan_highlights_public_read" on public.plan_highlights;
create policy "plan_highlights_public_read"
on public.plan_highlights for select
using (
  exists (
    select 1
    from public.travel_plans
    where travel_plans.id = plan_highlights.plan_id
      and (travel_plans.is_published = true or public.is_admin())
  )
);

drop policy if exists "plan_highlights_admin_all" on public.plan_highlights;
create policy "plan_highlights_admin_all"
on public.plan_highlights for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "plan_images_public_read" on public.plan_images;
create policy "plan_images_public_read"
on public.plan_images for select
using (
  exists (
    select 1
    from public.travel_plans
    where travel_plans.id = plan_images.plan_id
      and (travel_plans.is_published = true or public.is_admin())
  )
);

drop policy if exists "plan_images_admin_all" on public.plan_images;
create policy "plan_images_admin_all"
on public.plan_images for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "plan_requests_insert_public" on public.plan_requests;
create policy "plan_requests_insert_public"
on public.plan_requests for insert
with check (user_id is null or user_id = auth.uid());

drop policy if exists "plan_requests_select_own_or_admin" on public.plan_requests;
create policy "plan_requests_select_own_or_admin"
on public.plan_requests for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "plan_requests_update_admin" on public.plan_requests;
create policy "plan_requests_update_admin"
on public.plan_requests for update
using (public.is_admin())
with check (public.is_admin());

insert into public.destinations (title, tag, description, image_url, location, sort_order)
values
  ('دمشق القديمة', 'تاريخ حي', 'مسار تراثي بين الأسواق والمعالم القديمة.', '/images/damascus%20umaayya.jpg', 'Damascus', 10),
  ('مسرح بصرى', 'آثار رومانية', 'زيارة لأحد أهم المسارح التاريخية في المنطقة.', '/images/Bosra%20roman%20Theatre.jpg', 'Bosra', 20),
  ('قلعة الحصن', 'قلاع وتراث', 'تجربة تاريخية بإطلالة مميزة.', '/images/Homs%20Al%20Hosn%20Castle.jpg', 'Homs', 30),
  ('تدمر', 'حضارة الصحراء', 'وجهة أثرية واسعة ومميزة لمحبي التاريخ.', '/images/palmyra%20nice.jpg', 'Palmyra', 40),
  ('إقامة مريحة', 'فنادق مختارة', 'خيارات إقامة مناسبة للعوائل.', '/images/damascus%20four%20session%20hotel.jpg', 'Damascus', 50),
  ('مطاعم محلية', 'تجربة أصيلة', 'تجربة طعام محلية ضمن المسار.', '/images/damascus%20locale%20resturant.jpg', 'Damascus', 60)
on conflict (image_url) do update
set
  title = excluded.title,
  tag = excluded.tag,
  description = excluded.description,
  location = excluded.location,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.travel_plans (code, name, subtitle, duration, price_label, image_url, accent, is_featured, sort_order)
values
  ('A', 'الخطة A', 'رحلة خفيفة للعائلات', '3 أيام / ليلتان', 'ابتداءً من 299$', '/images/damascus%20umaayya.jpg', 'marine', false, 10),
  ('B', 'الخطة B', 'المسار الثقافي المتوازن', '5 أيام / 4 ليالٍ', 'ابتداءً من 549$', '/images/Bosra%20AL-Sham.jpg', 'jade', true, 20),
  ('C', 'الخطة C', 'تجربة VIP كاملة', '7 أيام / 6 ليالٍ', 'ابتداءً من 899$', '/images/palmyra.jpg', 'saffron', false, 30)
on conflict (code) do update
set
  name = excluded.name,
  subtitle = excluded.subtitle,
  duration = excluded.duration,
  price_label = excluded.price_label,
  image_url = excluded.image_url,
  accent = excluded.accent,
  is_featured = excluded.is_featured,
  sort_order = excluded.sort_order,
  updated_at = now();

with plan_rows as (
  select id, code from public.travel_plans where code in ('A', 'B', 'C')
),
highlight_rows as (
  select plan_rows.id as plan_id, values_table.body, values_table.sort_order
  from plan_rows
  join (
    values
      ('A', 'جولة دمشق القديمة', 10),
      ('A', 'فندق 4 نجوم', 20),
      ('A', 'تنقلات مريحة', 30),
      ('A', 'مرشد محلي', 40),
      ('B', 'دمشق وبصرى', 10),
      ('B', 'جدول عائلي مرن', 20),
      ('B', 'مطاعم منتقاة', 30),
      ('B', 'دعم واتساب', 40),
      ('C', 'دمشق وتدمر والحصن', 10),
      ('C', 'فنادق ممتازة', 20),
      ('C', 'سيارة خاصة', 30),
      ('C', 'تصميم رحلة حسب الطلب', 40)
  ) as values_table(code, body, sort_order)
    on values_table.code = plan_rows.code
)
insert into public.plan_highlights (plan_id, body, sort_order)
select plan_id, body, sort_order
from highlight_rows
where not exists (
  select 1
  from public.plan_highlights
  where plan_highlights.plan_id = highlight_rows.plan_id
    and plan_highlights.body = highlight_rows.body
);

-- After your user signs up, promote your account once from SQL Editor:
-- update public.profiles set role = 'admin' where id = 'YOUR_AUTH_USER_ID';

-- English copy update for the LTR version.
update public.destinations
set
  title = case image_url
    when '/images/damascus%20umaayya.jpg' then 'Old Damascus'
    when '/images/Bosra%20roman%20Theatre.jpg' then 'Bosra Theatre'
    when '/images/Homs%20Al%20Hosn%20Castle.jpg' then 'Al Hosn Castle'
    when '/images/palmyra%20nice.jpg' then 'Palmyra'
    when '/images/damascus%20four%20session%20hotel.jpg' then 'Comfortable stay'
    when '/images/damascus%20locale%20resturant.jpg' then 'Local restaurants'
    else title
  end,
  tag = case image_url
    when '/images/damascus%20umaayya.jpg' then 'Living history'
    when '/images/Bosra%20roman%20Theatre.jpg' then 'Roman ruins'
    when '/images/Homs%20Al%20Hosn%20Castle.jpg' then 'Castles and heritage'
    when '/images/palmyra%20nice.jpg' then 'Desert civilization'
    when '/images/damascus%20four%20session%20hotel.jpg' then 'Selected hotels'
    when '/images/damascus%20locale%20resturant.jpg' then 'Authentic experience'
    else tag
  end,
  description = case image_url
    when '/images/damascus%20umaayya.jpg' then 'A heritage route between old markets and landmarks.'
    when '/images/Bosra%20roman%20Theatre.jpg' then 'A visit to one of the most important historic theatres in the region.'
    when '/images/Homs%20Al%20Hosn%20Castle.jpg' then 'A historical experience with a distinctive view.'
    when '/images/palmyra%20nice.jpg' then 'A wide archaeological destination for history lovers.'
    when '/images/damascus%20four%20session%20hotel.jpg' then 'Accommodation options suitable for families.'
    when '/images/damascus%20locale%20resturant.jpg' then 'A local food experience within the route.'
    else description
  end,
  updated_at = now()
where image_url in (
  '/images/damascus%20umaayya.jpg',
  '/images/Bosra%20roman%20Theatre.jpg',
  '/images/Homs%20Al%20Hosn%20Castle.jpg',
  '/images/palmyra%20nice.jpg',
  '/images/damascus%20four%20session%20hotel.jpg',
  '/images/damascus%20locale%20resturant.jpg'
);

update public.travel_plans
set
  name = case code
    when 'A' then 'Plan A'
    when 'B' then 'Plan B'
    when 'C' then 'Plan C'
    else name
  end,
  subtitle = case code
    when 'A' then 'A light trip for families'
    when 'B' then 'The balanced cultural route'
    when 'C' then 'Full VIP experience'
    else subtitle
  end,
  duration = case code
    when 'A' then '3 days / 2 nights'
    when 'B' then '5 days / 4 nights'
    when 'C' then '7 days / 6 nights'
    else duration
  end,
  price_label = case code
    when 'A' then 'Starting from $299'
    when 'B' then 'Starting from $549'
    when 'C' then 'Starting from $899'
    else price_label
  end,
  updated_at = now()
where code in ('A', 'B', 'C');

delete from public.plan_highlights
where plan_id in (select id from public.travel_plans where code in ('A', 'B', 'C'));

with plan_rows as (
  select id, code from public.travel_plans where code in ('A', 'B', 'C')
),
highlight_rows as (
  select plan_rows.id as plan_id, values_table.body, values_table.sort_order
  from plan_rows
  join (
    values
      ('A', 'Old Damascus tour', 10),
      ('A', '4-star hotel', 20),
      ('A', 'Comfortable transportation', 30),
      ('A', 'Local guide', 40),
      ('B', 'Damascus and Bosra', 10),
      ('B', 'Flexible family schedule', 20),
      ('B', 'Selected restaurants', 30),
      ('B', 'WhatsApp support', 40),
      ('C', 'Damascus, Palmyra, and Al Hosn', 10),
      ('C', 'Excellent hotels', 20),
      ('C', 'Private car', 30),
      ('C', 'Custom trip design', 40)
  ) as values_table(code, body, sort_order)
    on values_table.code = plan_rows.code
)
insert into public.plan_highlights (plan_id, body, sort_order)
select plan_id, body, sort_order
from highlight_rows;

-- =============================================================================
-- STORAGE: buckets + policies (يتوافق مع أسماء الحاويات والمجلدات في الواجهة)
-- الحاوية الخاصة: important images  → passport images / payment images
-- الحاوية العامة (منشورات + خطط): posts-and-plans  → posts images / plans images
--   مثال مسار: posts images/<admin-uuid>/file.jpg
-- المسار داخل الحاوية الخاصة:  "<folder>/<auth.uid>/<filename>"
-- شغّل القسم في SQL Editor. آمن لإعادة التشغيل (حذف وإنشاء سياسات).
-- =============================================================================

-- إزالة سياسات التسمية القديمة إن وُجدت
drop policy if exists "passport_images_select_own" on storage.objects;
drop policy if exists "passport_images_insert_own" on storage.objects;
drop policy if exists "passport_images_update_own" on storage.objects;
drop policy if exists "passport_images_delete_own" on storage.objects;
drop policy if exists "passport_images_admin_all" on storage.objects;
drop policy if exists "site_media_public_read" on storage.objects;
drop policy if exists "site_media_admin_insert" on storage.objects;
drop policy if exists "site_media_admin_update" on storage.objects;
drop policy if exists "site_media_admin_delete" on storage.objects;

insert into storage.buckets (id, name, public)
values ('important images', 'important images', false)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('posts-and-plans', 'posts-and-plans', true)
on conflict (id) do update set public = excluded.public;

-- تطبيع أول جزء من مسار الملف (مسافات قد تُخزَّن كـ %20 في storage.objects.name)
create or replace function public.normalize_storage_path_prefix(path text)
returns text
language sql
immutable
as $$
  select replace(replace(split_part(path, '/', 1), '%20', ' '), '+', ' ');
$$;

drop policy if exists "important_images_user_select" on storage.objects;
create policy "important_images_user_select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'important images'
  and public.normalize_storage_path_prefix(name) in ('passport images', 'payment images')
  and split_part(name, '/', 2) = auth.uid()::text
);

drop policy if exists "important_images_user_insert" on storage.objects;
create policy "important_images_user_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'important images'
  and public.normalize_storage_path_prefix(name) in ('passport images', 'payment images')
  and split_part(name, '/', 2) = auth.uid()::text
);

drop policy if exists "important_images_user_update" on storage.objects;
create policy "important_images_user_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'important images'
  and public.normalize_storage_path_prefix(name) in ('passport images', 'payment images')
  and split_part(name, '/', 2) = auth.uid()::text
)
with check (
  bucket_id = 'important images'
  and public.normalize_storage_path_prefix(name) in ('passport images', 'payment images')
  and split_part(name, '/', 2) = auth.uid()::text
);

drop policy if exists "important_images_user_delete" on storage.objects;
create policy "important_images_user_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'important images'
  and public.normalize_storage_path_prefix(name) in ('passport images', 'payment images')
  and split_part(name, '/', 2) = auth.uid()::text
);

drop policy if exists "important_images_admin_all" on storage.objects;
create policy "important_images_admin_all"
on storage.objects for all
to authenticated
using (bucket_id = 'important images' and public.is_admin())
with check (bucket_id = 'important images' and public.is_admin());

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

-- Optional one-time: fill profile emails from auth for accounts created before email column existed
-- update public.profiles p set email = u.email from auth.users u where p.id = u.id and coalesce(p.email, '') = '';
