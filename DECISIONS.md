# DECISIONS.md — TarifAI karar kaydı

Bu dosya mimarinin "neden?" sorularını kaydeder. Her geliştirme adımının sonunda
güncellenir. Mimari anlatım için `ARCHITECTURE.md`'ye bakınız.

## Kararlar
- Next.js 16 kullanılıyor (plan "14+" diyor, koşulu sağlıyor). Next 16'da middleware
  deprecate edilip proxy.ts olduğu için route guard'da plan dosyası adı middleware.ts yerine
  proxy.ts kullanılacak. (Next.js'in resmi migration yönü.)
- Migration'lar 3 dosyaya bölündü (schema / rls / storage): tek amaçlı, debug'ı kolay.
  Doğrulama sırasında 4. migration eklendi: `api_grants.sql` (aşağıda "Adım 1 bulgusu").
- RLS'de security definer helper fonksiyon YERİNE her policy'de inline EXISTS alt sorgusu
  kullanıldı. Neden: definer fonksiyonu RLS'i bypass eder (daha riskli), inline sorgu ise
  mevcut kullanıcının RLS bağlamında çalışır; "izin kuralı tek yerde" prensibi korunur.
- Storage bucket PRIVATE + imzalı URL akışı seçildi (public CDN yerine). Kişisel tarif
  fotoğrafları herkese açık olmamalı; AWS S3 Presigned URL ile aynı desen.
- Etiketler normalize edilmiş ayrı tags tablosu yerine recipe_tags metin kolonu ile tutuldu
  (planda opsiyonel not vardı). MVP'de cross-recipe etiket yönetimi yok; gerekirse migrate edilir.
- pg_trgm trigram index'leri title/description/ingredient.name üzerine eklendi: kısmi
  eşleşmeli arama (Adım 4) için hazırlık.
- Yerel kurulum için Docker Desktop + WSL2 gerekiyor; CLI kuruldu ama Docker kurulumu
  kullanıcı tarafında (admin + reboot) bekliyor.

## Adım 1 bulguları (supabase start doğrulaması)
- Migration'lar hatasız uygulandı: 6 tablo, 24 RLS politikası, private `recipe-covers`
  bucket (public = false). Studio 54323, Mailpit 54324, API 54321.
- **ÖNEMLİ BULGU — GRANT eksikliği:** Supabase'in yeni varsayılanında
  (`auto_expose_new_tables = false`) postgres'in oluşturduğu public tablolar
  anon/authenticated/service_role rollerine otomatik açılmıyor. RLS politikaları
  çalışsa bile tablo düzeyinde DML yetkisi olmadığı için TÜM API çağrıları
  "permission denied" döndü. `20260808000004_api_grants.sql` ile düzeltildi:
  - anon → yalnızca `select` (mutasyona kapalı; RLS satırları filtreler)
  - authenticated → `select, insert, update, delete` (satır düzeyi izin RLS'te)
- Doğrulama testleri (node + @supabase/ssr):
  - anon INSERT → reddedildi ("permission denied for table recipes")
  - kullanıcı A ↔ kullanıcı B izolasyonu: B, A'nın tarifini göremez; B'nin
    update/delete'i 0 satır etkiler, veri bozulmaz (RLS sessiz filtre, hata değil).
- **Yeni anahtar formatı:** supabase CLI 2.x artık JWT (anon/service_role) yerine
  `sb_publishable_...` / `sb_secret_...` üretiyor. supabase-js 2.112 bu formatı
  destekliyor. `.env.local` bu değerlerle dolduruldu; env şablonundaki isimler
  (`NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`) korundu.

## Adım 2 kararları (Auth akışı)
- Auth tamamen Supabase'e bırakıldı: `@supabase/ssr` `createBrowserClient` /
  `createServerClient`. Custom token / custom cookie yazılmadı.
- `proxy.ts` (Next 16 middleware karşılığı) SADECE optimistic guard: cookie'deki
  oturumu okur, korumalı rotaya yetkisiz girişi `/login`'e, oturumlu kullanıcının
  `/login|/register|/` ziyaretini `/recipes`'e yönlendirir. Gerçek güvenlik her
  sayfa/server action'da `getUser()` + RLS ile yapılır (Next.js'in "proxy'yi tek
  savunma hattı yapma" tavsiyesine uyuldu).
- **Routing bulgusu:** `app/page.tsx` (→ `/`) ile `app/(dashboard)/page.tsx`
  (→ `/`) aynı path'e map olur ve çakışır; Next bu çakışmayı sessizce çözer,
  dashboard sayfası hiç yüklenmezdi (dev'de `/dashboard` → 404). Çözüm: dashboard
  ana sayfası `(dashboard)/recipes/page.tsx` → `/recipes` yapıldı; `(auth)` ve
  `(dashboard)` route group'ları URL'i etkilemeden ayrı layout uygular.
- Dashboard oturumlu bir kullanıcı için doğal ana sayfa olan tarif listesine
  (`/recipes`) yönlendirir.
- Form akışı: Server Actions + React 19 `useActionState` (Next 16 auth rehberi
  deseni). Zod validasyonu Adım 3'e bırakıldı; şimdilik minimal doğrulama
  (email boş değil, şifre ≥ 6). `lib/auth/actions.ts`: `signIn`, `signUp`, `signOut`.
- E-posta onayı yerelde kapalı (`config.toml` `enable_confirmations = false`);
  `signUp` anında oturum açar ve `/recipes`'e yönlendirir. Yine de `signUp`
  sonucunda session yoksa (prod'da onay açık olursa) "onay e-postası gönderildi"
  mesajı gösterilir; `app/auth/callback/route.ts` code exchange için hazır.
- eslint ignore'larına `supabase/.temp/**` eklendi (Supabase CLI'nin ürettiği
  edge-runtime bundle'ları lint hatalarına yol açıyordu; kaynak kod değiller).

## Adım 3 kararları (Tarif CRUD + Zod validasyonu)
- Mutasyonlar için Route Handler yerine **Server Actions** kullanıldı
  (`lib/recipes/actions.ts`). Gerekçe: auth zaten server action tabanlı, form akışı
  `useActionState` ile aynı desende kalıyor; revalidatePath + redirect tek katmanda,
  ayrı REST ucu ve client state yönetimi gerekmiyor. (ARCHITECTURE'ın `app/api/recipes`
  notu, form tabanlı bu akışta server action'a çevrildi — "kara kutu yok" ilkesi korundu.)
- **Zod 4**: `lib/validation/recipes.ts` tek gerçeklik kaynağı. Boş seçimli sayı alanları
  `z.preprocess` ile `""`/`null` → `undefined`'a çevrilir (yoksa `Number("")=0` tuzağı
  pozitifliği bozar). Etiketler şema içinde küçük harfe çevrilip tekil hale getirilir.
  Hatalar alan bazlı tek mesaja indirgenir (`toFieldErrors`), form alan altında gösterilir.
- **FormData kodlaması**: dinamik malzeme/adım listeleri `name="...[]"` sonekiyle
  gönderilir, `getAll()` ile sıralı okunur. Rastgele indeks yerine bu desen seçildi
  (çok satırlı formlarda yaygın ve güvenilir).
- Çocuk kayıtlar (malzeme/adım/etiket) ana tarifle sırayla yazılır. Gerçek bir
  transaction yok (supabase-js tarafında); çocuk insert'i hata verirse ana kayıt
  best-effort geri alınır. MVP için kabul; gerekirse RPC ile transaction'a geçilir.
- Güncelleme en basit yaklaşımla yapılır: ana satır update, çocuklar silinip yeniden
  yazılır (ID'leri korumak MVP için gerekli değil).
- `proxy.ts`'te `/recipes` önek eşleşmesi zaten `/recipes/new`, `/recipes/[id]`,
  `/recipes/[id]/edit`'i kapsıyor; matcher değişmedi. Gerçek güvenlik her action'da
  `getUser()` + `.eq("user_id", user.id)` + RLS.
- Silme akışı `deleteRecipe(id)` server action + `useFormStatus` pending butonu.
  `bind(null, id)` ile ekstra argüman taşınır (Next forms rehberi).

## Ertelenenler / eksikler
- Adım 1: TAMAMLANDI — migration'lar uygulandı ve doğrulandı (grant düzeltmesi dahil).
- Adım 2: TAMAMLANDI — auth akışı, proxy guard, sayfalar; uçtan uca test edildi.
- Adım 3: TAMAMLANDI — tarif CRUD (server actions + Zod 4) sayfalarıyla; uçtan uca
  CRUD ve validasyon testleri geçti. Kapsam dışı: gerçek transaction (RPC), dosya yükleme.
- Listeleme arama/filtreleme (Adım 4) geliyor.
- Rate limiting yok (Adım 9'a ertelendi).
- File upload tip/boyut kısıtlaması (Zod + Storage) Adım 5'te gelecek.

## Güvenlik/Erişilebilirlik kontrol listesi durumu
- Karşılanan: RLS tüm tablolarda (her kullanıcı yalnızca kendi verisi — uçtan uca
  doğrulandı), storage bucket politikaları, API key'in NEXT_PUBLIC_ olmaması kuralı
  (.env şablonunda sabitlendi), anon rolü yalnızca okuma (yazma yetkisi yok),
  proxy route guard, session cookie yönetimi tamamen Supabase'te, server-side Zod
  validasyonu (Adım 3) her mutasyon action'ında.
- Henüz karşılanmayan: AI prompt izolasyonu (Adım 6), rate limiting (Adım 9),
  XSS sanitize (Adım 8), erişilebilirlik maddeleri (Adım 8).
