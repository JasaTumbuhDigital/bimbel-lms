# Technical Spec Document (TSD)
## Fitur: Blog / Artikel

**Versi:** 2.0
**Tanggal:** 2 September 2026
**Terkait dokumen:** PRD.md (v2.6, direvisi bersamaan) · SDD.md (v1.5) · Implementation-Plan.md (v2.11, direvisi bersamaan, Fase 6) · TSD-Auth-Account-Management.md (v1.1, dependency) · TSD-Course-Content.md (v1.6, dependency ringan — pola upload gambar)

> **Ringkasan perubahan v2.0 (perombakan setelah didiskusikan ulang):**
> 1. **Editor jadi WYSIWYG (TipTap)**, bukan Markdown lagi — konten disimpan sebagai **JSON** (dokumen native TipTap), bukan string Markdown/HTML (alasan keamanan, lihat A1).
> 2. **Approval workflow ditambahkan** — `isPublished: Boolean` diganti jadi `status: draft | pending_review | published`. Tutor submit, admin approve/reject (A7).
> 3. **Hak co-author dipersempit** — cuma boleh edit isi (judul, konten, excerpt, cover image), **tidak** boleh sentuh kategori/tag/slug/SEO/status/co-author lain (A3, direvisi total).
> 4. Ditambah **§1.5 Tier 1 vs Tier 2** — memetakan mana yang masuk sekarang, mana yang kandidat upgrade nanti.

---

## 1. Overview & Scope

### 1.1 Tujuan
Spesifikasi siap-coding untuk modul blog/artikel: builder WYSIWYG (TipTap) dengan gambar, kategori & tag, co-author (hak terbatas ke isi konten), approval workflow, dan SEO metadata dasar per artikel.

### 1.2 FR yang Dicakup

| FR | Deskripsi (direvisi, lihat PRD v2.6) |
|---|---|
| FR-35 | Blog/artikel dengan kategori, tag, co-author (hak terbatas), editor WYSIWYG + gambar, approval workflow, SEO metadata per artikel |

### 1.3 Yang SENGAJA Tidak Dicakup
- **FR-34 (Landing Page)** — tetap di luar cakupan TSD ini (kerja desain/konten/template, bukan spek fitur) — tidak berubah dari v1.0.
- **Komentar pembaca** — dikonfirmasi tidak sekarang, dicatat sebagai kandidat Tier 2 (§1.5).

### 1.4 Keputusan Desain

**A1 — Editor WYSIWYG pakai TipTap, konten disimpan sebagai JSON (bukan HTML/Markdown string):**
TipTap dipilih karena gratis (MIT license), ringan, dan terintegrasi baik dengan React (`@tiptap/react`). Konten disimpan sebagai **JSON** (`editor.getJSON()`), **bukan** HTML mentah (`editor.getHTML()`) — alasannya soal keamanan: HTML string dari editor rich-text yang di-render langsung ke halaman publik (`dangerouslySetInnerHTML`) rawan XSS kalau ada celah di editor/ekstensinya, butuh sanitasi tambahan (mis. DOMPurify) yang gampang lupa dipasang konsisten di semua tempat render. JSON TipTap **secara struktural cuma bisa berisi node/mark yang memang didaftarkan** di daftar ekstensi (`StarterKit`, `Image`, dst) — tidak mungkin ada tag `<script>` nyelip di dalamnya. Render ke publik pakai `generateHTML(json, extensions)` dari `@tiptap/html` (server-side, ekstensi yang sama persis dengan yang dipakai editor).

**Ekstensi TipTap yang dipakai (minimal, Tier 1):** `StarterKit` (bold, italic, heading, paragraph, list, blockquote) + `Image` (untuk gambar yang disisipkan). Tidak ada ekstensi lanjutan (table, embed video, dll) di Tier 1 — lihat §1.5.

**A2 — Kategori (genre/tema) = single-select, dikurasi admin. Tag = multi, bebas dibuat siapa pun (tidak berubah dari v1.0):**
- `BlogCategory` — daftar tetap, **hanya admin** CRUD (mirip pola `ClassLevel`)
- `BlogTag` + `BlogArticleTag` — pola **many-to-many** persis seperti `course_tutors` (Course ↔ Tutor): `BlogTag` adalah entitas tag itu sendiri (bisa dipasang ke banyak artikel), `BlogArticleTag` adalah **tabel penghubung** murni (`articleId` + `tagId`, tanpa data lain) yang merepresentasikan pasangan "artikel ini pakai tag ini". Admin **dan** tutor bisa bikin tag baru langsung dari form artikel (create-on-the-fly, cek nama case-insensitive dulu sebelum insert).

