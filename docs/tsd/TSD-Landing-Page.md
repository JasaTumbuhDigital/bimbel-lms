# Technical Spec Document (TSD)
## Fitur: Landing Page

**Versi:** 1.0
**Tanggal:** 2 September 2026
**Terkait dokumen:** PRD.md (v2.7, direvisi bersamaan) · SDD.md (v1.6) · Implementation-Plan.md (v2.12, direvisi bersamaan, Fase 6) · TSD-Course-Content.md (v1.7, dependency erat — `CourseCategory` baru) · TSD-Blog-Article.md (v2.0, dependency ringan — embed artikel terbaru)

---

## 1. Overview & Scope

### 1.1 Tujuan
Spesifikasi struktur landing page (`/`, route group `(public)`): section apa saja, dari mana datanya (config statis vs query live), dan bagaimana tiap section berperilaku kalau datanya kosong. **Bukan** spek desain visual — 2-3 template visual disiapkan terpisah sebagai contoh umum, sisanya custom by-request per klien saat replikasi (sesuai arahan awal).

### 1.2 FR yang Dicakup

| FR | Deskripsi |
|---|---|
| FR-34 | Landing page dengan hero, statistik, listing kursus + filter kategori, testimoni, branding config-driven |

### 1.3 Keputusan Desain

**B1 — Pengunjung anonymous TIDAK bisa self-enroll (konsekuensi dari Tier 1 tanpa registrasi mandiri):**
Ini penting untuk menentukan apa yang terjadi saat pengunjung klik course card di landing page. Karena Tier 1 **tidak punya halaman "Daftar" publik** (akun cuma dibuat admin, FR-2/FR-31) dan **tidak punya pembayaran** (FR-3/FR-24-26 itu Tier 2), pengunjung anonymous secara struktural **tidak mungkin** langsung enroll sendiri kayak siswa yang sudah login. Jadi section "Program" di landing page **bukan** funnel ke halaman student course yang sama (`/student/courses/[id]`, yang asumsinya sudah ada session siswa) — itu route berbeda untuk konteks berbeda.

**B2 — Halaman preview publik course terpisah: `/program/[id]` (bukan reuse `/student/courses/[id]`):**
Halaman baru, ringan: judul, deskripsi, kategori, daftar nama modul (tanpa lesson/kunci-gembok, karena konsep "terkunci sampai enroll" tidak relevan buat orang yang bahkan belum punya akun), dan CTA besar **"Hubungi Kami untuk Daftar"** (scroll/link ke section Kontak) — bukan tombol "Enroll". Tidak perlu `slug` baru di `Course` untuk ini — cukup pakai `courseId` di URL (`/program/[id]`), SEO per-course bukan requirement eksplisit PRD (beda dari artikel blog yang memang diminta SEO dasar per artikel, FR-35).

**B3 — Statistik institusi: campuran live query + 1 nilai config manual:**
`totalSiswa`, `totalTutor`, `totalKursus` dihitung **live** dari database (query ringan, aman diekspos publik karena cuma angka agregat, tanpa PII) — lebih meyakinkan & tidak perlu diupdate manual dibanding angka statis yang gampang basi. **Tahun berdiri** (`foundedYear`) tetap di config manual — itu bukan sesuatu yang bisa dihitung dari data aplikasi.

**B4 — Testimoni: kurasi manual di config, BUKAN ditarik dari data review course:**
Institusi yang baru pakai template ini belum tentu punya review course beneran saat landing page pertama kali tayang (review baru terkumpul setelah ada siswa yang enroll & belajar cukup lama). Testimoni landing page jadi **konten marketing terkurasi** (ditulis admin/pemilik institusi di config), independen dari `reviews` table yang tetap jalan terpisah di tiap halaman detail course (TSD-Student-Dashboard.md).

**B5 — FAQ & konten section lain: static di config, bukan CMS runtime:**
Konsisten dengan filosofi "config-driven at deploy time" yang sudah dipakai di seluruh branding institusi (`config/institution.ts`) — FAQ, value proposition, cara kerja, partner, semuanya array di config, diedit lewat kode + redeploy, **bukan** lewat UI admin. Kalau nanti terasa perlu admin edit tanpa redeploy, itu penambahan tabel terpisah per section (bisa incremental, tidak butuh rombak sekarang).

