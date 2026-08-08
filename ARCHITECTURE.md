# TarifAI — Mimari ve Öğrenme Dokümanı

> Bu doküman "kara kutu yok" ilkesinin kalıcı hali olarak tutulur.
> Amacı iki yönlüdür: (1) projenin neden böyle kurulduğunu, her katmanın ne işe
> yaradığını adım adım anlatmak; (2) bu mimari desenlerin sektörde nerede ve
> neden kullanıldığını göstermek. GELİŞTİRME SIRASI'ndaki her adımda güncellenir.

---

## 1. Proje Özeti

**TarifAI** — aşçının/annenin kendi tariflerini kaydettiği, seçilen bir tarif
hakkında yapay zekaya serbest metin soru sorabildiği kişisel tarif defteridir.

Üç katmanlı bir sistemdir:

```
┌─────────────────────────────────────────────────────────┐
│  Sunum Katmanı (Next.js App Router)                      │
│  • Sayfalar: listeleme, detay, form, AI sohbet paneli     │
│  • Mutasyonlar: Server Actions; AI: /api/ai-chat          │
└───────────────┬───────────────────────┬─────────────────┘
                │ browser + anon key    │ server-only key
                ▼                       ▼
┌──────────────────────────┐   ┌──────────────────────────┐
│  Veri Katmanı (Supabase) │   │  AI Katmanı (Claude)     │
│  • Postgres + RLS         │   │  • Messages API          │
│  • Auth (session cookie)  │   │  • Context-injection     │
│  • Storage (private)      │   └──────────────────────────┘
└──────────────────────────┘
```

Kullanıcı (tarayıcı) doğrudan Supabase'e yalnızca RLS korumalı sorgular atar;
AI API key'i ise asla tarayıcıya inmez, yalnızca Next.js sunucusunda kullanılır.

---

## 2. Teknoloji Seçimleri ve "Neden"

### 2.1 Next.js 14+ (App Router) + TypeScript + Tailwind

**Ne:** Next.js, React tabanlı bir "meta-framework". App Router ile her klasör bir
rota olur; `page.tsx` sayfa, `layout.tsx` ortak iskelet, `route.ts` API ucu.

**Neden:**
- **Server Components (RSC)**: Sayfayı sunucuda render eder; veritabanı sorgusu
  sunucuda çalışır, istemciye yalnızca HTML gider. API key'i istemciye sızdırmadan
  veriye erişmenin doğal yoludur.
- **Route Handlers**: Aynı proje içinde backend yazılır; ayrı bir API sunucusu
  kurma ve CORS yönetme derdi kalkar.
- **TypeScript**: Derleme anında hata yakalar (özellikle `supabase-js` tip
  güvenliğiyle birlikte çok güçlüdür).
- **Tailwind CSS**: Utility-first; hızlı ve tutarlı responsive tasarım.

**Sektörde:** Bu "tüm istemci + sunucu tek repo" yaklaşımına **BFF / backend-for-frontend**,
uygulama olarak da **monolith + edge** mimarisi denir. Vercel, Airbnb, GitHub ve
sayısız startup bu modeli kullanır. Next.js, React'in en yaygın framework'üdür;
Next.js 16'da `middleware` → `proxy` olarak yenilenmiştir (deprecation'dan kaçınmak
için bu projede `proxy.ts` kullanılır).

### 2.2 Supabase (Postgres + Auth + Storage)

**Ne:** Postgres veritabanı, kimlik doğrulama (Auth), dosya deposu (Storage) ve
otomatik REST/GraphQL API sunan yönetilen bir "Backend-as-a-Service" (BaaS).

**Neden:**
- **Postgres**: SQL'in en olgun açık kaynak sürümü; RLS gibi güçlü güvenlik
  özellikleri vardır.
- **Row Level Security (RLS)**: Veritabanı seviyesinde satır bazlı erişim kuralı.
  Uygulama kodu "çirkin" yazılsa bile DB, sahibi olmayan kullanıcıya satır döndürmez.
  Bu **defense-in-depth** (derinlemesine savunma) ilkesinin ta kendisidir.
