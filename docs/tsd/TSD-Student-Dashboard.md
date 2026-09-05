# Technical Spec Document (TSD)
## Fitur: Dashboard Siswa (Ringkasan, Wishlist, Reviews)

**Versi:** 1.0
**Tanggal:** 2 September 2026
**Terkait dokumen:** PRD.md (v2.4) · SDD.md (v1.3) · Implementation-Plan.md (v2.5, Fase 4) · TSD-Course-Content.md (v1.5, dependency) · TSD-Auth-ClassLevel.md (v1.0, dependency tidak langsung)
**Scope Implementation Plan:** Fase 4 (Dashboard Siswa Lengkap — Wishlist & Reviews)

---

## 1. Overview & Scope

### 1.1 Tujuan
Spesifikasi siap-coding untuk tiga bagian dashboard siswa: ringkasan progress real-time (enrolled/aktif/selesai), wishlist kursus yang belum diambil, dan sistem rating & ulasan untuk kursus yang sudah diikuti.

### 1.2 FR yang Dicakup

| FR | Deskripsi |
|---|---|
| FR-14 | Ringkasan real-time: jumlah kursus enrolled, aktif, selesai |
| FR-15 | Wishlist: simpan/hapus kursus yang belum diambil |
| FR-16 | Rating & ulasan kursus yang sudah diikuti, tampil di halaman detail kursus |

### 1.3 Dependency
Modul ini **read-heavy**, mengandalkan data yang sudah ada dari TSD-Course-Content.md:
- Model `Enrollment`, `Lesson`, `LessonProgress` — dipakai untuk hitung ringkasan progress (§4.1)
- Model `Course` — target `wishlists` & `reviews`
- Pola `getAccessibleCourseFilter` (TSD-Auth-ClassLevel §5.3) — dipakai saat menampilkan wishlist untuk memberi catatan jika kursus sudah tidak sesuai tingkatan siswa saat ini (§6.3 D3)

**Tidak ada dependency balik** — TSD-Course-Content.md maupun TSD-Auth-ClassLevel.md tidak perlu tahu apa pun soal wishlist/reviews.

### 1.4 Keputusan Desain

**D1 — Definisi "enrolled / aktif / selesai" (FR-14):**
PRD tidak mendefinisikan batasan pasti tiga bucket ini. Definisi yang dipakai di sini:
- **Enrolled** = total `count(enrollments)` milik siswa — angka headline
- **Selesai** = jumlah course di antara enrollment tsb yang **semua lesson-nya** sudah `isCompleted = true` di `lesson_progress` (dan course itu punya minimal 1 lesson — course kosong tidak pernah dianggap "selesai", lihat edge case §7)
- **Aktif** = `Enrolled - Selesai` (mencakup yang baru mulai 0% maupun yang sedang jalan) — **tidak** ada bucket "belum mulai" terpisah karena PRD hanya minta 3 angka, bukan 4
> Status kuis modul (badge informasional dari TSD-Quiz.md) **tidak** ikut dihitung ke bucket manapun di sini — konsisten dengan keputusan D5 di TSD-Quiz.md v3.0 bahwa kuis murni informasional dan tidak masuk hitungan progress course.

**D2 — Review mensyaratkan enrolled, BUKAN course selesai:**
PRD bilang "kursus yang sudah diikuti" — diinterpretasikan sebagai **sudah enroll** (kontras dengan wishlist FR-15 yang eksplisit bilang "belum diambil"), bukan harus 100% selesai dulu. Siswa yang baru mulai course tetap boleh kasih rating/ulasan.
> **Perlu dikonfirmasi** kalau product owner maunya lebih ketat (wajib selesai dulu) — perubahannya kecil (tambah 1 kondisi di §4.3.1) kalau memang begitu.