**B6 — Section yang datanya kosong disembunyikan total, bukan ditampilkan kosong:**
Partner, Testimoni, FAQ, Blog Terbaru — kalau config-nya kosong (array `[]`) atau tidak ada artikel published, section itu **tidak dirender sama sekali** (bukan heading doang tanpa isi). Program (course) beda — itu section inti, jadi tetap tampil dengan empty state yang ramah kalau belum ada course published (lihat §6).

---

## 2. Config Schema (Tambahan ke `config/institution.ts`)

```ts
export const institutionConfig = {
  // ...field branding yang sudah ada (nama, logo, warna, kontak dasar dari Fase 1)

  landingPage: {
    hero: {
      tagline: string,            // teks kecil di atas headline, mis. "Bimbel Terpercaya Sejak 2015"
      headline: string,           // judul besar
      subheadline?: string,
      ctaPrimaryText: string,     // mis. "Lihat Program"
      ctaPrimaryHref: string,     // anchor internal (#program) atau eksternal
      ctaSecondaryText?: string,
      ctaSecondaryHref?: string,
      imageUrl?: string,
    },
    stats: {
      foundedYear?: number,       // B3 — satu-satunya angka manual, sisanya live query
    },
    valueProps: Array<{ icon: string; title: string; description: string }>,       // "Kenapa Pilih Kami"
    howItWorks: Array<{ step: number; title: string; description: string }>,       // "Cara Kerja"
    featuredTutorUserIds: string[],  // opsional — daftar userId tutor yang mau ditonjolkan; kosong = section disembunyikan
    partners: Array<{ name: string; logoUrl: string }>,                             // B6 — kosong = hidden
    testimonials: Array<{ name: string; role?: string; quote: string; avatarUrl?: string; rating?: number }>, // B4, B6
    faq: Array<{ question: string; answer: string }>,                              // B5, B6
    contact: {
      whatsappNumber: string,     // format internasional tanpa "+", buat link wa.me
      email: string,
      address?: string,
      mapEmbedUrl?: string,       // src iframe Google Maps
      operatingHours?: string,
    },
  },
};
```

---

## 3. Server Actions & Queries

### 3.1 `getPublicLandingStats` (query)

**FR terkait:** FR-34

```ts
async function getPublicLandingStats() {
  const [totalSiswa, totalTutor, totalKursus] = await Promise.all([
    prisma.user.count({ where: { role: "student", isActive: true } }),
    prisma.user.count({ where: { role: "tutor", isActive: true } }),
    prisma.course.count({ where: { isPublished: true, isArchived: false } }),
  ]);
  return { totalSiswa, totalTutor, totalKursus, foundedYear: institutionConfig.landingPage.stats.foundedYear };
}
```
Aman diakses tanpa autentikasi — cuma angka agregat, tidak ada nama/email/data personal apa pun (beda total dari `getAdminDashboardSummary` yang butuh login admin).

### 3.2 `getCourseListForPublicLanding` (query, BARU — beda dari `getCourseListForStudent`)

**FR terkait:** FR-34

```ts
async function getCourseListForPublicLanding(categoryId?: string, limit = 6) {
  return prisma.course.findMany({
    where: {
      isPublished: true,
      isArchived: false,
      ...(categoryId ? { categoryId } : {}),
    },
    include: { category: true },
    take: limit,
    orderBy: { createdAt: "desc" },
  });
}
```
**Sengaja fungsi terpisah** dari `getCourseListForStudent` (TSD-Course-Content.md §5.1) — tidak butuh `studentProfileId`/`ClassLevel` sama sekali, karena pengunjung anonymous tidak punya salah satu dari itu (B1). Tidak ada logic "grandfathering" atau filter tingkatan di sini — landing page cuma showcase, bukan penentu akses.

### 3.3 `getCourseDetailForPublicLanding` (query, untuk `/program/[id]`, B2)

```ts
async function getCourseDetailForPublicLanding(courseId: string) {
  return prisma.course.findFirst({
    where: { id: courseId, isPublished: true, isArchived: false },
    include: { category: true, modules: { select: { title: true }, orderBy: { sortOrder: "asc" } } }, // cuma nama modul, TANPA lesson
  });
}
```
Return `null` (→ 404) kalau course belum published/sudah diarsip — pengunjung anonymous tidak pernah punya alasan lihat course draft (beda dari preview admin/tutor/author di TSD lain, tidak ada konsep "preview" di sini karena tidak ada identitas yang perlu diberi previlese).

