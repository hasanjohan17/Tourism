# إعداد Passport Images Storage Bucket

## الخطوات المطلوبة لحفظ صور جواز السفر

### 1. إنشاء Storage Bucket
1. انذهب إلى لوحة التحكم Supabase
2. اختر **Storage** من القائمة الجانبية
3. انقر على **Create new bucket**
4. أدخل الاسم: `passport_images`
5. **غير مهم**: اختر **Private** (وليس Public)
6. انقر **Create bucket**

### 2. إعداد Row Level Security (RLS)
بعد إنشاء الـ bucket:
1. اختر الـ bucket `passport_images`
2. اذهب إلى تبويب **Policies**
3. انقر **New policy** وأضف:

#### Policy 1 - SELECT (للعرض)
```
Policy name: Allow authenticated users to view their own passports
Permission: SELECT
Target role: authenticated
Expression: (bucket_id = 'passport_images'::text) AND (auth.uid()::text = (storage.foldername(name))[1])
```

#### Policy 2 - INSERT (للرفع)
```
Policy name: Allow authenticated users to upload passports
Permission: INSERT
Target role: authenticated
Expression: (bucket_id = 'passport_images'::text)
```

#### Policy 3 - DELETE (للحذف)
```
Policy name: Allow authenticated users to delete their own passports
Permission: DELETE
Target role: authenticated
Expression: (bucket_id = 'passport_images'::text) AND (auth.uid()::text = (storage.foldername(name))[1])
```

### 3. تشغيل Schema Script
1. انسخ محتويات ملف `supabase/schema.sql`
2. اذهب إلى Supabase Dashboard > SQL Editor
3. ألصق الكود واضغط **Run**
4. تأكد من إضافة الأعمدة الجديدة إلى جدول `profiles`

## ملاحظات مهمة
- صور جواز السفر تُخزن بشكل آمن في Private bucket
- كل صورة مرتبطة برقم المستخدم
- يمكن للمستخدم فقط رؤية وحذف صوره الخاصة