**D3 — Review bersifat upsert (1 review per siswa per course, bisa diedit), bukan banyak entri:**
`reviews` diberi constraint `@@unique([studentId, courseId])`. `submitReview` melakukan upsert — siswa yang review ulang mengedit rating/komentar lamanya, bukan menambah entri baru. Ini konsisten dengan pola "state agregat, bukan histori" yang sudah dipakai di modul lain (`quiz_progress`, `lesson_progress`).

**D4 — Wishlist otomatis dibersihkan saat siswa enroll ke course yang sama:**
Kalau course yang di-wishlist itu di-enroll (lewat flow enroll di TSD-Course-Content §7.2), baris `wishlists` untuk pasangan itu dihapus otomatis dalam transaksi yang sama. Mencegah course yang sudah diambil nongkrong terus di wishlist ("belum diambil" jadi tidak akurat).
> Ini **satu-satunya titik singgung** ke TSD-Course-Content — perlu penambahan kecil di `enrollInCourse` (TSD-Course-Content §7.2): setelah insert `enrollments`, hapus row `wishlists` yang cocok kalau ada (`deleteMany`, aman walau tidak ada baris yang cocok).

**D5 — Reviews bisa dilihat siapa saja yang bisa lihat course itu (tidak dibatasi hanya yang enrolled):**
Review berfungsi sebagai sinyal sosial untuk membantu siswa lain memutuskan mau enroll atau tidak — jadi ditampilkan di halaman detail kursus untuk siapa pun yang punya akses lihat course tersebut (termasuk siswa yang belum enroll, sesuai model "preview" yang sudah ada di TSD-Course-Content §6.2), bukan cuma yang sudah enroll.

**D6 — Admin bisa hapus review untuk moderasi dasar (di luar teks FR-16, tapi perlu untuk kelayakan produksi):**
FR-16 tidak menyebut moderasi eksplisit, tapi tanpa ini, ulasan berisi konten tidak pantas tidak bisa dibersihkan sama sekali. Ditambahkan `deleteReview` (admin only) sebagai bagian minimal Tier 1 — bukan sistem moderasi penuh (tidak ada report/flag dari siswa lain, itu bisa jadi follow-up Tier 2 kalau dibutuhkan).

---

## 2. Data Model

### 2.1 Prisma Schema

```prisma
model Wishlist {
  id        String   @id @default(uuid())
  studentId String   @map("student_id")
  courseId  String   @map("course_id")
  createdAt DateTime @default(now()) @map("created_at")

  student StudentProfile @relation(fields: [studentId], references: [id], onDelete: Cascade)
  course  Course         @relation(fields: [courseId], references: [id], onDelete: Cascade)

  @@unique([studentId, courseId]) // toggle add/remove, bukan banyak entri
  @@map("wishlists")
}

model Review {
  id        String   @id @default(uuid())
  studentId String   @map("student_id")
  courseId  String   @map("course_id")
  rating    Int      // 1-5
  comment   String?  // opsional — boleh cuma kasih bintang tanpa teks
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  student StudentProfile @relation(fields: [studentId], references: [id], onDelete: Cascade)
  course  Course         @relation(fields: [courseId], references: [id], onDelete: Cascade)

  @@unique([studentId, courseId]) // 1 review per siswa per course (D3)
  @@map("reviews")
}
```

### 2.2 Constraint Penting
- Kedua tabel `@@unique([studentId, courseId])` — menegakkan D3 & sifat "toggle" wishlist di level database, bukan cuma validasi aplikasi
- `Review.comment` nullable — rating tetap wajib, komentar opsional
- Tidak ada kolom `isVerifiedPurchase`/`isVerifiedEnrollment` di `Review` — status "sudah enroll saat submit" divalidasi di Server Action (§4.3.1) saat insert/update, tidak perlu disimpan permanen di baris review (kalau siswa unenroll nanti — belum ada fitur unenroll di Tier 1 — review tetap sah apa adanya)

---

## 3. RLS Policies (Supabase)

