# لوحة التحكم الإدارية - ملخص الميزات

## 📊 نظرة عامة

تم إنشاء لوحة تحكم إدارية متكاملة تتيح للمسؤولين:
- إدارة حسابات المستخدمين
- إضافة وحذف المناشير السياحية
- إدارة خطط الرحلات

## 🔐 متطلبات الأمان

### جعل مستخدم مسؤول

يجب تشغيل هذا الأمر في SQL Editor في Supabase:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE email = 'your-email@example.com'
);
```

## 📁 البنية

```
src/
├── App.jsx (تم تحديثه مع إضافة AdminDashboard)
└── pages/
    └── AdminDashboard.jsx (ملف جديد لوحة التحكم)
```

## 🎯 الميزات الرئيسية

### 1️⃣ إدارة المستخدمين
```
✓ عرض جميع المستخدمين المسجلين
✓ البحث والتصفية
✓ عرض البيانات الشخصية:
  - الاسم والبريد الإلكتروني
  - رقم الهاتف
  - المنطقة/الدولة
  - حالة جواز السفر
  - تاريخ التسجيل
```

### 2️⃣ إدارة المناشير (Destinations)
```
✓ عرض المناشير الحالية
✓ إضافة منشور جديد:
  - العنوان والوصف
  - رابط الصورة
  - الموقع والوسم
  - ترتيب العرض
  - حالة النشر (Published/Draft)
✓ حذف المناشير
```

### 3️⃣ إدارة خطط الرحلات
```
✓ عرض الخطط الحالية
✓ إضافة خطة جديدة:
  - الكود (A, B, C...)
  - الاسم والوصف
  - المدة والسعر
  - لون التصميم
  - وضع مميز (Featured)
  - حالة النشر
✓ حذف الخطط
```

## 🔗 قاعدة البيانات

### جداول مستخدمة:

#### 1. profiles
```sql
- id: UUID (مرجع auth.users)
- first_name: text
- last_name: text
- full_name: text
- email: text
- phone: text
- region: text
- passport_image_url: text
- role: 'admin' | 'traveler'
- created_at: timestamp
- updated_at: timestamp
```

#### 2. destinations
```sql
- id: UUID
- title: text
- tag: text
- description: text
- image_url: text
- location: text
- sort_order: integer
- is_published: boolean
- created_at: timestamp
- updated_at: timestamp
```

#### 3. travel_plans
```sql
- id: UUID
- code: text (A, B, C)
- name: text
- subtitle: text
- duration: text
- price_label: text
- image_url: text
- accent: 'marine' | 'jade' | 'saffron'
- is_featured: boolean
- sort_order: integer
- is_published: boolean
- created_by: UUID (reference to profiles)
- created_at: timestamp
- updated_at: timestamp
```

## 🚀 كيفية الاستخدام

### للوصول إلى لوحة التحكم:

1. سجل دخولك إلى الموقع
2. اضغط على **My Account**
3. ستجد زر **Admin Dashboard** (للمسؤولين فقط)
4. اضغطه للدخول إلى لوحة التحكم

### إضافة منشور سياحي:

1. اختر تبويب **Destinations**
2. اضغط **Add Destination**
3. ملأ البيانات المطلوبة
4. اضغط **Add Destination**
5. سيظهر المنشور فوراً في الموقع

### إضافة خطة رحلة:

1. اختر تبويب **Travel Plans**
2. اضغط **Add Plan**
3. ملأ بيانات الخطة
4. اضغط **Add Plan**
5. ستظهر الخطة في الموقع للعملاء

## ⚠️ ملاحظات هامة

1. **أسماء الصور**: استخدم دائماً `/images/filename.jpg`
2. **الترتيب**: استخدم Sort Order لتحديد التسلسل
3. **النشر**: اختر Published لجعل العنصر مرئياً
4. **حذف المناشير**: سيتطلب تأكيد قبل الحذف
5. **البحث**: يعمل في تبويب المستخدمين فقط حالياً

## 🐛 استكشاف الأخطاء

| المشكلة | الحل |
|-------|------|
| لا أرى لوحة التحكم | تأكد من أن دورك "admin" في قاعدة البيانات |
| الصور لا تظهر | تحقق من أن الصور موجودة في `public/images/` |
| فشل إضافة عنصر | تأكد من ملء جميع الحقول المطلوبة |
| لم تتحدث البيانات | جرب تحديث الصفحة |

## 📝 الملفات المُنشأة/المحدّثة

- ✅ `src/pages/AdminDashboard.jsx` - ملف جديد
- ✅ `src/App.jsx` - تم إضافة المسار والزر
- ✅ `ADMIN_DASHBOARD_GUIDE.md` - دليل الإعداد
