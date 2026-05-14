# Tourism

React + Vite + Supabase.

**المستودع المقصود:** [hasanjohan17/Tourism](https://github.com/hasanjohan17/Tourism)  
**GitHub Pages (بعد تفعيل Actions):** `https://hasanjohan17.github.io/Tourism/`

> لا تشارك كلمة مرور GitHub أو “صلاحية كاملة” مع أي طرف. استخدم **Personal Access Token** أو **SSH** من جهازك فقط.

## رفع المشروع إلى `Tourism.git` (أول مرة أو نقل من ريبو آخر)

من مجلد المشروع على جهازك:

```bash
# إن كان الريبو فارغاً على GitHub — اربط origin بالريبو الجديد ثم ادفع
git remote remove origin   # فقط إن كنت تريد استبدال الرابط القديم
git remote add origin https://github.com/hasanjohan17/Tourism.git
git branch -M main
git add -A
git commit -m "Initial push: Tourism site"
git push -u origin main
```

إن أردت **الإبقاء على الرابط القديم** وإضافة ريبو جديد:

```bash
git remote add tourism https://github.com/hasanjohan17/Tourism.git
git push -u tourism main
```

عند الطلب منك اسم مستخدم وكلمة مرور في الطرفية، استخدم **PAT** بدل كلمة المرور:  
GitHub → **Settings → Developer settings → Personal access tokens** → صلاحية `repo`.

## التطوير المحلي

راجع [SETUP_SUPABASE.md](SETUP_SUPABASE.md) لمفاتيح Supabase، ثم انسخ `.env.example` إلى `.env.local` وعدّل القيم.

```bash
npm install
npm run dev
```

للبناء بنفس مسار GitHub Pages محلياً:

```bash
set VITE_BASE_PATH=/Tourism/
npm run build
npm run preview
```

(في PowerShell: `$env:VITE_BASE_PATH="/Tourism/"; npm run build`)

## GitHub Pages

1. **Settings → Pages → Build and deployment → Source:** اختر **GitHub Actions**.
2. أي **push** إلى **`main`** يشغّل `.github/workflows/deploy-github-pages.yml`.
3. في **Settings → Secrets and variables → Actions** أضف على الأقل: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (وباقي المتغيرات من `.env.example` إن لزم).
4. الـ workflow يضبط `VITE_BASE_PATH=/Tourism/` تلقائياً ليتوافق مع عنوان الصفحة.

## حذف الحجوزات (RLS)

شغّل في Supabase SQL Editor (أو من `supabase/schema.sql`):

```sql
drop policy if exists "plan_requests_delete_admin" on public.plan_requests;
create policy "plan_requests_delete_admin"
on public.plan_requests for delete
to authenticated
using (public.is_admin());
```

ملف جاهز: `supabase/sql/plan_requests_delete_admin.sql`.