### 3.1 Tabel `wishlists`
```sql
-- SELECT & WRITE: hanya siswa pemilik baris — tidak ada kebutuhan admin/tutor lihat wishlist siswa lain di Tier 1
CREATE POLICY wishlists_owner_only ON wishlists FOR ALL
USING (
  EXISTS (SELECT 1 FROM student_profiles sp JOIN users u ON u.id = sp.user_id WHERE sp.id = wishlists.student_id AND u.auth_id = auth.uid())
);
```

### 3.2 Tabel `reviews`
```sql
-- SELECT: semua orang yang login boleh lihat (D5) — review bersifat publik dalam aplikasi
CREATE POLICY reviews_select_all ON reviews FOR SELECT
USING (true);

-- INSERT & UPDATE: hanya siswa pemilik baris, atas nama diri sendiri
CREATE POLICY reviews_write_own ON reviews FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM student_profiles sp JOIN users u ON u.id = sp.user_id WHERE sp.id = reviews.student_id AND u.auth_id = auth.uid())
);
CREATE POLICY reviews_update_own ON reviews FOR UPDATE USING (
  EXISTS (SELECT 1 FROM student_profiles sp JOIN users u ON u.id = sp.user_id WHERE sp.id = reviews.student_id AND u.auth_id = auth.uid())
);

-- DELETE: siswa pemilik ATAU admin (moderasi, D6)
CREATE POLICY reviews_delete ON reviews FOR DELETE
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.role = 'admin')
  OR EXISTS (SELECT 1 FROM student_profiles sp JOIN users u ON u.id = sp.user_id WHERE sp.id = reviews.student_id AND u.auth_id = auth.uid())
);
```
> **Catatan:** `reviews_select_all` sengaja permisif (`USING (true)`) karena review memang dirancang publik di dalam aplikasi (D5). Kalau nanti halaman course preview publik (tanpa login, landing page) juga perlu menampilkan review, query itu akan jalan lewat service role di server (bypass RLS), bukan lewat client langsung — tetap aman karena tidak ada data sensitif di tabel ini.

---

## 4. Server Actions & Queries

### 4.1 `getStudentDashboardSummary` (query — FR-14)

**Alur logika:**
```ts
const courses = await prisma.course.findMany({
  where: { enrollments: { some: { studentId } } },
  select: {
    id: true,
    title: true,
    modules: { select: { lessons: { select: { id: true } } } },
  },
});

const completedLessons = await prisma.lessonProgress.findMany({
  where: { studentId, isCompleted: true },
  select: { lessonId: true },
});
const completedIds = new Set(completedLessons.map((p) => p.lessonId));

const perCourse = courses.map((c) => {
  const lessonIds = c.modules.flatMap((m) => m.lessons.map((l) => l.id));
  const total = lessonIds.length;
  const completed = lessonIds.filter((id) => completedIds.has(id)).length;
  const isSelesai = total > 0 && completed === total; // course kosong tidak pernah "selesai" (D1)
  return { courseId: c.id, title: c.title, total, completed, isSelesai };
});

const summary = {
  enrolled: perCourse.length,
  selesai: perCourse.filter((c) => c.isSelesai).length,
  aktif: perCourse.length - perCourse.filter((c) => c.isSelesai).length,
  perCourse, // detail per course untuk render list "Kursus Aktif" di dashboard
};
```
Sengaja 2 query (bukan N+1 per course) — jumlah course per siswa di skala Tier 1 kecil, ini cukup efisien tanpa perlu raw SQL/groupBy lintas relasi.

### 4.2 Wishlist

#### 4.2.1 `addToWishlist` / `removeFromWishlist`

**FR terkait:** FR-15

**Input:**
```ts
const wishlistSchema = z.object({ courseId: z.string().uuid() });
```

**Alur logika (`add`):**
1. Cek siswa **belum** enroll di course ini (`prisma.enrollment.findUnique` harus `null`) — kalau sudah enroll, tolak dengan pesan jelas ("Kursus ini sudah kamu ambil") — selaras semantik FR-15 "belum diambil"
2. Upsert `wishlists` (idempoten — panggil dua kali tidak error, `@@unique` sebagai target)

