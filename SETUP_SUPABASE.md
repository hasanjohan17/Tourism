# Setup Guide: Adding Supabase Keys

## 🔑 خطوات الإعداد

### **الخطوة 1: احصل على مفاتيح Supabase**

1. اذهب إلى [https://app.supabase.com](https://app.supabase.com)
2. سجّل دخول بحسابك
3. اختر مشروعك من القائمة
4. اذهب إلى **Settings** (الترس) ← **API**
5. ستجد هناك:
   - **Project URL** (ابدأ بـ `https://`)
   - **anon public** (المفتاح العام الآمن)

### **الخطوة 2: أضف القيم إلى `.env.local`**

افتح ملف `.env.local` في المشروع واستبدل القيم:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
```

**مثال واقعي:**
```env
VITE_SUPABASE_URL=https://abcdefgh123456.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **الخطوة 3: اختبر التطوير المحلي**

```bash
# اختبر أولاً أن المتغيرات محملة
node test-env.js

# إذا كان OK، شغّل التطبيق
npm run dev
```

الموقع سيفتح على `http://localhost:5174/`

### **الخطوة 4: للنشر على GitHub Pages**

1. اذهب إلى مستودعك على GitHub
2. **Settings** ← **Secrets and variables** ← **Actions**
3. أضف متغيّرين جديدين:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

4. الآن عند كل `push` سيبني ويرفع تلقائياً ✅

---

## ⚠️ ملاحظات أمان مهمة

- ✅ **Public key** (`anon`) آمن - يمكنك مشاركته
- ❌ **Service role key** - لا تستخدمه أبداً في الـ Frontend
- ✅ `.env.local` في `.gitignore` - لن يُرفع أبداً
- ✅ GitHub Secrets محمي - فقط GitHub Actions يراها

---

## 🐛 استكشاف الأخطاء

**Error: "field to fetch" أو "undefined"**
→ المتغيرات لم تُقرأ. تأكد من:
- ملف `.env.local` موجود
- القيم بدون مسافات إضافية
- أعد تشغيل `npm run dev`

**Error: "Invalid API key"**
→ انسخ المفتاح مرة أخرى بدقة من Supabase

**لا يزال لا يعمل؟**
→ شغّل: `npm run dev -- --debug-env`

