# رحلات الشام

واجهة React/Vite/Tailwind لموقع سياحة وسفر عربي، مع باقات أولية A/B/C وتجهيز تسجيل دخول عبر Supabase.

## التشغيل

```bash
npm install
npm run dev
```

## إضافة صور

ضع الصور داخل:

```text
public/images
```

ثم أضفها أو اربطها من:

```text
src/data/travelData.js
```

## تعديل الباقات

الباقات موجودة في:

```text
src/data/travelData.js
```

يمكنك تغيير الاسم، السعر، المدة، الصورة، والنقاط لكل خطة، أو إضافة خطة جديدة بنفس الشكل.

## ربط Supabase

شغل ملف قاعدة البيانات أولاً من Supabase Dashboard > SQL Editor:

```text
supabase/schema.sql
```

انسخ `.env.example` إلى ملف جديد باسم `.env` ثم ضع القيم من مشروع Supabase:

```text
VITE_SUPABASE_URL=https://segarcgeorhqzcaaeaxp.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

بعدها أعد تشغيل السيرفر المحلي.

الواجهة ستقرأ الباقات والوجهات من Supabase عند توفر المفاتيح، وسترجع تلقائياً للبيانات المحلية إذا لم تكن القاعدة جاهزة بعد.