**Alur logika (`remove`):** hapus baris `wishlists` untuk pasangan `(studentId, courseId)` — aman walau tidak ada baris (`deleteMany`, bukan `delete`)

#### 4.2.2 `getWishlistForStudent` (query)

**FR terkait:** FR-15

```ts
const wishlist = await prisma.wishlist.findMany({
  where: { studentId },
  include: { course: { select: { id: true, title: true, thumbnailUrl: true } } },
  orderBy: { createdAt: "desc" },
});
```

### 4.3 Reviews

#### 4.3.1 `submitReview`

**FR terkait:** FR-16

**Input:**
```ts
const submitReviewSchema = z.object({
  courseId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});
```

**Alur logika:**
1. Validasi siswa **sudah enroll** di course ini (`prisma.enrollment.findUnique` harus **ada**) — kalau belum, `403 FORBIDDEN` (D2)
2. Upsert `reviews`:
   ```ts
   await prisma.review.upsert({
     where: { studentId_courseId: { studentId, courseId } },
     update: { rating, comment },
     create: { studentId, courseId, rating, comment },
   });
   ```

#### 4.3.2 `deleteReview` (admin, moderasi — D6)

**Alur logika:** cek `role === 'admin'`, lalu hapus baris review berdasarkan `reviewId`. Siswa yang mau hapus review miliknya sendiri juga boleh lewat aksi yang sama (dicek RLS §3.2, tapi tetap divalidasi di Server Action: `role === 'admin' OR review.studentId === currentStudentId`).

#### 4.3.3 `getReviewsForCourse` (query, dipanggil dari halaman detail kursus)

**FR terkait:** FR-16

```ts
const reviews = await prisma.review.findMany({
  where: { courseId },
  include: { student: { select: { user: { select: { name: true } } } } },
  orderBy: { createdAt: "desc" },
});
const aggregate = await prisma.review.aggregate({
  where: { courseId },
  _avg: { rating: true },
  _count: true,
});
```
`aggregate` (`avgRating`, `count`) dipakai untuk badge rating di listing/detail kursus — cross-reference ke TSD-Course-Content untuk ditambahkan ke tampilan card kursus kalau diinginkan (tidak wajib untuk MVP Fase 4 ini, murni opsional penambahan visual).

---

## 5. UI Requirements

### 5.1 Dashboard Siswa (`/student/dashboard`)
- 3 kartu ringkasan di atas: **Enrolled**, **Aktif**, **Selesai** (dari `getStudentDashboardSummary`)
- List "Kursus Aktif" di bawahnya (dari `perCourse` yang `!isSelesai`) — tiap kartu: judul course, progress bar (`completed`/`total` lesson), link lanjut belajar
- Tab/section terpisah: **Wishlist** — list dari `getWishlistForStudent`, tiap item ada tombol "Hapus dari Wishlist" dan "Lihat Kursus" (ke halaman detail)

### 5.2 Tombol Wishlist di Listing/Detail Kursus
- Untuk course yang belum di-enroll: ikon hati (toggle) di card listing & halaman detail — panggil `addToWishlist`/`removeFromWishlist` sesuai state saat ini
- Untuk course yang sudah di-enroll: ikon hati **disembunyikan** (tidak relevan, dan D4 sudah otomatis membersihkan wishlist saat enroll — harusnya state ini jarang ketemu kecuali race condition kecil)

### 5.3 Section Review di Halaman Detail Kursus
- **Siswa yang sudah enroll & belum pernah review:** form singkat (bintang 1-5 + textarea opsional komentar), tombol "Kirim Ulasan"
- **Siswa yang sudah pernah review:** form yang sama, prefilled data lamanya, tombol berubah jadi "Update Ulasan"
- **Siswa yang belum enroll, atau bukan siswa (tutor/admin melihat):** form tidak muncul, hanya list review + rata-rata rating yang tampil
- List review di bawah form: nama siswa, bintang, komentar, tanggal — urut terbaru dulu
- Admin yang melihat halaman ini (lewat context admin, bukan student) dapat tombol "Hapus" kecil di tiap review (D6)