### 3.4 Artikel Terbaru & Reviews
**Tidak ada fungsi baru** — section Blog Terbaru memanggil `getArticleListForPublic` (TSD-Blog-Article.md §4.10) dengan `pageSize: 3`, dan tidak ada section review course di landing page (itu tetap di halaman course masing-masing, B4).

---

## 4. UI Requirements (14 Section)

| # | Section | Sumber Data | Perilaku Kalau Kosong |
|---|---|---|---|
| 1 | **Navbar** | Config (logo, nama) + menu tetap (Beranda/Program/Blog/Kontak) + CTA (Masuk → `/login`) | Selalu tampil |
| 2 | **Hero** | `config.landingPage.hero` | Selalu tampil (field wajib diisi saat replikasi, bukan opsional) |
| 3 | **Statistik** | `getPublicLandingStats` (§3.1) + `config.stats.foundedYear` | Selalu tampil — angka `0` tetap ditampilkan apa adanya (institusi baru memang belum punya siswa, tidak perlu disembunyikan) |
| 4 | **Kenapa Pilih Kami** | `config.landingPage.valueProps` | Selalu tampil (asumsi diisi saat replikasi) |
| 5 | **Cara Kerja** | `config.landingPage.howItWorks` | Selalu tampil |
| 6 | **Program** | `getCourseListForPublicLanding` (§3.2) + dropdown filter dari `course_categories` (SELECT publik, TSD-Course-Content.md §3.2b) | **Tetap tampil** dengan empty state ramah ("Program akan segera hadir") kalau belum ada course published — beda dari section lain yang di-hide total (B6) |
| 7 | **Tutor Unggulan** | `config.landingPage.featuredTutorUserIds` → query `User` by id (nama, foto, `bio` dari `tutor_profiles`) | **Hidden** kalau array kosong (B6) |
| 8 | **Partner** | `config.landingPage.partners` | **Hidden** kalau array kosong (B6) |
| 9 | **Testimoni** | `config.landingPage.testimonials` (B4) | **Hidden** kalau array kosong (B6) |
| 10 | **Blog Terbaru** | `getArticleListForPublic({ pageSize: 3 })` (TSD-Blog-Article.md §4.10) | **Hidden** kalau belum ada artikel `published` sama sekali |
| 11 | **FAQ** | `config.landingPage.faq` (accordion) | **Hidden** kalau array kosong (B6) |
| 12 | **CTA Akhir** | Config (teks bisa reuse `hero.ctaPrimaryText` atau field terpisah) | Selalu tampil |
| 13 | **Kontak** | `config.landingPage.contact` — WA jadi link `https://wa.me/{whatsappNumber}`, email jadi `mailto:`, `mapEmbedUrl` jadi `<iframe>` kalau diisi | Field yang kosong (mis. `mapEmbedUrl`) cukup tidak dirender elemen itu, section tetap tampil selama minimal ada 1 kontak (WA/email) |
| 14 | **Footer** | Config (logo, deskripsi singkat) + menu quick links (sama seperti navbar) + sosial media (kalau ada field-nya) | Selalu tampil |

### 4.1 Halaman Preview Program — `/program/[id]` (BARU, B2)
- Judul, kategori (badge), deskripsi, daftar nama modul (list sederhana, **tanpa** ikon gembok/lesson individual — itu konsep untuk siswa yang sudah enroll)
- CTA besar: **"Hubungi Kami untuk Daftar"** → scroll ke `#kontak` di landing page (atau link `wa.me` langsung kalau mau lebih pendek 1 klik)
- 404 kalau `courseId` tidak ditemukan / belum published (§3.3)

### 4.2 SEO Landing Page
`generateMetadata` di root page pakai `config.institution` (nama, deskripsi singkat, logo sebagai og-image) — sama pola dengan yang sudah disebut umum di Implementation-Plan Fase 6, dokumen ini yang memastikan datanya diambil dari config yang benar.

---