**A3 — Hak akses 3 tingkat: Admin > Author Utama > Co-Author (direvisi total dari v1.0):**

| Aksi | Admin | Author Utama | Co-Author |
|---|:---:|:---:|:---:|
| Edit isi: judul, konten (body), excerpt, cover image | ✅ (artikel siapa pun) | ✅ | ✅ |
| Edit kategori, tag | ✅ | ✅ | ❌ |
| Edit slug | ✅ | ✅ | ❌ |
| Edit field SEO (title/description/image) | ✅ | ✅ | ❌ |
| Tambah/hapus co-author | ✅ | ✅ | ❌ |
| Ajukan untuk review (`submitArticleForReview`) | ✅ (bisa langsung publish, lihat kolom Admin) | ✅ | ❌ |
| Approve/Reject artikel (`approveArticle`/`rejectArticle`) | ✅ | ❌ | ❌ |
| Publish/Unpublish langsung (bypass review) | ✅ | ❌ | ❌ |
| Hapus artikel | ✅ (artikel siapa pun) | ✅ | ❌ |

Intinya: **Co-Author cuma megang "isi artikel"** — persis kata-katamu. Semua yang sifatnya administratif/strategis (taksonomi, SEO, siapa yang boleh ikut nulis, dan terutama **status terbit**) itu hak Author Utama & Admin. Author Utama **tetap tidak bisa langsung publish sendiri** — itu murni privilege Admin (konsekuensi wajar dari approval workflow, A7), tapi Author Utama masih jauh lebih berkuasa dari Co-Author di semua hal lain.

> **Catatan implementasi:** RLS Postgres bekerja di level row, bukan kolom — tidak bisa membedakan "co-author boleh tulis kolom X tapi tidak kolom Y" lewat RLS saja. Makanya tabel di atas diimplementasikan sebagai **beberapa Server Action terpisah** per kelompok field (§4.2–§4.6), bukan 1 fungsi `updateArticle` raksasa — tiap fungsi divalidasi permission-nya sendiri sebelum jalan.

**A4 — Slug unik, auto-generate dari judul, tapi bisa diedit manual (tidak berubah):**
Sama seperti v1.0 — auto kebab-case saat create, editable manual dengan validasi uniqueness saat blur.

**A5 — Hapus kategori TIDAK menghapus artikel, cukup lepas relasinya (`SetNull`, tidak berubah):**
Sama seperti v1.0.

**A6 — Draft/pending_review bisa di-preview oleh yang berhak, lewat URL publik yang sama (disesuaikan ke status baru):**
Sama semangatnya seperti v1.0, cuma sekarang berdasarkan `status !== 'published'` bukan `isPublished === false`.

**A7 — Approval Workflow (BARU):**
`status` jadi enum 3 nilai: `draft → pending_review → published`. Alur:
1. Author Utama (bukan co-author, A3) menulis, simpan sebagai `draft` berkali-kali sesuka hati
2. Kalau sudah siap, Author Utama klik **"Ajukan untuk Review"** (`submitArticleForReview`) → status jadi `pending_review`, `submittedAt` diisi
3. Admin buka antrian review (`/admin/blog/review`), lihat isi artikel, lalu:
   - **Approve** (`approveArticle`) → status jadi `published`, `publishedAt` diisi **kalau ini pertama kali** (tidak berubah kalau sebelumnya sudah pernah published lalu di-unpublish, biar urutan kronologis listing publik tetap stabil)
   - **Reject** (`rejectArticle`, dengan `reviewNote` opsional) → status balik ke `draft`, `reviewNote` disimpan supaya Author Utama tahu apa yang perlu diperbaiki