---

## 6. Edge Cases & Validation Summary

| # | Kondisi | Perilaku yang Diharapkan |
|---|---|---|
| 1 | Course tanpa lesson sama sekali dihitung ke ringkasan dashboard | Dianggap "aktif", **tidak pernah** "selesai" (guard `total > 0` di D1) — mencegah course kosong otomatis tampil sebagai selesai |
| 2 | Siswa coba `addToWishlist` untuk course yang sudah di-enroll | Ditolak dengan pesan jelas (§4.2.1 poin 1) |
| 3 | Siswa enroll ke course yang ada di wishlist-nya | Baris wishlist otomatis terhapus (D4) — perlu penambahan kecil di `enrollInCourse` (TSD-Course-Content §7.2) |
| 4 | Siswa submit review untuk course yang belum di-enroll (manipulasi request) | Ditolak `403` di validasi §4.3.1 poin 1 |
| 5 | Siswa submit review dua kali untuk course yang sama | Upsert — mengedit review lama, bukan bikin entri baru (D3) |
| 6 | Tingkatan siswa berubah (lewat FR-37) sehingga course di wishlist-nya sudah tidak sesuai tingkatan barunya | Tetap tampil di wishlist apa adanya (tidak disembunyikan otomatis) — kalau siswa klik "Lihat Kursus", halaman detail existing (TSD-Course-Content) yang menentukan boleh/tidaknya akses lebih lanjut; tidak ada logic tambahan khusus di modul ini |
| 7 | Admin hapus review milik siswa (moderasi) | Diizinkan (D6), tidak ada notifikasi otomatis ke siswa terkait di Tier 1 (bisa jadi follow-up) |
| 8 | Course dihapus (admin) padahal punya wishlist/review terkait | Cascade hapus `wishlists`/`reviews` terkait otomatis (`onDelete: Cascade` di skema §2.1) |

---

## 7. Dependencies

| Dependency | Kebutuhan Spesifik di Modul Ini |
|---|---|
| TSD-Course-Content.md (v1.4) | Model `Enrollment`, `Lesson`, `LessonProgress`, `Course`; **penambahan kecil** di `enrollInCourse` (§7.2 dokumen tsb) untuk membersihkan wishlist (D4) |
| TSD-Auth-ClassLevel.md (v1.0) | Tidak dipakai langsung di query modul ini — disebut hanya sebagai konteks edge case #6 |
| `prisma` | Aggregate (`_avg`, `_count`) untuk rating; upsert untuk wishlist/review |
| Supabase RLS | Lihat §3 |

---

## 8. Acceptance Criteria

- [ ] Dashboard menampilkan 3 angka (Enrolled/Aktif/Selesai) yang sesuai dengan data enrollment & lesson_progress aktual siswa
- [ ] Course tanpa lesson tidak pernah terhitung sebagai "Selesai"
- [ ] Siswa bisa tambah/hapus course dari wishlist; tidak bisa wishlist course yang sudah di-enroll
- [ ] Enroll ke course yang ada di wishlist otomatis menghapusnya dari wishlist
- [ ] Siswa yang belum enroll tidak bisa submit review (403, termasuk lewat manipulasi request langsung)
- [ ] Submit review kedua kali untuk course yang sama meng-update review lama, bukan membuat baris baru
- [ ] Review & rata-rata rating tampil di halaman detail kursus untuk siapa pun yang bisa akses halaman itu, termasuk yang belum enroll
- [ ] Admin bisa menghapus review siapa pun; siswa hanya bisa menghapus review miliknya sendiri
- [ ] Semua RLS policy §3 diuji manual per role

---

*TSD ini bergantung ringan satu arah pada TSD-Course-Content.md — hanya butuh 1 penambahan kecil di sana (D4). Perubahan pada FR-14/15/16 di PRD harus tercermin di revisi berikutnya.*
