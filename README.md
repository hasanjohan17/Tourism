# Tourism project

React + Vite + Supabase. Live demo can be hosted on [GitHub Pages](https://pages.github.com/) for repo `tourism-project` at:

`https://hasanjohan17.github.io/tourism-project/`

## ⚡ البدء السريع

### التطوير المحلي

```bash
# 1. اقرأ تعليمات الإعداد
cat SETUP_SUPABASE.md

# 2. أضف مفاتيح Supabase إلى .env.local
# ثم:

npm install
npm run dev
```

زيارة `http://localhost:5174/`

### الاختبار

```bash
# تحقق من أن المتغيرات محملة
node test-env.js
```

## GitHub Pages — لماذا التحديث لا يظهر؟

1. **فعّل GitHub Actions للنشر:** في المستودع → **Settings** → **Pages** → **Build and deployment** → اختر **Source: GitHub Actions** (وليس Branch قديم لـ `gh-pages` إن كان عطلاً).
2. ادفع إلى فرع **`main`** — سيعمل workflow في `.github/workflows/deploy.yml` ويبني المشروع ويرفع `dist` تلقائياً.
3. **مسار الموقع:** المشروع افتراضياً يبني على `base: /` (مناسب لـ Vercel). في GitHub Pages نضبطه من خلال `VITE_BASE_PATH=/tourism-project/` داخل workflow.
4. **🔑 أسرار البناء (مهم):** في **Settings → Secrets and variables → Actions** أضف:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   
   حتى يعمل الموقع على GitHub Pages مع Supabase (اتبع [SETUP_SUPABASE.md](SETUP_SUPABASE.md)).

5. النشر اليدوي القديم: `npm run deploy` (فرع `gh-pages`) — إن كنت ما زلت تستخدمه، شغّله بعد كل تحديث، أو اعتمد Actions فقط لتفادي الازدواجية.

## Vercel

- Framework preset: **Vite**
- Build command: `npm run build`
- Output directory: `dist`
- لا تضف `VITE_BASE_PATH` في Vercel (اتركه فارغاً أو احذفه) حتى يبقى `base=/`.
- أضف متغيّرات البيئة نفسها: `VITE_SUPABASE_URL` و `VITE_SUPABASE_ANON_KEY`

## حذف الحجوزات من Supabase

شغّل في SQL Editor سياسة الحذف (موجودة أيضاً في `supabase/schema.sql`):

```sql
drop policy if exists "plan_requests_delete_admin" on public.plan_requests;
create policy "plan_requests_delete_admin"
on public.plan_requests for delete
to authenticated
using (public.is_admin());
```

المستودع على GitHub: [hasanjohan17/tourism-project](https://github.com/hasanjohan17/tourism-project).