4. Admin **selalu** bisa bypass alur ini untuk artikel siapa pun — langsung `publishArticle`/`unpublishArticle` dari status apa pun (draft/pending_review/published), tanpa perlu "approve" formal kalau memang tidak perlu (misal artikel admin sendiri)
5. **Unpublish** (oleh Author Utama atau Admin) mengembalikan status ke `draft` — untuk terbit lagi, harus lewat alur submit-review dari awal lagi (tidak ada "auto-republish tanpa review")

---

## 2. Data Model

### 2.1 Prisma Schema

```prisma
enum ArticleStatus {
  draft
  pending_review
  published
}

model BlogCategory {
  id   String @id @default(uuid())
  name String @unique
  slug String @unique

  articles BlogArticle[]

  @@map("blog_categories")
}

model BlogTag {
  id   String @id @default(uuid())
  name String @unique
  slug String @unique

  articles BlogArticleTag[] // lihat A2 — ini cuma daftar "artikel mana aja yang pakai tag ini", lewat tabel penghubung

  @@map("blog_tags")
}

model BlogArticle {
  id             String        @id @default(uuid())
  title          String
  slug           String        @unique
  content        Json          // dokumen TipTap (A1) — BUKAN string Markdown/HTML
  excerpt        String?       // ringkasan singkat untuk card listing (manual, tidak auto-derive dari content)
  coverImageUrl  String?       @map("cover_image_url")
  categoryId     String?       @map("category_id")
  authorId       String        @map("author_id") // "Author Utama" — users.id, role admin ATAU tutor
  status         ArticleStatus @default(draft)
  publishedAt    DateTime?     @map("published_at")
  submittedAt    DateTime?     @map("submitted_at")   // kapan terakhir diajukan review (A7) — buat sortir antrian admin
  reviewNote     String?       @map("review_note")    // feedback admin saat reject, ditimpa tiap kali reject baru
  seoTitle       String?       @map("seo_title")
  seoDescription String?       @map("seo_description")
  seoImageUrl    String?       @map("seo_image_url")
  createdAt      DateTime      @default(now()) @map("created_at")
  updatedAt      DateTime      @updatedAt @map("updated_at")

  category  BlogCategory?          @relation(fields: [categoryId], references: [id], onDelete: SetNull) // A5
  author    User                   @relation("BlogArticleAuthor", fields: [authorId], references: [id])
  coAuthors BlogArticleCoAuthor[]
  tags      BlogArticleTag[]

  @@map("blog_articles")
}

model BlogArticleCoAuthor {
  articleId String @map("article_id")
  userId    String @map("user_id")

  article BlogArticle @relation(fields: [articleId], references: [id], onDelete: Cascade)
  user    User        @relation("BlogArticleCoAuthor", fields: [userId], references: [id], onDelete: Cascade)

  @@id([articleId, userId])
  @@map("blog_article_co_authors")
}

// Tabel penghubung many-to-many BlogArticle <-> BlogTag (A2) — pola sama persis course_tutors
model BlogArticleTag {
  articleId String @map("article_id")
  tagId     String @map("tag_id")

  article BlogArticle @relation(fields: [articleId], references: [id], onDelete: Cascade)
  tag     BlogTag     @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([articleId, tagId])
  @@map("blog_article_tags")
}
```

### 2.2 Constraint Penting
- `slug` unik di `blog_articles`, `blog_categories`, `blog_tags`
- `content: Json` — Prisma & Postgres native `jsonb`, bukan `String` (beda dari v1.0)
- `categoryId` nullable + `onDelete: SetNull` (A5)
- `reviewNote` **tidak** punya histori — cuma menyimpan feedback rejection **terakhir**, bukan log semua rejection sepanjang waktu (konsisten dengan filosofi "state agregat, bukan histori penuh" yang dipakai di modul lain seperti `quiz_progress`)

---

## 3. RLS Policies (Supabase)

### 3.1 Tabel `blog_categories`, `blog_tags`
```sql
CREATE POLICY blog_categories_select ON blog_categories FOR SELECT USING (true);
CREATE POLICY blog_tags_select ON blog_tags FOR SELECT USING (true);

CREATE POLICY blog_categories_write ON blog_categories FOR ALL
USING (EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.role = 'admin'));

CREATE POLICY blog_tags_insert ON blog_tags FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.role IN ('admin', 'tutor')));

CREATE POLICY blog_tags_update_delete ON blog_tags FOR UPDATE
USING (EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.role = 'admin'));
```