- **Auth**: Email/şifre kaydını, oturum (session) ve güvenli cookie/token
  yönetimini hazır verir. Plan gereği **custom auth yazılmaz**.
- **Storage**: Fotoğraf yükleme; bucket politikalarıyla dosya düzeyinde izin.

**Sektörde:** BaaS modelinin öncüleri Firebase (Google), Supabase ve Appwrite'tir.
Firebase NoSQL + gerçek zamanlı, Supabase SQL + RLS tarafında konumlanır.
Startuplar "ilk ürünü 3 ayda çıkarma" baskısında BaaS kullanır; büyük şirketler ise
ölçek kritik olan yerde kendi servislerine geçer.

### 2.3 Anthropic Claude (Messages API)

**Ne:** Anthropic'in LLM API'si; `system` + `user`/`assistant` mesajlarıyla
konuşma şeklinde istek alır.

**Neden:** Plan gereği seçildi. Kritik nokta **context-injection**: Claude'a tüm
veritabanını değil, yalnızca seçili tarifin malzemelerini + adımlarını + notlarını
prompt'a gömüp "yalnızca bu verilerle cevapla, bilmediğin şeyi bilmediğini söyle"
talimatı verilecek.

**Sektörde:** Bu, **RAG (Retrieval-Augmented Generation)** fikrinin en basit
halidir. RAG = "dokümanları bul, modele bağlam olarak ver, bağlam dışına çıkma".
Sektörde yardım masası chatbotları, hukuk/medikal özetleme, kurumsal bilgi
asistanları bu deseni kullanır. TarifAI'de "retrieval" kısmı basittir: tek bir
tarifin satırları. Bağlamın **yalnızca ilgili tarifle sınırlı** tutulması hem
halüsinasyonu azaltır hem de kişisel veri sızıntısını önler (prompt injection riski).

### 2.4 Zod

**Ne:** Şema doğrulama kütüphanesi; TypeScript ile tip çıkarımı yapar.

**Neden:** Sunucuya gelen her girdi (tarif formu, AI sohbet mesajı) güvenilmezdir.
Zod ile sunucu tarafında doğrulanır; yanlış tip/boyut reddedilir. Bu, güvenlik
listesinin "input validation" maddesinin karşılığıdır.

**Sektörde:** Yüzlerce projede `zod` standarttır (TRPC'de dahili kullanılır).
Alternatifleri: `joi`, `yup`, `ajv` (JSON Schema).

---

## 3. Klasör Yapısı ve Sorumlulukları

```
tarif-ai/
├── app/
│   ├── page.tsx               → / giriş (landing) sayfası, herkese açık
│   ├── (auth)/                → route group: /login, /register (oturumsuz)
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/           → route group: giriş yapmış kullanıcı alanı
│   │   ├── layout.tsx         → ortak iskelet + header + çıkış butonu
│   │   └── recipes/           → /recipes listesi, /recipes/new (form),
│   │       [id]/[id]/edit     → /recipes/[id] detay, /recipes/[id]/edit,
│   │                           /recipes/[id]/chat (Adım 6/7)
│   ├── auth/callback/route.ts → email onay / OAuth code → session
│   └── api/ai-chat            → Route Handler (Adım 6)
├── components/
│   ├── auth/                  → login/register formları (Server Action + useActionState)
│   ├── ui/                    → shadcn/ui üretilen temel bileşenler
│   ├── recipe-card/           → tarif listesindeki kart
│   ├── recipe-form/           → tarif formu + submit/sil butonları
│   └── ai-chat-panel/         → sohbet paneli (aria-live ile)
├── lib/
│   ├── supabase/client.ts     → tarayıcı tarafı istemcisi (createBrowserClient)
│   ├── supabase/server.ts     → sunucu tarafı istemcisi (cookie tabanlı)
│   ├── auth/actions.ts        → signIn/signUp/signOut server actions
│   ├── recipes/actions.ts     → create/update/deleteRecipe server actions
│   ├── ai/prompt-builder.ts   → Claude prompt'u yalnızca burada üretilir
│   └── validation/recipes.ts  → Zod 4 şemaları (tek doğrulama kaynağı)
├── types/database.ts          → Supabase DB tipleri (gen types çıktısı)
├── proxy.ts                   → route guard (Next 16'da middleware yerine)
└── supabase/migrations/       → tüm DB değişiklikleri (sürüm kontrolü)
```

**Neden böyle ayrılmış?**
- `(auth)` ve `(dashboard)` **route group**'ları URL'i değiştirmeden farklı
  layout'lar uygular. Dashboard altındaki her sayfa oturum kontrolünden geçer.
  Dikkat: `app/page.tsx` ile `(dashboard)/page.tsx` aynı `/` path'ine map olur;
  böyle bir çakışmadan kaçınmak için dashboard ana sayfası `/recipes` üzerindedir.
- `lib/` klasörü "sunucu-ya da-istemci" ayrımını koduyla taşır:
  - `client.ts` `'use client'` context'te çalışır; RLS'e güvenir.
  - `server.ts` yalnızca sunucu komponent/route handler'larda import edilir;
    cookie'leri okur, service-role key'i asla içermez.
- `proxy.ts` yalnızca **optimistic guard**'dır (cookie'deki oturum). Gerçek
  yetkilendirme her sayfa/server action'daki `getUser()` + RLS'tedir.
