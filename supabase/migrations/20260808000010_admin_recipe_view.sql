-- Yöneticiler herkese açık olmayan tarifleri de görebilmeli (moderasyon).
-- PostgreSQL UPDATE/DELETE aday satırlarında SELECT politikasını da uygular;
-- admin delete politikasının çalışması için görünürlük şartı.

alter policy "Admins can delete any recipe" on public.recipes rename to "Admins can manage any recipe";

create policy "Admins can view any recipe" on public.recipes
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.user_id = auth.uid() and profiles.is_admin
    )
  );