### 3.2 Tabel `blog_articles`
```sql
-- SELECT: publik lihat published saja; admin lihat semua; author/co-author lihat draft & pending_review miliknya juga (A6)
CREATE POLICY blog_articles_select ON blog_articles FOR SELECT
USING (
  status = 'published'
  OR EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.role = 'admin')
  OR EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.id = blog_articles.author_id)
  OR EXISTS (
    SELECT 1 FROM blog_article_co_authors bac
    JOIN users u ON u.id = bac.user_id
    WHERE bac.article_id = blog_articles.id AND u.auth_id = auth.uid()
  )
);

-- WRITE (row-level saja — pembatasan kolom ada di Server Action, lihat catatan A3): admin bebas;
-- author & co-author sama-sama boleh WRITE row-nya (kolom mana yang boleh diisi ditentukan Server Action mana yang dipanggil)
CREATE POLICY blog_articles_write ON blog_articles FOR ALL
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.role = 'admin')
  OR EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.id = blog_articles.author_id)
  OR EXISTS (
    SELECT 1 FROM blog_article_co_authors bac
    JOIN users u ON u.id = bac.user_id
    WHERE bac.article_id = blog_articles.id AND u.auth_id = auth.uid()
  )
);
```

---

## 4. Server Actions & Queries

> **Struktur berubah dari v1.0** — dulu 1 fungsi `updateArticle` besar, sekarang dipecah per kelompok field sesuai tabel hak akses A3.

### 4.1 `createArticle`

**FR terkait:** FR-35

**Input:**
```ts
const createArticleSchema = z.object({
  title: z.string().min(3).max(200),
  categoryId: z.string().uuid().optional(),
  tagNames: z.array(z.string().min(1).max(50)).max(10).default([]),
});
```

**Alur logika:**
1. Cek `role` pemanggil `admin` atau `tutor` — selain itu `403`. Pemanggil otomatis jadi `authorId` (Author Utama)
2. Generate `slug` dari `title`, auto-suffix kalau bentrok (sama seperti v1.0)
3. `findOrCreate` tiap `tagNames` di `blog_tags`
4. Insert `blog_articles` (`content: {}` — dokumen TipTap kosong, `status: 'draft'`)
5. Return `{ articleId, slug }` → redirect ke builder (§5.2)

### 4.2 `updateArticleContent` (boleh: Admin, Author Utama, **Co-Author**)

**FR terkait:** FR-35

**Input:**
```ts
const updateArticleContentSchema = z.object({
  articleId: z.string().uuid(),
  title: z.string().min(3).max(200).optional(),
  content: z.any().optional(), // JSON TipTap, divalidasi struktur dasarnya (ada `type: "doc"`) bukan skema penuh
  excerpt: z.string().max(300).optional(),
  coverImageUrl: z.string().url().optional(),
});
```

**Alur logika:**
1. Cek `canEditArticleContent(articleId, currentUser)` — admin, author, **atau co-author** (paling longgar dari semua Server Action di dokumen ini)
2. Update field yang dikirim — **hanya 4 field ini yang boleh masuk skema**, field lain (kategori/tag/slug/SEO/status) sama sekali tidak ada di schema Zod ini, jadi walau co-author kirim field itu di request mentah, Zod `.strict()`/parsing akan mengabaikannya (bukan cuma "tidak dipakai", tapi memang tidak pernah sampai ke query update)

### 4.3 `updateArticleMetadata` (boleh: Admin, Author Utama — **BUKAN** Co-Author)

**FR terkait:** FR-35

**Input:**
```ts
const updateArticleMetadataSchema = z.object({
  articleId: z.string().uuid(),
  slug: z.string().min(3).max(200).optional(),
  categoryId: z.string().uuid().nullable().optional(),
  tagNames: z.array(z.string().min(1).max(50)).max(10).optional(),
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(160).optional(),
  seoImageUrl: z.string().url().optional(),
});
```

**Alur logika:**
1. Cek `canManageArticleFull(articleId, currentUser)` — admin **atau** `authorId === currentUserId` (co-author gagal di sini, ini yang membedakan dari §4.2)
2. Kalau `slug` diubah, cek uniqueness (tolak dengan pesan jelas kalau bentrok, tidak auto-suffix — sama seperti v1.0)
3. Kalau `tagNames` dikirim, replace seluruh relasi `blog_article_tags`
4. Update field lain yang dikirim