- `lib/ai/prompt-builder.ts` tek sorumluluk ilkesi (SRP): prompt'u nerede
  oluşturacağımız tek yer. Prompt kuralları değişirse sadece bu dosya değişir.

---

## 4. Veri Modeli (ERD)

```
auth.users (Supabase yönetir)
   │ 1
   │
   │ N
recipes (id, user_id, title, description, servings,
         prep_time_minutes, cook_time_minutes, difficulty,
         category, cover_image_url, notes, created_at, updated_at)
   │
   ├── 1 ─ N recipe_ingredients (name, quantity, unit, order_index)
   ├── 1 ─ N recipe_steps       (step_number, instruction)
   ├── 1 ─ N recipe_tags       (tag_name)
   │
   └── 1 ─ N ai_conversations (user_id, recipe_id)
                 └── 1 ─ N ai_messages (role, content)
```

**Tasarım kararları:**
- `user_id` FK → `auth.users`: Kullanıcılar Supabase Auth'ta yaşar; ayrı bir
  `users` tablosu yazılmaz (plan gereği).
- **1:N ilişkiler** (join tablo yok): Malzeme/adım/etiket tarife aittir, ayrı
  varlık olarak kendi başına bir anlam ifade etmez. Etiket için normalize edilmiş
  ayrı `tags` tablosu "opsiyonel" olarak planda not edilmiş; MVP'de metin kolonu
  yeterli (henüz cross-recipe etiket yönetimi yok). Gerekirse ileride migrate edilir.
- `on delete cascade`: Tarif silinirse alt satırları da temizlenir (orphan kalmaz).
- `updated_at` trigger: `set_updated_at()` fonksiyonu her UPDATE'te `now()` yazar.
  Tarif düzenlenince "değişti" bilgisi doğru olur.
- **Index'ler**: Arama (pg_trgm trigram), kategori ve FK alanlarında. Trigram
  index ("kıyma", "kek" gibi kısmi eşleşme) tarif arama ve malzeme aramasında
  hız için — bu, Postgres'in tam metin aramasının fuzzy hali gibi düşünülebilir.

---

## 5. Güvenlik Modeli (RLS detayı)

**Temel kural:** `auth.uid()` (oturumdaki kullanıcı) sorguya gönderilir; satırın
`user_id`'si onunki değilse satır **görünmez bile olmaz**.

- `recipes`: tüm CRUD `user_id = auth.uid()` şartına bağlı.
- Child tablolar (ingredients/steps/tags): `EXISTS (recipes.user_id = auth.uid())`
  ile sahiplik doğrulanır. Böylece izin kuralı tek yerde (recipes) tanımlı olur,
  çoğalma riski azalır.
- `ai_conversations`: kullanıcı hem konuşmanın sahibi hem de tarifin sahibi olmalı.
- `ai_messages`: konuşma → tarif zinciri üzerinden sahiplik.
- `storage.objects` (recipe-covers, private bucket): dosyalar `{user_id}/...`
  yolunda durur; RLS `storage.foldername(name)[1]` ile klasörün kullanıcıya ait
  olduğunu doğrular. Görüntüleme **imzalı URL** ile yapılır (private bucket).

