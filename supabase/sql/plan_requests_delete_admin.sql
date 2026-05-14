-- لوحة التحكم: حذف الحجوزات — يتطلب سياسة DELETE للأدمن
drop policy if exists "plan_requests_delete_admin" on public.plan_requests;
create policy "plan_requests_delete_admin"
on public.plan_requests for delete
to authenticated
using (public.is_admin());