### 4.4 `submitArticleForReview` (boleh: Admin, Author Utama — **BUKAN** Co-Author)

**FR terkait:** FR-35 (A7)

**Alur logika:**
1. Cek `canManageArticleFull` (sama seperti §4.3)
2. Validasi `status` saat ini adalah `draft` (tidak bisa submit ulang artikel yang sudah `pending_review`/`published` — tombolnya juga disembunyikan di UI untuk status itu)
3. Update `status: 'pending_review'`, `submittedAt: now()`

### 4.5 `approveArticle` / `rejectArticle` (Admin ONLY)

**FR terkait:** FR-35 (A7)

**Input `rejectArticle`:** `{ articleId: string; reviewNote?: string }`

**Alur logika `approveArticle`:**
1. Cek `role === 'admin'`
2. Update `status: 'published'`; `publishedAt: now()` **hanya jika** `publishedAt` masih `null` (belum pernah published sebelumnya)

**Alur logika `rejectArticle`:**
1. Cek `role === 'admin'`
2. Update `status: 'draft'`, `reviewNote: input.reviewNote ?? null`

### 4.6 `publishArticle` / `unpublishArticle` (bypass langsung, boleh: Admin selalu; Author Utama **hanya** untuk `unpublishArticle`)

**FR terkait:** FR-35 (A7 poin 4-5)

**Alur logika `publishArticle`:** **admin only** (Author Utama tidak pernah bisa langsung publish, harus lewat `submitArticleForReview` → admin approve) — set `status: 'published'`, `publishedAt` sama seperti §4.5

**Alur logika `unpublishArticle`:** admin **atau** Author Utama (co-author tidak bisa) — set `status: 'draft'` (tidak reset `publishedAt`)

### 4.7 `addCoAuthor` / `removeCoAuthor` (boleh: Admin, Author Utama — **BUKAN** Co-Author)

**FR terkait:** FR-35 (A3)

Sama seperti v1.0 §4.5, cuma permission-nya sekarang eksplisit **tidak termasuk** co-author yang sudah ada (co-author tidak bisa menambah/menghapus co-author lain, konsisten tabel A3).

### 4.8 `deleteArticle` (boleh: Admin, Author Utama — **BUKAN** Co-Author)

**FR terkait:** FR-35

Sama seperti v1.0 §4.3, permission disamakan ke `canManageArticleFull` (bukan lagi termasuk co-author).

### 4.9 `uploadArticleImage`

Tidak berubah dari v1.0 §4.6 — dipanggil dari toolbar TipTap (`editor.chain().focus().setImage({ src: url }).run()` setelah upload sukses), boleh dipanggil siapa pun yang punya `canEditArticleContent` (termasuk co-author, karena ini bagian dari "isi artikel").

### 4.10 `getArticleListForPublic` / `getArticleBySlugForPublic` / `getArticleListForManagement`

Sama seperti v1.0 §4.7–§4.9, disesuaikan filter dari `isPublished: true` jadi `status: 'published'`.

### 4.11 `getReviewQueueForAdmin` (BARU, A7)

**FR terkait:** FR-35

```ts
const queue = await prisma.blogArticle.findMany({
  where: { status: "pending_review" },
  include: { author: { select: { name: true } }, category: true },
  orderBy: { submittedAt: "asc" }, // yang paling lama nunggu duluan
});
```
Dipakai untuk halaman `/admin/blog/review` (§5.1b).

### 4.12 Kategori — `createCategory` / `updateCategory` / `deleteCategory`
Tidak berubah dari v1.0 §4.10.

---

## 5. UI Requirements

### 5.1 Listing Manajemen — `/admin/blog` & `/tutor/blog`
- Table dari `getArticleListForManagement`: judul, kategori, **status** (badge Draft/Pending Review/Published — beda dari v1.0 yang cuma 2 status), tanggal update
- Badge "Pending Review" dikasih warna beda (misal kuning) supaya menonjol
- Tombol "+ Tulis Artikel Baru" → `createArticle`

