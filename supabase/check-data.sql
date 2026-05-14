-- تحقق من البيانات والأعمدة في جدول profiles
-- انسخ وشغل هذا في Supabase SQL Editor

-- 1. تحقق من أعمدة الجدول
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. عرض كل المستخدمين والبيانات
SELECT id, email, first_name, last_name, full_name, phone, region, role, created_at
FROM public.profiles
ORDER BY created_at DESC;

-- 3. تحقق من auth.users والبيانات في user_metadata
SELECT id, email, user_metadata, created_at
FROM auth.users
ORDER BY created_at DESC;

-- 4. عد عدد المستخدمين في كل جدول
SELECT 
  (SELECT COUNT(*) FROM public.profiles) as profiles_count,
  (SELECT COUNT(*) FROM auth.users) as auth_users_count;
