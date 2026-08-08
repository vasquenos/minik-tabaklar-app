-- TarifAI — Data API rollerine DML yetkileri (GRANT)
-- Supabase'in yeni varsayılanında (auto_expose_new_tables = false) public
-- şemada postgres tarafından oluşturulan tablolar anon/authenticated rollerine
-- otomatik açılmaz. RLS politikaları çalışsa bile yetki olmadan tüm API
-- çağrıları reddedilir.
--
-- İlke:
--   - anon: yalnızca okuma (mutasyona kapalı; RLS zaten kayıtları filtreler)
--   - authenticated: tablo üzerinde tüm DML (satır düzeyi izin RLS'te)
-- service_role: Supabase'te varsayılan olarak tüm yetkilere sahiptir,
-- ekstra grant gerekmez.

grant select on table public.recipes to anon;
grant select, insert, update, delete on table public.recipes to authenticated;

grant select on table public.recipe_ingredients to anon;
grant select, insert, update, delete on table public.recipe_ingredients to authenticated;

grant select on table public.recipe_steps to anon;
grant select, insert, update, delete on table public.recipe_steps to authenticated;

grant select on table public.recipe_tags to anon;
grant select, insert, update, delete on table public.recipe_tags to authenticated;

grant select on table public.ai_conversations to anon;
grant select, insert, update, delete on table public.ai_conversations to authenticated;

grant select on table public.ai_messages to anon;
grant select, insert, update, delete on table public.ai_messages to authenticated;