### 5.1b Antrian Review — `/admin/blog/review` (BARU, admin only)
- List dari `getReviewQueueForAdmin`, urut yang paling lama menunggu
- Klik artikel → buka builder dalam mode **read-only preview + 2 tombol besar "Approve" / "Reject"** (reject membuka textarea kecil untuk `reviewNote` opsional sebelum konfirmasi)

### 5.2 Builder Artikel — `/[role]/blog/[id]/edit`
- Field judul, editor **TipTap** (toolbar: Bold, Italic, Heading, List, **Insert Gambar**) — semua field ini + excerpt + cover image **selalu bisa diedit co-author** (§4.2)
- Section metadata (slug, kategori, tag, SEO) — **disembunyikan/read-only untuk co-author** (bukan cuma disabled, supaya co-author tidak bingung kenapa ada field yang tidak bisa diapa-apakan)
- Section Co-Author — **hanya terlihat untuk Author Utama & Admin**
- Banner `reviewNote` kalau ada (artikel baru saja di-reject) — tampil di atas builder untuk Author Utama, hilang otomatis setelah artikel di-submit ulang
- Tombol aksi, tergantung role & status:
  - Co-Author: cuma "Simpan Perubahan Isi" (`updateArticleContent`)
  - Author Utama, status `draft`: "Simpan Draft" + "Ajukan untuk Review"
  - Author Utama, status `pending_review`: builder read-only + pesan "Menunggu review admin"
  - Author Utama, status `published`: "Simpan Perubahan" (langsung update tanpa perlu review ulang untuk edit kecil, sesuai norma umum blog) + "Batalkan Publikasi" (`unpublishArticle`)
  - Admin: semua tombol di atas tersedia kapan pun, tanpa dibatasi status (termasuk "Publish Langsung")

### 5.3 Halaman Publik — `/blog` (Listing) & `/blog/[slug]` (Detail)
- Sama seperti v1.0 §5.3, render konten sekarang via `generateHTML(article.content, extensions)` (A1) alih-alih markdown-to-HTML
- Draft/pending_review yang dibuka lewat preview (A6) dapat banner "Ini pratinjau, artikel belum dipublikasikan"

---

## 6. Edge Cases & Validation Summary

| # | Kondisi | Perilaku yang Diharapkan |
|---|---|---|
| 1 | Co-author coba ubah kategori/tag/slug/SEO lewat manipulasi request langsung ke `updateArticleMetadata` | Ditolak `403` — `canManageArticleFull` gagal untuk co-author (A3, §4.3 poin 1) |
| 2 | Co-author coba submit artikel untuk review, approve, publish, hapus, atau tambah co-author lain (manipulasi request) | Ditolak `403` di masing-masing Server Action terkait (§4.4, §4.5, §4.6, §4.7, §4.8) — semuanya pakai `canManageArticleFull`, bukan `canEditArticleContent` |
| 3 | Author Utama coba `publishArticle` langsung (skip review) | Ditolak `403` — fungsi ini admin only (§4.6), Author Utama cuma punya `submitArticleForReview` |
| 4 | Admin reject artikel yang sudah pernah di-approve sebelumnya, direvisi, submit ulang, lalu di-approve lagi | `publishedAt` tetap tanggal approve **pertama**, tidak berubah jadi tanggal approve kedua (§4.5) |
| 5 | 2 judul artikel menghasilkan slug sama saat create | Auto-suffix angka, create tetap sukses (tidak berubah dari v1.0) |
| 6 | Admin hapus kategori yang masih dipakai artikel | `categoryId` jadi `null`, artikel tidak terhapus (A5, tidak berubah) |
| 7 | Publik buka artikel berstatus `draft`/`pending_review` | 404, kecuali admin/author/co-author (preview, A6) |
| 8 | Konten artikel (JSON TipTap) berisi struktur yang rusak/tidak valid (misal dari bug client) | `generateHTML` di sisi publik dibungkus try-catch, fallback ke pesan "Konten tidak bisa ditampilkan" alih-alih crash seluruh halaman |

---

## 7. Dependencies