**Bu model neden doğru?** Çünkü yetkilendirme "uygulamanın iyi niyetine" değil,
**veritabanının zorunlu kuralına** dayanır. Hangi istemci hangi endpoint'e istek
atarsa atsın, DB dışarı sızmaz. Sektörde bu, "enforce at the data layer" ilkesidir.

---

## 6. Geliştirme Yolu ve Bu Adımın Karşılığı

| Sıra | Adım | Bu dokümandaki karşılığı | Durum |
|-----|------|--------------------------|-------|
| 1 | Supabase kurulumu, migration, RLS | `supabase/migrations/*.sql`, `types/database.ts` | ✅ Tamam (grant düzeltmesi dahil) |
| 2 | Auth akışı + proxy guard | `lib/supabase/*`, `proxy.ts`, `(auth)` sayfaları | ✅ Tamam (uçtan uca test edildi) |
| 3 | Tarif CRUD + validasyon | `lib/recipes/actions.ts`, `lib/validation/recipes.ts`, `recipe-form` | ✅ Tamam (server actions + Zod 4) |
| 4 | Listeleme, arama, filtreleme | `app/(dashboard)/`, `recipe-card` | |
| 5 | Fotoğraf yükleme | Storage API + `recipe-form` | |
| 6 | AI katmanı | `lib/ai/prompt-builder.ts`, `app/api/ai-chat` | |
| 7 | AI sohbet UI | `ai-chat-panel` | |
| 8 | Erişilebilirlik/responsive cilası | tüm bileşenler | |
| 9 | Güvenlik denetimi | RLS testleri, rate limiting, Zod testleri | |

---

## 7. Sektör Bağlamı (bu projeyle öğrenilenler daha büyük sistemlere nasıl taşınır)

- **BFF deseni** → şirketlerde `backend-for-frontend` mikroservisleri.
- **RLS / data-layer enforcement** → bankacılık ve sağlık uygulamalarında zorunlu;
  "uygulamada değil veride güvenlik" prensibi.
- **Context-injection AI** → RAG sistemleri: yardım masaları, kurumsal arama,
  belge özetleme. TarifAI'de tek tablo olan "retrieval", büyük sistemlerde
  vektör veritabanları (pgvector, Pinecone, Weaviate) ile yapılır.
- **Migration tabanlı şema yönetimi** → her DB değişikliğinin SQL dosyası olması;
  ekiplerde sürüm kontrolü, code review ve geri dönüş imkânı sağlar (Liquibase,
  Flyway, Prisma Migrate ile aynı felsefe).
- **Signed URL ile güvenli dosya sunumu** → CDN'de özel içerik (ödemeli ders,
  kişisel belge) sunan her serviste standarttır (AWS S3 Presigned URL, GCS Signed URL).

---

## 8. Sözlük (İlk Proje İçin)

| Terim | Anlam |
|------|-------|
| RSC | React Server Component — sayfayı sunucuda render eden bileşen |
| Route Handler | `app/api/*/route.ts` içindeki HTTP uç noktası |
| Route Group | `(isim)` klasörü; URL'i etkilemeden layout/orta katman |
| RLS | Row Level Security — satır bazlı erişim kuralı |
| FK / PK | Foreign Key (ilişki) / Primary Key (benzersiz kimlik) |
| Cascade Delete | Üst satır silinince alt satırların da silinmesi |
| Signed URL | Süreli, imzalı dosya erişim adresi |
| BaaS | Backend-as-a-Service; hazır backend (auth, db, storage) |
| RAG | Retrieval-Augmented Generation; bağlam vererek AI'a cevap ürettirme |
| Prompt Injection | Kullanıcının AI'ı sistem talimatlarını atlatmaya zorlaması |

---

*Bu doküman her geliştirme adımında güncellenir. Mevcut durum ve kararlar için
`CHANGELOG.md` ve `DECISIONS.md` dosyalarına bakınız.*
