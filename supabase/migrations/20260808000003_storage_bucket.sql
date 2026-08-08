-- TarifAI — Storage bucket ve politikaları
-- Bucket: recipe-covers (private) — erişim imzalı (signed) URL ile sağlanır.
-- Dosya yapısı: {user_id}/{filename}
-- Böylece RLS, kullanıcının yalnızca kendi klasörüne yazabilmesini garanti eder.

insert into storage.buckets (id, name, public)
values ('recipe-covers', 'recipe-covers', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- INSERT: authenticated kullanıcılar yalnızca kendi klasörlerine yükleyebilir
-- ---------------------------------------------------------------------------
create policy "Users can upload own recipe covers"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'recipe-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- SELECT: kullanıcılar kendi klasörlerindeki nesneleri listeleyebilir
-- (dosyanın kendisini okumak imzalı URL ile yapılır)
-- ---------------------------------------------------------------------------
create policy "Users can list own recipe covers"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'recipe-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- UPDATE / DELETE: yalnızca kendi klasörleri
-- ---------------------------------------------------------------------------
create policy "Users can update own recipe covers"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'recipe-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'recipe-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own recipe covers"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'recipe-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