| Dependency | Kebutuhan Spesifik di Modul Ini |
|---|---|
| `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-image` | Editor WYSIWYG di builder (§5.2) |
| `@tiptap/html` | `generateHTML()` untuk render JSON → HTML di sisi publik (§5.3), server-side, ekstensi sama persis dengan editor |
| TSD-Auth-Account-Management.md (v1.1) | Model `User`, daftar tutor/admin untuk dropdown co-author |
| TSD-Course-Content.md (v1.6) | Pola `uploadDocument`/Supabase Storage upload di-reuse untuk `uploadArticleImage` |
| Next.js `generateMetadata` | SEO per artikel |

---

## 8. Acceptance Criteria

- [ ] Co-author cuma bisa ubah judul/konten/excerpt/cover image — dicoba ubah kategori/tag/slug/SEO lewat request langsung, semua ditolak 403
- [ ] Co-author tidak bisa submit review, approve, publish, hapus, atau kelola co-author lain — semua ditolak 403
- [ ] Author Utama bisa submit untuk review tapi **tidak bisa** langsung publish sendiri
- [ ] Admin bisa approve/reject dari antrian `/admin/blog/review`, dan bisa bypass langsung publish/unpublish kapan pun tanpa terikat status
- [ ] Reject menyimpan `reviewNote` dan menampilkannya ke Author Utama; submit ulang setelah reject berfungsi normal
- [ ] `publishedAt` tidak berubah kalau artikel di-unpublish lalu di-approve ulang
- [ ] Editor TipTap: bold/italic/heading/list berfungsi, insert gambar via upload berhasil & muncul di preview
- [ ] Konten yang disimpan sebagai JSON berhasil di-render jadi HTML yang benar di halaman publik via `generateHTML`
- [ ] Draft/pending_review 404 untuk publik, bisa dibuka (dengan banner preview) oleh admin/author/co-author
- [ ] Semua RLS policy §3 diuji manual per role

---

## 1.5 Tier 1 vs Tier 2

### Tier 1 (cakupan dokumen ini)
- Artikel dengan kategori (single, dikurasi admin) & tag (multi, bebas)
- Editor WYSIWYG (TipTap: bold/italic/heading/list/gambar) — tanpa ekstensi lanjutan (table, video embed, dll)
- Co-author dengan hak terbatas ke isi konten (A3)
- Approval workflow 3-status: draft → pending_review → published (A7)
- SEO metadata dasar per artikel (title/description/og-image)
- Blog publik dengan filter kategori, tag, search judul

### Tier 2 (kandidat upgrade, belum masuk fase manapun di Implementation Plan)
| Fitur | Kenapa ditunda |
|---|---|
| **Komentar pembaca** | Dikonfirmasi tidak sekarang — butuh moderasi tambahan (spam, konten tidak pantas) yang belum ada infra-nya |
| **Artikel terkait otomatis** (related by tag/category) | Nice-to-have, bukan blocking; Tier 1 cukup urut kronologis + filter manual |
| **Jadwal publish** (set tanggal terbit di masa depan, auto-publish) | Butuh scheduled job/cron yang belum ada infra-nya di project ini sama sekali (tidak ada di modul manapun sejauh ini) |
| **Read count / analytics per artikel** | Selaras FR-32/33 (dashboard analytics, sudah Tier 2) — masuk akal digabung nanti, bukan dibangun terpisah lebih dulu |
| **Riwayat revisi/versioning** (lihat histori perubahan konten) | Konsisten dengan filosofi "state agregat, bukan histori penuh" yang dipakai di modul lain (quiz, dst) — kalau dibutuhkan, ini penambahan tabel `blog_article_revisions` terpisah, bukan rombak skema sekarang |
| **Notifikasi WA/email artikel baru ke subscriber** | Reuse infra Fonnte/Wablas yang direncanakan di Fase 10 — masuk akal dibangun bersamaan, bukan duluan |
| **Multi-kategori per artikel** | Sekarang single-select (A2); kalau ada klien yang benar-benar butuh, gampang diubah ke many-to-many (pola sama seperti tag) tanpa migrasi drastis |

Tidak ada satu pun dari daftar Tier 2 ini yang butuh perubahan skema Tier 1 sekarang — semuanya bisa ditambahkan sebagai tabel/kolom baru di atas fondasi yang sudah ada.

---

*TSD ini menggantikan v1.0 sepenuhnya. PRD FR-35 & Implementation-Plan Fase 6 direvisi bersamaan.*