## 5. RLS Policies
Tidak ada tabel baru khusus landing page. Yang dibutuhkan cuma **akses baca publik** ke tabel yang sudah ada: `courses` (published saja — RLS `courses_select` di TSD-Course-Content.md sudah mengizinkan ini secara umum, perlu dipastikan kondisi `is_published = true` ada di klausanya untuk anonymous), `course_categories` (SELECT publik, sudah ditambahkan v1.7), `blog_articles` (published saja, sudah ada di TSD-Blog-Article.md), `users`/`tutor_profiles` untuk Tutor Unggulan (perlu policy tambahan kecil kalau belum ada: SELECT publik terbatas ke `name`, `avatarUrl`, `bio` — **bukan** `email`/`phone`, lewat kolom yang di-select di level query, bukan RLS row-level, karena RLS tidak bisa membatasi kolom).

> **Catatan:** Statistik (§3.1) & listing course/artikel publik semuanya dijalankan sebagai Server Component/Server Action biasa yang query langsung — tidak ada requirement RLS baru selain memastikan yang sudah ada tidak keliru memblokir akses anonymous untuk data yang memang seharusnya publik.

---

## 6. Edge Cases & Validation Summary

| # | Kondisi | Perilaku yang Diharapkan |
|---|---|---|
| 1 | Belum ada course published sama sekali (institusi baru setup) | Section Program tetap tampil, empty state "Program akan segera hadir" — bukan section hilang (B6, dikecualikan) |
| 2 | Filter kategori dipilih tapi tidak ada course yang cocok | Pesan "Tidak ada program untuk kategori ini", bukan grid kosong tanpa keterangan |
| 3 | `config.landingPage.partners`/`testimonials`/`faq` kosong | Section terkait tidak dirender sama sekali (B6) |
| 4 | Belum ada artikel blog published | Section Blog Terbaru tidak dirender |
| 5 | Pengunjung anonymous klik card Program | Masuk ke `/program/[id]` (B2) — **bukan** `/student/courses/[id]`, tidak ada redirect ke login dipaksakan |
| 6 | `featuredTutorUserIds` di config berisi `userId` yang ternyata sudah dinonaktifkan (`is_active = false`) admin | Tutor itu tetap tidak tampil di section Tutor Unggulan (query difilter `isActive: true`) — mencegah landing page menampilkan tutor yang sudah tidak aktif |
| 7 | `mapEmbedUrl` diisi dengan URL yang bukan dari Google Maps embed resmi | Di luar scope validasi — asumsi diisi manual oleh developer/admin saat setup, bukan input pengguna |

---

## 7. Dependencies

| Dependency | Kebutuhan Spesifik di Modul Ini |
|---|---|
| TSD-Course-Content.md (v1.7) | Model `Course`, `CourseCategory` (baru); RLS `courses_select`/`course_categories_select` harus mengizinkan akses anonymous untuk data published |
| TSD-Blog-Article.md (v2.0) | `getArticleListForPublic` untuk section Blog Terbaru |
| TSD-Auth-Account-Management.md (v1.1) | Model `User`/`TutorProfile` untuk section Tutor Unggulan |
| `next/image`, `generateMetadata` | Optimasi gambar & SEO dasar (disebut umum di Implementation-Plan Fase 6) |

---

## 8. Acceptance Criteria

- [ ] Semua 14 section tampil sesuai urutan & sumber data yang ditentukan (§4)
- [ ] Statistik menampilkan angka live yang benar (total siswa/tutor aktif, total course published) — bukan angka hardcoded
- [ ] Filter kategori di section Program berfungsi, dan menampilkan pesan jelas kalau hasilnya kosong
- [ ] Section Partner/Testimoni/FAQ/Blog Terbaru masing-masing hilang total (tidak ada heading kosong) kalau datanya tidak ada
- [ ] Section Program tetap tampil dengan empty state ramah kalau belum ada course published (beda dari section lain)
- [ ] Klik card Program mengarah ke `/program/[id]`, **bukan** `/student/courses/[id]` — dan halaman itu tidak memaksa login
- [ ] `/program/[id]` untuk course draft/archived menghasilkan 404
- [ ] Tutor yang sudah dinonaktifkan admin tidak muncul di section Tutor Unggulan meski masih ada di `featuredTutorUserIds` config
- [ ] `generateMetadata` root page menghasilkan title/description/og-image yang benar dari config institusi

---

*TSD ini bergantung pada `CourseCategory` (TSD-Course-Content.md v1.7) dan `getArticleListForPublic` (TSD-Blog-Article.md v2.0). Perubahan pada kedua dokumen tersebut yang menyentuh course/artikel published harus tercermin di revisi berikutnya di sini.*
