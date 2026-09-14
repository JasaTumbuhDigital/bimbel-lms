# Technical Spec Document (TSD)
## Fitur: Course & Content Module

**Versi:** 1.7
**Tanggal:** 2 September 2026
**Terkait dokumen:** PRD.md (v2.7, direvisi bersamaan) · SDD.md (v1.6) · Implementation-Plan.md (v2.12, Fase 2) · TSD-Auth-ClassLevel.md (v1.2, dependency) · TSD-Quiz.md (v3.0, dependency ringan satu arah) · TSD-Student-Dashboard.md (v1.0, dependency dua arah) · TSD-Tutor-Dashboard.md (v1.1, dependency erat) · TSD-Landing-Page.md (v1.0, dependency baru — konsumen `getCourseListForPublicLanding`)
**Scope Implementation Plan:** Fase 2 (Modul Kursus & Materi)

> **Ringkasan perubahan v1.7:** Ditambahkan `CourseCategory` (A9) — sumbu klasifikasi baru untuk course (kategori program, mis. "TOEFL Prep"/"IELTS Prep"), independen dari `ClassLevel` (yang tetap murni syarat akses). Dibutuhkan untuk filter kategori di listing course landing page (TSD-Landing-Page.md).
>
> **Ringkasan perubahan v1.6 (perombakan besar sisi tutor):** Halaman `/tutor/courses` (scoped, editable) dan `/tutor/explore` (read-only, yang sebenarnya belum pernah didetailkan di dokumen manapun) **digabung jadi satu halaman** dengan 2 tab: "Kursus Saya" & "Kursus Lain" (§8.5). Course Detail sekarang 1 komponen yang sama untuk admin & tutor, mode edit/preview mengikuti hak akses (§8.2). Ditambahkan: section **siswa enrolled** per course (khusus yang punya akses edit, §5.5) dan section **reviews** (reuse `getReviewsForCourse` dari TSD-Student-Dashboard, tampil untuk semua, §5.6). Lihat A5-A8 di §1.4.
>
> **Ringkasan perubahan v1.5:** `enrollInCourse` (§5.2b) dapat 1 langkah tambahan kecil — bersihkan `wishlists` untuk course yang baru di-enroll (lihat TSD-Student-Dashboard.md D4, Fase 4). Tidak ada perubahan lain.
>
> **Ringkasan perubahan v1.4:** Revert perubahan v1.3 — kuis dipindah relasinya dari Lesson ke **Module** (lihat TSD-Quiz.md v3.0), dan sifatnya murni informational (badge status, tidak menggerbang apa pun). Karena itu, `markLessonComplete`/`unmarkLessonComplete` (§7.1) **kembali ke logic aslinya sepenuhnya manual**, tanpa guard atau ketergantungan ke kuis. Modul ini sekarang hanya perlu tahu bahwa Course Builder & halaman detail kursus punya 1 elemen UI tambahan (badge kuis modul) yang datanya sepenuhnya dikelola TSD-Quiz.md — bukan lagi dependency dua arah.
>
> **Ringkasan perubahan v1.3 (di-revert):** ~~`markLessonComplete` dapat guard untuk lesson berkuis~~ — tidak jadi dipakai, lihat v1.4 di atas.
>
> **Ringkasan perubahan v1.2:** FR-10 (lesson tipe dokumen PDF/PPT + preview) **dikembalikan ke Tier 1** — dibangun dengan library `@cyntler/react-doc-viewer` untuk render semua jenis dokumen langsung di browser tanpa pengiriman data ke pihak ketiga. Lihat §6.
>
> **Ringkasan perubahan v1.1:** Enrollment tidak lagi otomatis diam-diam saat siswa buka detail kursus — sekarang lewat **tombol "Enroll" eksplisit**, konten lesson terkunci (preview judul saja) sampai siswa enroll.

---

## 1. Overview & Scope

### 1.1 Tujuan
Spesifikasi siap-coding untuk modul inti belajar: pembuatan & pengelolaan kursus/modul/lesson, penugasan tutor & tingkatan (many-to-many), akses berbeda per role (admin lintas institusi, tutor scoped ke kursusnya, siswa sesuai tingkatan), embed video YouTube, upload & preview dokumen, dan penandaan progress manual.

### 1.2 FR yang Dicakup

| FR | Deskripsi |
|---|---|
| FR-7 | Admin membuat kursus + struktur modul/lesson; tutor hanya kelola kursus miliknya |
| FR-8 | Embed video YouTube (unlisted) |
| FR-9 | Penandaan manual "selesai" per lesson |
| FR-10 | Upload & preview dokumen (PDF/PPT) di browser |
| FR-38 | Relasi many-to-many kursus↔tingkatan + flag `visible_to_all_levels`, validasi saat publish |
| FR-40 | Admin assign/unassign tutor ke kursus (many-to-many) |
| FR-41 | Tutor melihat seluruh kursus, namun hak edit (CRUD modul/materi) hanya untuk kursus yang diampu |

### 1.3 Dependency
Modul ini **bergantung penuh** pada TSD-Auth-ClassLevel.md — khususnya helper `getAccessibleCourseFilter` (§5.4 di dokumen tersebut) yang diimplementasikan penuh di sini, dan skema `users`/`student_profiles`/`class_levels` yang sudah ada.

### 1.4 Keputusan Desain (Dikonfirmasi)

**A1 — Enrollment via aksi eksplisit siswa:** Siswa bisa melihat **preview** kursus yang aksesnya valid (sesuai tingkatan atau "semua tingkatan") — struktur modul & judul lesson terlihat, tapi konten (video) **terkunci** sampai siswa menekan tombol **"Enroll"** di halaman detail kursus. Enrollment tercatat lewat aksi eksplisit ini (`enrollInCourse`, §5.2b), bukan otomatis saat halaman dibuka. Ini memberi siswa kesempatan melihat gambaran kursus dulu sebelum memutuskan ikut, dan membuat metrik "kursus enrolled" (FR-14) benar-benar mencerminkan keputusan sadar siswa, bukan sekadar "pernah mampir".

**A2 — Akses tetap ("grandfathering") saat siswa pindah tingkatan:** Jika siswa sudah ter-enroll di suatu kursus, lalu admin memindahkan siswa itu ke tingkatan lain yang tidak lagi cocok dengan kursus tersebut, **akses & riwayat progress tetap dipertahankan** (tidak dicabut). Kursus tersebut cukup tidak lagi muncul di listing "kursus tersedia" untuk tingkatan barunya, tapi tetap ada di "kursus saya" karena sudah pernah di-enroll.

**A3 — Soft-delete untuk kursus:** `deleteCourse` tidak menghapus row secara permanen (mencegah orphan data di `enrollments`, `lesson_progress`, dst), melainkan set `isArchived = true`. Kursus arsip disembunyikan dari semua listing kecuali tampilan khusus admin.

**A4 — Preview dokumen pakai `@cyntler/react-doc-viewer` di Tier 1:** FR-10 (upload dokumen PDF/PPT + preview di browser) **tetap dibangun di Tier 1**, dengan pendekatan menggunakan library `@cyntler/react-doc-viewer` (§6.4). Ini memungkinkan render secara native di komponen React tanpa mengirim file ke pihak ketiga seperti Google.

**A5 — Halaman kelola course tutor & halaman "explore" digabung jadi satu, dengan tab (v1.6):** Sebelumnya ada 2 konsep terpisah: `/tutor/courses` (scoped ke course miliknya, editable) dan `/tutor/explore` (read-only, untuk review course tutor lain) — tapi yang kedua **belum pernah benar-benar didetailkan** di dokumen manapun sebelum ini, cuma disebut namanya di PRD/Implementation-Plan. Sekarang digabung jadi **1 halaman** (`/tutor/courses`, §8.5) dengan 2 tab:
- **"Kursus Saya"** — course yang ada di `course_tutors` milik tutor ini, kartu-nya bisa langsung masuk ke mode edit (Course Builder, §8.2)
- **"Kursus Lain"** — semua course lain di institusi (exclusive dari tab pertama, tidak duplikat), read-only preview untuk keperluan saling koreksi antar tutor (nilai yang tetap dipertahankan dari FR-41 lama)

Dari kedua tab, klik course masuk ke **1 komponen Course Detail yang sama** (bukan route/komponen terpisah untuk "builder" vs "explore") — kalau tutor punya akses edit (ada di `course_tutors` course itu), komponen ini render dalam mode edit penuh; kalau tidak, render read-only. Admin juga memakai komponen yang sama saat masuk ke detail course dari `/admin/courses` — bedanya admin selalu dapat mode edit penuh + section admin-only (tingkatan, tutor pengampu) yang tidak pernah muncul di sisi tutor.

Tutor juga bisa **langsung membuat course baru** dari halaman ini (tombol "+ Buat Kursus Baru", memanggil `createCourse` §4.1 yang sebenarnya sudah mendukung pemanggilan oleh tutor sejak awal — cuma belum ada entry point UI-nya yang jelas).

> **Pertimbangan yang TIDAK diadopsi:** Sempat dipertimbangkan membatasi admin supaya tidak bisa `createCourse`/`archiveCourseAction` sama sekali (biar admin fokus ke sisi operasional/institusi, bukan akademik). **Diputuskan tetap membolehkan admin penuh** — admin sebagai fallback/oversight universal itu pola yang konsisten dipakai di seluruh sistem ini (lihat juga TSD-Admin-Dashboard.md), dan membatasi admin di sini akan jadi pengecualian yang aneh sendiri tanpa manfaat jelas.

**A6 — Course Detail menampilkan daftar siswa enrolled, HANYA untuk yang punya akses edit (v1.6):** Section baru "Siswa Enrolled" (nama, email, tingkatan, ringkasan progress — §5.5) muncul di Course Detail **hanya kalau** pemanggil admin atau ada di `course_tutors` course tsb. Untuk tutor yang cuma preview (tab "Kursus Lain"), section ini **disembunyikan total** (query-nya bahkan tidak dijalankan di server, bukan cuma disembunyikan di UI) — data pribadi siswa (nama, email) tidak semestinya bocor ke tutor yang tidak mengampu course itu, biarpun struktur/konten course-nya sendiri memang sengaja terbuka untuk saling review.

**A7 — Reviews course ditampilkan juga di Course Detail versi tutor/admin (v1.6):** Reuse `getReviewsForCourse` (TSD-Student-Dashboard.md §4.3.3) — ditampilkan ke **semua** yang bisa akses Course Detail, termasuk tutor yang cuma preview, karena review memang sudah didesain publik dalam aplikasi (D5, TSD-Student-Dashboard.md). Ini menciptakan dependency baru **dari dokumen ini ke TSD-Student-Dashboard.md** (sebelumnya cuma satu arah sebaliknya) — dicatat di §10.

**A8 — Tutor Utama vs Co-Tutor TETAP tidak dibedakan untuk hak edit (tidak berubah dari v1.0):** Ditegaskan lagi di sini karena sempat jadi pertanyaan terpisah — permission `canManageCourse` (§6.1) memang sengaja tidak membedakan keduanya (siapa pun anggota `course_tutors` boleh edit modul/materi), konsisten dengan pola yang sudah ada sejak awal.

**A9 — `CourseCategory` ditambahkan sebagai sumbu klasifikasi BARU, independen dari `ClassLevel` (v1.7):**
Selama ini course cuma punya 1 sumbu klasifikasi: `ClassLevel` (tingkatan siswa, buat filter akses). Ternyata dibutuhkan sumbu kedua yang beda konsepnya — **kategori program** (mis. "TOEFL Prep", "IELTS Prep", "Basic English" untuk bimbel bahasa; atau "SD"/"SMP"/"SMA" untuk bimbel umum yang sifatnya program, bukan syarat akses). Perbedaannya dengan `ClassLevel`:
- `ClassLevel` → **syarat akses**: menentukan siswa mana yang *boleh lihat/enroll* course ini (many-to-many lewat `course_class_levels`, dipakai `getAccessibleCourseFilter`)
- `CourseCategory` → **label deskriptif untuk filter/browsing** di landing page & listing (single-select, **tidak mempengaruhi akses sama sekali**) — murni buat pengunjung/siswa nyari "saya mau kategori TOEFL Prep", terlepas dari tingkatan siswanya

**Pola desainnya disamakan persis dengan `BlogCategory`** (TSD-Blog-Article.md A2): single-select per course, dikurasi **admin only** (CRUD terpisah, §4.7 baru), `onDelete: SetNull` di FK (hapus kategori tidak menghapus course, cuma lepas labelnya — sama alasan seperti A5 dan A5-nya Blog). Tidak multi-select untuk Tier 1 — kalau nanti butuh 1 course di beberapa kategori sekaligus, upgrade ke many-to-many (pola sama seperti `BlogArticleTag`) tanpa migrasi drastis.

---

## 2. Data Model

### 2.1 Prisma Schema

```prisma
model Course {
  id                 String   @id @default(uuid())
  title              String
  description        String?
  thumbnailUrl       String?  @map("thumbnail_url")
  visibleToAllLevels Boolean  @default(false) @map("visible_to_all_levels")
  categoryId         String?  @map("category_id") // v1.7 — kategori program (beda dari ClassLevel/tingkatan), lihat A9
  createdBy          String   @map("created_by") // users.id — admin atau tutor pembuat
  isPublished        Boolean  @default(false) @map("is_published")
  isArchived         Boolean  @default(false) @map("is_archived")
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")

  category     CourseCategory?    @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  modules      Module[]
  classLevels  CourseClassLevel[]
  tutors       CourseTutor[]
  enrollments  Enrollment[]

  @@map("courses")
}

// v1.7 — kategori PROGRAM (mis. "TOEFL Prep", "IELTS Prep", "Basic English"), independen dari ClassLevel (tingkatan siswa)
model CourseCategory {
  id   String @id @default(uuid())
  name String @unique
  slug String @unique

  courses Course[]

  @@map("course_categories")
}

model CourseClassLevel {
  id           String @id @default(uuid())
  courseId     String @map("course_id")
  classLevelId String @map("class_level_id")

  course     Course     @relation(fields: [courseId], references: [id], onDelete: Cascade)
  classLevel ClassLevel @relation(fields: [classLevelId], references: [id], onDelete: Cascade)

  @@unique([courseId, classLevelId]) // cegah duplikasi relasi
  @@map("course_class_levels")
}

model CourseTutor {
  id             String   @id @default(uuid())
  courseId       String   @map("course_id")
  tutorProfileId String   @map("tutor_profile_id")
  assignedAt     DateTime @default(now()) @map("assigned_at")

  course       Course       @relation(fields: [courseId], references: [id], onDelete: Cascade)
  tutorProfile TutorProfile @relation(fields: [tutorProfileId], references: [id], onDelete: Cascade)

  @@unique([courseId, tutorProfileId]) // 1 tutor tidak boleh dobel-assign ke kursus yang sama
  @@map("course_tutors")
}

model Module {
  id        String @id @default(uuid())
  courseId  String @map("course_id")
  title     String
  sortOrder Int    @default(0) @map("sort_order")

  course  Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  lessons Lesson[]

  @@map("modules")
}

enum LessonContentType {
  video
  document
}

model Lesson {
  id           String            @id @default(uuid())
  moduleId     String            @map("module_id")
  title        String
  contentType  LessonContentType @map("content_type")
  videoUrl     String?           @map("video_url")       // wajib diisi jika contentType = video
  documentUrl  String?           @map("document_url")    // path Supabase Storage, wajib jika contentType = document
  sortOrder    Int               @default(0) @map("sort_order")

  module   Module            @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  progress LessonProgress[]

  @@map("lessons")
}

model Enrollment {
  id          String   @id @default(uuid())
  studentId   String   @map("student_id") // student_profiles.id
  courseId    String   @map("course_id")
  enrolledAt  DateTime @default(now()) @map("enrolled_at")

  student StudentProfile @relation(fields: [studentId], references: [id], onDelete: Cascade)
  course  Course         @relation(fields: [courseId], references: [id], onDelete: Cascade)

  @@unique([studentId, courseId]) // 1 siswa hanya 1 record enrollment per kursus
  @@map("enrollments")
}

model LessonProgress {
  id          String    @id @default(uuid())
  studentId   String    @map("student_id")
  lessonId    String    @map("lesson_id")
  isCompleted Boolean   @default(false) @map("is_completed")
  completedAt DateTime? @map("completed_at")

  student StudentProfile @relation(fields: [studentId], references: [id], onDelete: Cascade)
  lesson  Lesson         @relation(fields: [lessonId], references: [id], onDelete: Cascade)

  @@unique([studentId, lessonId]) // upsert target — 1 row per siswa per lesson
  @@map("lesson_progress")
}
```

### 2.2 Constraint Penting
- `@@unique([courseId, classLevelId])` di `CourseClassLevel` — mencegah relasi duplikat saat admin klik assign 2x
- `@@unique([courseId, tutorProfileId])` di `CourseTutor` — sama, cegah duplikasi assignment
- `@@unique([studentId, courseId])` di `Enrollment` dan `@@unique([studentId, lessonId])` di `LessonProgress` — keduanya jadi **target upsert**, bukan sekadar constraint pasif (dipakai langsung di query `upsert` pada §4)
- Semua relasi child (`Module`, `Lesson`, pivot tables) pakai `onDelete: Cascade` terhadap `Course` — **tapi** karena `deleteCourse` di aplikasi hanya soft-delete (`isArchived`), cascade ini secara praktis hanya relevan jika suatu saat ada hard-delete manual di database (bukan lewat alur aplikasi normal)

---

## 3. RLS Policies (Supabase)

### 3.1 Tabel `courses`
```sql
-- SELECT
CREATE POLICY courses_select ON courses FOR SELECT
USING (
  -- Admin & Tutor: lihat semua (termasuk draft & archived, untuk keperluan manajemen/eksplorasi)
  EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.role IN ('admin', 'tutor'))
  OR
  -- Siswa: hanya kursus published, DAN (visible_to_all_levels ATAU cocok tingkatan ATAU sudah pernah enrolled)
  (
    is_published = true AND is_archived = false AND
    EXISTS (
      SELECT 1 FROM users u
      JOIN student_profiles sp ON sp.user_id = u.id
      WHERE u.auth_id = auth.uid()
      AND (
        courses.visible_to_all_levels = true
        OR EXISTS (SELECT 1 FROM course_class_levels ccl WHERE ccl.course_id = courses.id AND ccl.class_level_id = sp.class_level_id)
        OR EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = courses.id AND e.student_id = sp.id)
      )
    )
  )
);

-- INSERT: admin atau tutor (keduanya boleh membuat kursus, lihat §4.1 alur auto-assign)
CREATE POLICY courses_insert ON courses FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.role IN ('admin', 'tutor'))
);

-- UPDATE: admin (semua), atau tutor yang jadi pengampu kursus ini
CREATE POLICY courses_update ON courses FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.role = 'admin')
  OR EXISTS (
    SELECT 1 FROM course_tutors ct
    JOIN tutor_profiles tp ON tp.id = ct.tutor_profile_id
    JOIN users u ON u.id = tp.user_id
    WHERE ct.course_id = courses.id AND u.auth_id = auth.uid()
  )
);
```
> **Catatan:** Tidak ada policy `DELETE` untuk `courses` — sesuai keputusan A3 (soft-delete via `UPDATE isArchived`), row `courses` tidak pernah dihapus lewat alur aplikasi normal.

### 3.2 Tabel `course_class_levels` & `course_tutors`
```sql
-- Kedua tabel pivot ini: SELECT mengikuti akses ke courses induk (implisit lewat join di query aplikasi,
-- RLS cukup dibatasi ke write saja karena data pivot tidak sensitif untuk dibaca siapa pun yang bisa lihat course-nya)

-- WRITE course_class_levels: admin atau tutor utama (pembuat kursus)
CREATE POLICY course_class_levels_write ON course_class_levels FOR ALL
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.role = 'admin')
  OR EXISTS (
    SELECT 1 FROM courses c 
    JOIN users u ON u.id = c.created_by 
    WHERE c.id = course_class_levels.course_id AND u.auth_id = auth.uid()
  )
);

-- WRITE course_tutors: admin atau tutor utama (pembuat kursus)
CREATE POLICY course_tutors_write ON course_tutors FOR ALL
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.role = 'admin')
  OR EXISTS (
    SELECT 1 FROM courses c 
    JOIN users u ON u.id = c.created_by 
    WHERE c.id = course_tutors.course_id AND u.auth_id = auth.uid()
  )
);
```

### 3.2b Tabel `course_categories` (v1.7, A9)
```sql
-- SELECT: semua orang (termasuk anonymous) — dibutuhkan untuk filter di landing page publik
CREATE POLICY course_categories_select ON course_categories FOR SELECT USING (true);

-- WRITE: admin only (sama pola seperti blog_categories, ClassLevel)
CREATE POLICY course_categories_write ON course_categories FOR ALL
USING (EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.role = 'admin'));
```

### 3.3 Tabel `modules` & `lessons`
```sql
-- SELECT: ikut akses parent course (siswa hanya lihat jika course accessible, tutor jika course miliknya, admin semua)
CREATE POLICY modules_select ON modules FOR SELECT
USING (EXISTS (SELECT 1 FROM courses c WHERE c.id = modules.course_id)); -- RLS courses akan tetap disaring lewat join aplikasi; lihat catatan di bawah

-- WRITE modules & lessons: admin atau tutor pengampu course terkait
CREATE POLICY modules_write ON modules FOR ALL
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.role = 'admin')
  OR EXISTS (
    SELECT 1 FROM course_tutors ct
    JOIN tutor_profiles tp ON tp.id = ct.tutor_profile_id
    JOIN users u ON u.id = tp.user_id
    WHERE ct.course_id = modules.course_id AND u.auth_id = auth.uid()
  )
);
-- Policy lessons mengikuti pola identik, join lewat modules.course_id
```
> **Catatan implementasi penting:** RLS Postgres untuk tabel anak (`modules`, `lessons`) yang aksesnya "ikut" tabel induk (`courses`) **tidak otomatis mewarisi filter kompleks courses_select** (subquery `EXISTS (SELECT 1 FROM courses ...)` tanpa kondisi tambahan akan selalu true selama course-nya ada, tidak peduli published/archived). Maka **query aplikasi tetap wajib melakukan filter eksplisit** di Server Component/Server Action (join ke `courses` dan cek `isPublished`/`isArchived`/akses tingkatan), RLS di sini hanya sebagai **lapisan pertahanan kedua** kalau ada bug di query aplikasi, bukan satu-satunya penjamin keamanan. Ini didokumentasikan eksplisit supaya tidak ada asumsi keliru "RLS pasti sudah menyaring semuanya".

### 3.4 Tabel `enrollments`
```sql
CREATE POLICY enrollments_select ON enrollments FOR SELECT
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.role = 'admin')
  OR EXISTS (SELECT 1 FROM student_profiles sp JOIN users u ON u.id = sp.user_id WHERE sp.id = enrollments.student_id AND u.auth_id = auth.uid())
);

-- INSERT: sistem (via Server Action lazy-enroll) atas nama siswa yang login, atau admin
CREATE POLICY enrollments_insert ON enrollments FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM student_profiles sp JOIN users u ON u.id = sp.user_id WHERE sp.id = enrollments.student_id AND u.auth_id = auth.uid())
  OR EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.role = 'admin')
);
```

### 3.5 Tabel `lesson_progress`
```sql
CREATE POLICY lesson_progress_select ON lesson_progress FOR SELECT
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.role = 'admin')
  OR EXISTS (SELECT 1 FROM student_profiles sp JOIN users u ON u.id = sp.user_id WHERE sp.id = lesson_progress.student_id AND u.auth_id = auth.uid())
);

-- INSERT & UPDATE: hanya siswa pemilik data ini (menandai lesson-nya sendiri)
CREATE POLICY lesson_progress_write ON lesson_progress FOR ALL
USING (
  EXISTS (SELECT 1 FROM student_profiles sp JOIN users u ON u.id = sp.user_id WHERE sp.id = lesson_progress.student_id AND u.auth_id = auth.uid())
);
```

---

## 4. Server Actions — Course Management

### 4.1 `createCourse`

**FR terkait:** FR-7

**Input:**
```ts
const createCourseSchema = z.object({
  title: z.string().min(3).max(150),
  description: z.string().max(1000).optional(),
  thumbnailUrl: z.string().optional(), // diisi dari hasil upload thumbnail ke Storage, bukan diketik manual
  categoryId: z.string().uuid().optional(), // v1.7, A9 — opsional, boleh kosong ("Tanpa Kategori")
});
```

**Alur logika:**
1. Validasi role pemanggil = `admin` atau `tutor` (guard eksplisit sebelum query, selaras §3.1 policy INSERT)
2. Insert `courses` (`isPublished = false` default — kursus baru selalu draft)
3. **Jika pemanggil adalah tutor:** langsung insert row `course_tutors` untuk tutor tersebut dalam transaksi yang sama — ini yang menyelesaikan "ayam-telur" dari FR-7 (tutor bisa membuat kursus, dan otomatis jadi pengampu kursus yang baru dia buat, tanpa perlu admin assign manual dulu)
4. **Jika pemanggil admin:** tidak ada auto-assign tutor — kursus dibuat tanpa pengampu, menunggu admin assign manual lewat `assignTutorToCourse` (§4.4)

### 4.2 `updateCourse`

**FR terkait:** FR-7

**Input:** sama seperti `createCourseSchema`, semua field optional (partial update)

**Alur logika:**
1. Cek permission: admin **atau** tutor yang ada di `course_tutors` untuk course ini (query eksplisit di Server Action, sebagai lapisan pertahanan pertama sebelum mengandalkan RLS §3.1)
2. Jika bukan keduanya → return `403 FORBIDDEN`
3. Update row

### 4.3 `publishCourse`

**FR terkait:** FR-38 edge case

**Alur logika:**
1. Cek permission sama seperti `updateCourse`
2. **Validasi wajib sebelum publish:**
   ```ts
   const hasClassLevel = await prisma.courseClassLevel.count({ where: { courseId } }) > 0;
   const course = await prisma.course.findUnique({ where: { id: courseId }, select: { visibleToAllLevels: true } });
   if (!hasClassLevel && !course.visibleToAllLevels) {
     return { success: false, error: "NO_VISIBILITY_TARGET" };
   }
   ```
3. Jika lolos → set `isPublished = true`

**Pesan error UI:** "Kursus belum bisa dipublish — pilih minimal satu tingkatan, atau tandai 'berlaku untuk semua tingkatan' terlebih dahulu."

### 4.4 `assignTutorToCourse` / `unassignTutorFromCourse`

**FR terkait:** FR-40

**Input:**
```ts
const assignTutorSchema = z.object({
  courseId: z.string().uuid(),
  tutorProfileId: z.string().uuid(),
});
```

**Alur logika (`assign`):**
1. **Hanya admin** (guard eksplisit — berbeda dari `updateCourse` yang tutor pemilik juga boleh, ini murni hak admin sesuai FR-40)
2. Upsert row `course_tutors` (pakai `@@unique([courseId, tutorProfileId])` sebagai target upsert — jika sudah ada, no-op, tidak error)

**Alur logika (`unassign`):**
1. Hanya admin
2. Delete row `course_tutors` yang cocok
3. **Tidak menghapus** `lesson_progress`/`enrollments` terkait — data historis siswa yang sudah belajar di kursus itu tetap utuh, hanya kepengampuan tutor yang dicabut

### 4.5 `assignClassLevelsToCourse`

**FR terkait:** FR-38

**Input:**
```ts
const assignClassLevelsSchema = z.object({
  courseId: z.string().uuid(),
  classLevelIds: z.array(z.string().uuid()), // bisa kosong array
  visibleToAllLevels: z.boolean(),
});
```

**Validasi:** `classLevelIds` kosong DAN `visibleToAllLevels = false` **diperbolehkan di level draft** (belum publish, admin masih menyusun), tapi akan **ditolak saat `publishCourse`** dipanggil (§4.3) — jadi validasi "harus ada target visibilitas" **tidak** dilakukan di sini, sengaja ditunda ke titik publish supaya admin bisa menyimpan progress draft kapan saja tanpa dipaksa lengkap dulu.

**Alur logika:**
1. Cek permission (admin only, sesuai §3.2 policy)
2. Replace strategy: hapus semua row `course_class_levels` existing untuk `courseId`, lalu insert ulang sesuai `classLevelIds` yang baru (lebih sederhana daripada diff manual, dan volume data per kursus kecil sehingga tidak masalah performa)
3. Update `courses.visibleToAllLevels`

### 4.6 `archiveCourseAction` (Soft-delete / Arsip)

**FR terkait:** A3 (keputusan §1.4)

**Alur logika:**
1. Hanya admin
2. Set `isArchived = true` (bukan hard delete)
3. Kursus otomatis hilang dari semua listing (query listing selalu filter `isArchived = false`, lihat §5)
4. Relasi seperti `lesson_progress` dan `enrollments` tetap utuh, sehingga riwayat siswa tidak rusak.

### 4.7 `createCourseCategory` / `updateCourseCategory` / `deleteCourseCategory` (v1.7, A9)

**FR terkait:** FR-34 (filter kategori di landing page)

Admin only. CRUD sederhana — `name` + `slug` (auto-generate dari `name`, cek uniqueness). `deleteCourseCategory` **tidak butuh guard khusus** — `onDelete: SetNull` di skema (§2.1) menangani course yang masih pakai kategori itu, sama pola persis seperti `deleteCategory` di TSD-Blog-Article.md.

---

## 5. Server Actions/Queries — Listing & Akses per Role

### 5.1 `getCourseListForStudent`

```ts
async function getCourseListForStudent(studentProfileId: string, categoryId?: string) {
  const student = await prisma.studentProfile.findUniqueOrThrow({
    where: { id: studentProfileId },
    select: { classLevelId: true },
  });

  return prisma.course.findMany({
    where: {
      isPublished: true,
      isArchived: false,
      ...(categoryId ? { categoryId } : {}), // v1.7, A9 — filter kategori opsional
      OR: [
        { visibleToAllLevels: true },
        { classLevels: { some: { classLevelId: student.classLevelId } } },
        { enrollments: { some: { studentId: studentProfileId } } }, // grandfathering, lihat A2
      ],
    },
    include: { modules: { select: { id: true } }, category: true }, // untuk hitung jumlah modul & tampilkan badge kategori di card listing
  });
}
```
> Ini implementasi konkret dari helper `getAccessibleCourseFilter` yang didefinisikan di TSD-Auth-ClassLevel.md §5.4 — filter dasarnya sama, ditambah kondisi `enrollments` untuk mendukung A2 (grandfathering).
>
> **Untuk pengunjung anonymous (belum login)** — landing page **tidak** memanggil fungsi ini (fungsi ini butuh `studentProfileId`, tidak ada untuk anonymous). Ada query terpisah `getCourseListForPublicLanding` yang didefinisikan di **TSD-Landing-Page.md** — lebih sederhana (tidak perlu cek `ClassLevel`/enrollment, cukup `isPublished && !isArchived`), dan sengaja tidak digabung ke sini supaya fungsi ini tetap murni untuk konteks siswa yang sudah login.

### 5.2 `getCourseDetailForStudent` (Preview atau Full, Tergantung Status Enroll)

**FR terkait:** A1 (keputusan §1.4)

```ts
async function getCourseDetailForStudent(courseId: string, studentProfileId: string) {
  // 1. Validasi akses (query sama seperti getCourseListForStudent, difilter by id)
  const course = await getCourseListForStudent(studentProfileId).then(list =>
    list.find(c => c.id === courseId)
  );
  if (!course) throw new ForbiddenError();

  // 2. Cek status enrollment — TIDAK ada upsert otomatis di sini
  const enrollment = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId: studentProfileId, courseId } },
  });
  const isEnrolled = !!enrollment;

  // 3. Ambil detail — bentuk select berbeda tergantung status enroll:
  //    belum enroll → hanya title & contentType (preview, tanpa videoUrl/documentUrl & progress)
  //    sudah enroll → full data termasuk videoUrl/documentUrl & progress
  const detail = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        orderBy: { sortOrder: "asc" },
        include: {
          lessons: {
            orderBy: { sortOrder: "asc" },
            select: isEnrolled
              ? {
                  id: true,
                  title: true,
                  contentType: true,
                  videoUrl: true,
                  documentUrl: true,
                  progress: { where: { studentId: studentProfileId } },
                }
              : {
                  id: true,
                  title: true,
                  contentType: true,
                  // videoUrl, documentUrl & progress SENGAJA tidak di-select — mencegah konten
                  // "bocor" ke response walau siswa belum enroll (bukan cuma disembunyikan di UI)
                },
          },
        },
      },
    },
  });

  return { ...detail, isEnrolled };
}
```
> **Catatan keamanan:** Penguncian konten dilakukan dengan **tidak menyertakan field `videoUrl`/`documentUrl` sama sekali** di query saat `isEnrolled = false`, bukan mengambil semua data lalu menyembunyikannya di UI. Ini mencegah siswa yang belum enroll melihat URL video/path dokumen lewat Network tab browser sekalipun.

### 5.2b `enrollInCourse`

**FR terkait:** A1 (keputusan §1.4)

**Input:**
```ts
const enrollSchema = z.object({ courseId: z.string().uuid() });
```

**Alur logika:**
1. Validasi akses — jalankan filter yang sama seperti `getCourseListForStudent` (§5.1), pastikan course accessible (sesuai tingkatan atau "semua tingkatan") sebelum mengizinkan enroll. Siswa tidak bisa enroll ke kursus di luar tingkatannya hanya dengan menebak `courseId`.
2. Upsert `enrollments` (idempotent — aman kalau tombol "Enroll" ke-klik dobel/race condition):
   ```ts
   await prisma.enrollment.upsert({
     where: { studentId_courseId: { studentId, courseId } },
     update: {},
     create: { studentId, courseId },
   });
   ```
3. **(v1.5, ditambahkan untuk TSD-Student-Dashboard.md D4)** Bersihkan wishlist kalau course ini pernah di-wishlist siswa: `prisma.wishlist.deleteMany({ where: { studentId, courseId } })` — aman dipanggil walau tidak ada baris yang cocok. Dilakukan dalam transaksi yang sama dengan poin 2.
4. Return `{ success: true }` — client re-fetch `getCourseDetailForStudent` setelah ini untuk dapat data full (§5.2)

### 5.3 `getMyCoursesForTutor` / `getOtherCoursesForTutor` (v1.6, menggantikan `getCourseListForTutor`)

**FR terkait:** FR-41

```ts
// Tab "Kursus Saya" — scoped, editable
async function getMyCoursesForTutor(tutorProfileId: string) {
  return prisma.course.findMany({
    where: { isArchived: false, courseTutors: { some: { tutorProfileId } } },
    include: { modules: true, _count: { select: { enrollments: true } } },
  });
}

// Tab "Kursus Lain" — read-only, exclusive dari yang di atas (tidak duplikat antar tab)
async function getOtherCoursesForTutor(tutorProfileId: string) {
  return prisma.course.findMany({
    where: { isArchived: false, courseTutors: { none: { tutorProfileId } } },
    include: { modules: true },
  });
}
```
> **Catatan tegas (dipertahankan dari versi sebelumnya):** Sengaja **2 fungsi terpisah**, bukan 1 fungsi dengan parameter boolean "lihat semua" — supaya tidak ada satu titik yang bisa disalahgunakan untuk bikin tutor lihat lebih dari yang seharusnya. Kalau nanti admin butuh "melihat sebagai tutor tertentu" (impersonation untuk debugging), itu harus jadi fungsi terpisah lagi dengan audit log eksplisit.

### 5.4 `getCourseListForAdmin`

```ts
async function getCourseListForAdmin(filters?: { isArchived?: boolean }) {
  return prisma.course.findMany({
    where: { isArchived: filters?.isArchived ?? false },
    include: { modules: true, tutors: { include: { tutorProfile: { include: { user: true } } } }, classLevels: true },
  });
}
```

### 5.5 `getCourseDetailForManagement` (v1.6, query terpadu untuk Course Detail admin & tutor)

**FR terkait:** FR-30, FR-41

**Alur logika:**
```ts
async function getCourseDetailForManagement(courseId: string, currentUser: { role: Role; tutorProfileId?: string }) {
  const hasEditAccess =
    currentUser.role === "admin" ||
    (await prisma.courseTutor.findFirst({
      where: { courseId, tutorProfileId: currentUser.tutorProfileId },
    })) !== null;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      modules: { include: { lessons: true, quiz: true }, orderBy: { sortOrder: "asc" } },
      classLevels: { include: { classLevel: true } }, // selalu di-include; UI cuma render section-nya kalau role === admin
      tutors: { include: { tutorProfile: { include: { user: true } } } }, // sama, UI-gated ke admin
    },
  });

  const enrolledStudents = hasEditAccess
    ? await getEnrolledStudentsForCourse(courseId) // §5.5b — TIDAK dipanggil sama sekali kalau !hasEditAccess (A6)
    : null;

  const { reviews, aggregate } = await getReviewsForCourse(courseId); // §5.6, selalu dipanggil (A7)

  return { course, hasEditAccess, enrolledStudents, reviews, aggregate };
}
```
**Catatan penting (A6):** `enrolledStudents` **tidak pernah di-query** kalau `hasEditAccess === false` — bukan sekadar "di-null-kan sebelum dikirim ke client", tapi query-nya memang tidak pernah dijalankan. Ini mencegah kebocoran data lewat inspeksi response API oleh tutor yang iseng, bukan cuma mengandalkan UI untuk menyembunyikan.

### 5.5b `getEnrolledStudentsForCourse` (helper, dipanggil dari §5.5)

```ts
async function getEnrolledStudentsForCourse(courseId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { courseId },
    include: { student: { include: { user: { select: { name: true, email: true } }, classLevel: { select: { name: true } } } } },
  });

  const lessonIds = (await prisma.lesson.findMany({ where: { module: { courseId } }, select: { id: true } })).map((l) => l.id);
  const completedByStudent = await prisma.lessonProgress.groupBy({
    by: ["studentId"],
    where: { lessonId: { in: lessonIds }, isCompleted: true },
    _count: true,
  });
  const completedMap = new Map(completedByStudent.map((c) => [c.studentId, c._count]));

  return enrollments.map((e) => ({
    studentId: e.studentId,
    name: e.student.user.name,
    email: e.student.user.email,
    classLevel: e.student.classLevel.name,
    progress: lessonIds.length > 0 ? `${completedMap.get(e.studentId) ?? 0}/${lessonIds.length}` : "-",
  }));
}
```
Pola perhitungan progress di sini **sama persis** dengan yang dipakai TSD-Student-Dashboard.md §4.1 (total lesson vs completed), cuma di sini per-course untuk 1 course tertentu, bukan agregat lintas semua course siswa.

### 5.6 `getReviewsForCourse` (reuse dari TSD-Student-Dashboard.md §4.3.3)

**FR terkait:** FR-16 (dipakai ulang, bukan didefinisikan ulang)

Fungsi ini **didefinisikan kanonik di TSD-Student-Dashboard.md §4.3.3** — dokumen ini hanya memanggilnya dari §5.5. Lihat dokumen tersebut untuk detail implementasi (`_avg`, `_count`, list review + nama siswa). Tidak diduplikasi di sini supaya tidak ada 2 sumber kebenaran yang bisa tidak sinkron.

---

## 6. Server Actions — Module & Lesson

### 6.1 `createModule` / `updateModule` / `reorderModules`

**Input `createModule`:**
```ts
const createModuleSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(1).max(150),
});
```

**Permission check (dipakai identik di ketiga action ini):**
```ts
async function canManageCourse(userId: string, courseId: string): Promise<boolean> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.role === "admin") return true;
  if (user.role !== "tutor") return false;
  const tutorProfile = await prisma.tutorProfile.findUnique({ where: { userId } });
  if (!tutorProfile) return false;
  return (await prisma.courseTutor.count({
    where: { courseId, tutorProfileId: tutorProfile.id },
  })) > 0;
}
```
> Fungsi ini jadi **satu-satunya sumber kebenaran** untuk cek "boleh kelola kursus ini atau tidak" — dipakai ulang di `updateCourse`, `publishCourse`, `createModule`, `createLesson`, dan semua write action course-related lain. Menghindari logic permission tertulis ulang berbeda-beda di tiap action (risiko yang sudah diidentifikasi di SDD §10 sebagai risiko "scoping lupa diterapkan").

**`reorderModules` Input:**
```ts
const reorderModulesSchema = z.object({
  courseId: z.string().uuid(),
  orderedModuleIds: z.array(z.string().uuid()),
});
```
**Alur:** iterasi `orderedModuleIds`, update `sortOrder` = index array, dalam 1 `prisma.$transaction` (batch update, hindari multiple round-trip).

### 6.2 `createLesson` / `updateLesson` / `reorderLessons`

**Input `createLesson`:**
```ts
const createLessonSchema = z.object({
  moduleId: z.string().uuid(),
  title: z.string().min(1).max(150),
  contentType: z.enum(["video", "document"]),
  videoUrl: z.string().url().optional(),
  documentUrl: z.string().optional(), // diisi dari hasil uploadDocument, bukan diketik manual
}).refine(
  (data) => (data.contentType === "video" ? !!data.videoUrl : !!data.documentUrl),
  { message: "videoUrl wajib jika contentType video, documentUrl wajib jika document" }
);
```

**Validasi `videoUrl` (FR-8):**
```ts
const YOUTUBE_URL_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11}/;
// Divalidasi via .refine tambahan di schema saat contentType === "video"
```
Sistem **tidak** memanggil YouTube Data API untuk verifikasi video benar-benar accessible (butuh API key & quota, di luar scope Tier 1) — validasi murni format URL. Jika video ternyata private/dihapus, itu akan terlihat sebagai video error di player saat diputar (edge case yang sudah dicatat sebagai risiko di SDD §10, mitigasinya dokumentasi ke tutor, bukan solusi teknis).

**Permission check:** sama seperti §6.1, tapi resolve `courseId` dari `moduleId` dulu (`module.courseId`).

### 6.3 Upload File (Thumbnail & Dokumen)

**FR terkait:** FR-10

**Keputusan Arsitektur Pengunggahan:**
Untuk menghindari batasan ukuran *payload* Server Actions bawaan Next.js (umumnya maksimal 4.5MB di lingkungan *serverless/Vercel*), pengunggahan file fisik dilakukan **langsung dari Client (Browser)** ke Supabase Storage menggunakan Supabase JS Client (`supabase.storage.from('...').upload()`). Setelah berhasil, *client* hanya mengirimkan string `path` file tersebut ke Server Action (`createLesson` atau `updateLesson`) untuk disimpan di database Prisma.

**Alur logika Client:**
1. Validasi tipe file: hanya `application/pdf`, `application/vnd.openxmlformats-officedocument.presentationml.presentation` (.pptx), `application/vnd.ms-powerpoint` (.ppt legacy) untuk materi, dan *image* untuk thumbnail.
2. Validasi ukuran: maksimal **20MB** untuk materi (bisa disesuaikan di sisi Supabase bucket limit juga).
3. Upload langsung ke Supabase Storage, path: `documents/{courseId}/{uuid}-{originalFilename}` atau `thumbnails/{uuid}-{filename}`.
4. Lempar string *path* hasil upload ke Server Action pembentuk data (misal `createLessonAction`).

**Pembersihan Otomatis (Orphan File Prevention):**
Untuk mencegah penumpukan "file yatim" di Storage, *backend* mengimplementasikan `deleteFileFromStorage` di `lib/supabase-storage.ts`:
- **Saat `updateLessonAction`**: Jika materi diubah tipenya dari dokumen ke video, atau jika dokumen lama diganti dengan file baru, server action akan otomatis menghapus file lama dari Supabase Storage.
- **Saat `deleteLessonAction`**: Jika sebuah materi di-*hard-delete* dari database, server action juga akan otomatis menghapus file pendukungnya dari Storage.

**Error handling:**
| Kondisi | Response |
|---|---|
| Tipe file tidak didukung | `{ error: "UNSUPPORTED_FILE_TYPE" }`, pesan UI: "Hanya file PDF atau PPT/PPTX yang didukung" |
| Ukuran > 20MB | `{ error: "FILE_TOO_LARGE" }` |
| Upload ke Supabase Storage gagal | `{ error: "UPLOAD_FAILED" }`, tidak ada row lesson yang tersimpan dengan `documentUrl` kosong/rusak |

*(Catatan: Logika upload yang sama berlaku untuk pengunggahan `thumbnailUrl` kursus, dengan bucket atau folder terpisah seperti `thumbnails/{uuid}-{filename}`)*

### 6.4 Preview Dokumen di Browser

**FR terkait:** FR-10

**Keputusan teknis (skema awal Tier 1):**
- Menggunakan library **`@cyntler/react-doc-viewer`** yang mendukung multi format (PDF, DOCX, PPTX).

**Keuntungan teknis:** Ini menghindari perlunya mengirim URL file ke pihak ketiga (seperti Google Docs Viewer) demi render preview, sehingga materi lebih aman dan dapat di-render langsung di React DOM.

**Alur pengambilan signed URL (dipanggil dari Server Component saat render halaman lesson):**
```ts
async function getDocumentSignedUrl(documentPath: string): Promise<string> {
  const { data } = await supabase.storage
    .from("documents")
    .createSignedUrl(documentPath, 3600); // berlaku 1 jam, cukup untuk 1 sesi belajar
  return data.signedUrl;
}
```

---

## 7. Server Action — Progress Tracking

### 7.1 `markLessonComplete` / `unmarkLessonComplete`

**FR terkait:** FR-9

**Input:**
```ts
const markLessonSchema = z.object({
  lessonId: z.string().uuid(),
});
```

**Alur logika (`mark`):**
1. Validasi siswa **sudah enroll** di kursus pemilik lesson ini — resolve `lesson → module → course`, cek row `enrollments` untuk pasangan `(studentId, courseId)` tersebut. **Ini beda dari sekadar "punya akses tingkatan"** (§5.1) — karena sejak A1 direvisi, konten lesson terkunci sampai enroll, jadi menandai selesai pun logisnya baru masuk akal setelah siswa benar-benar enroll, bukan cuma "berhak lihat preview". Jika belum enroll → 403, jangan asumsikan siswa boleh menandai lesson dari kursus yang belum di-enroll-nya lewat manipulasi request
2. Upsert `lesson_progress`:
   ```ts
   await prisma.lessonProgress.upsert({
     where: { studentId_lessonId: { studentId, lessonId } },
     update: { isCompleted: true, completedAt: new Date() },
     create: { studentId, lessonId, isCompleted: true, completedAt: new Date() },
   });
   ```

**Alur logika (`unmark`):** sama, tapi `isCompleted: false, completedAt: null` (izinkan siswa toggle balik sesuai FR-9 edge case)

---

## 8. UI Requirements

### 8.1 Admin — `/admin/courses`
- List semua kursus (published + draft, exclude archived by default, toggle filter arsip), dari `getCourseListForAdmin`
- Kolom: judul, status (draft/published), jumlah tingkatan terkait / "Semua Tingkatan", jumlah tutor pengampu
- Tombol "Arsipkan" per row (memanggil `archiveCourseAction`, dengan dialog konfirmasi)
- Klik row → masuk ke **Course Detail** (§8.2) yang sama dipakai tutor, cuma admin selalu dapat mode edit penuh + section admin-only

### 8.2 Course Detail — `/[role]/courses/[id]` (v1.6, 1 komponen shared untuk admin & tutor)

> **Perubahan v1.6:** Sebelumnya ini disebut "Course Builder" dan diakses lewat route `/edit` terpisah. Sekarang ini **1 halaman/komponen** yang dipakai untuk admin, tutor dengan akses edit, maupun tutor yang cuma preview — bedanya cuma section mana yang dirender, berdasarkan `hasEditAccess` dan `role` dari `getCourseDetailForManagement` (§5.5). Tidak ada lagi route terpisah "builder" vs "detail/preview".

**Kalau `hasEditAccess = true` (admin, atau tutor di `course_tutors` course ini):**
- Form info dasar kursus (title, description, thumbnail) — editable
- **Dropdown Kategori (v1.7, A9)** — single-select dari `course_categories`, boleh kosong ("Tanpa Kategori"). **Boleh diisi admin maupun tutor** (beda dari section tingkatan/tutor pengampu di bawah yang admin-only) — kategori program itu keputusan konten, bukan keputusan akses, jadi wajar tutor yang bikin course juga yang menentukan kategorinya
- **Section tingkatan** (khusus `role === 'admin'` — tutor dengan `hasEditAccess = true` sekalipun **tetap tidak** melihat/mengedit section ini, sesuai FR-40 hak admin, tidak berubah dari sebelumnya): multi-select checkbox daftar `class_levels` + toggle terpisah "Berlaku untuk Semua Tingkatan"
- **Section tutor pengampu** (khusus `role === 'admin'`, sama alasannya): multi-select tutor dari daftar `tutor_profiles`, dengan tag/chip yang bisa dihapus (unassign)
- **Section modul & lesson** (admin & tutor dengan akses edit): drag-and-drop reorder, tombol tambah modul/lesson — form lesson punya pilihan tipe konten (Video atau Dokumen); jika Video, field URL YouTube; jika Dokumen, komponen upload file (memanggil `uploadDocument`, §6.3). Tiap modul juga punya slot **"Kelola Kuis Modul"** — detail builder sepenuhnya di TSD-Quiz.md
- **Section Siswa Enrolled (baru, v1.6, A6)** — table dari `getEnrolledStudentsForCourse` (§5.5b): nama, email, tingkatan, progress (`X/Y lesson`). **Read-only** di sini — tidak ada aksi pindah tingkatan (itu murni hak admin, lihat TSD-Auth-ClassLevel.md v1.2)
- **Section Reviews (baru, v1.6, A7)** — list review + rata-rata rating dari `getReviewsForCourse` (reuse TSD-Student-Dashboard.md §4.3.3), read-only (submit review tetap murni hak siswa)
- Tombol "Publish" — jika validasi §4.3 gagal, tampilkan pesan error tepat di section tingkatan

**Kalau `hasEditAccess = false` (tutor cuma preview, tab "Kursus Lain"):**
- Semua section di atas jadi **read-only** (info dasar, struktur modul/lesson terlihat tapi tidak bisa diedit), **kecuali**:
  - Section tingkatan & tutor pengampu — **tidak ditampilkan sama sekali** (itu memang admin-only, bukan soal edit/read-only)
  - Section Siswa Enrolled — **tidak ditampilkan sama sekali** (A6 — data tidak pernah sampai ke client)
  - Section Reviews — **tetap tampil** (A7 — review memang publik)
- Tidak ada tombol "Publish"/simpan apa pun di mode ini

### 8.3 Siswa — `/student/courses` (Listing)
- Grid/list card kursus hasil `getCourseListForStudent`
- Badge kecil di tiap card menandakan status: "Belum Diikuti" vs "Sedang Diikuti" (berdasarkan ada/tidaknya row `enrollments`) — sekarang jadi pembeda yang bermakna karena enroll adalah aksi sadar (A1), bukan cuma indikator kosmetik

### 8.4 Siswa — `/student/courses/[id]` (Detail & Belajar)
- **Belum enroll (`isEnrolled = false`):** tampilkan info kursus (judul, deskripsi, thumbnail), struktur modul → lesson sebagai **daftar judul saja** (terkunci, ikon gembok, tidak bisa diklik), tombol besar **"Enroll"** yang memanggil `enrollInCourse` (§5.2b) lalu re-fetch halaman
- **Sudah enroll (`isEnrolled = true`):** struktur modul → lesson penuh (accordion/expandable list). Per lesson: jika `video`, embed YouTube iframe standar (`https://www.youtube.com/embed/{videoId}`); jika `document`, tampilkan preview sesuai §6.4. Tombol "Tandai Selesai" / "Batalkan Tanda Selesai" (toggle, state dari `lesson_progress` yang sudah di-include di query §5.2), progress bar ringkas di header (jumlah lesson selesai / total lesson dalam course — **tidak** menghitung status kuis modul, itu badge terpisah, lihat TSD-Quiz.md §7.3). Kalau modul punya kuis, badge status kuis (Belum dikerjakan/Belum lulus/Lulus) tampil di bawah daftar lesson modul itu, murni informasional — tidak mempengaruhi akses lesson mana pun
- Tidak ada tombol "Un-enroll" di Tier 1 — sekali enroll, tetap enroll (selaras A2, tidak ada mekanisme keluar dari kursus)

### 8.5 Tutor — `/tutor/courses` (v1.6, digabung dengan bekas "Eksplorasi Kursus")
- **2 tab**: "Kursus Saya" (dari `getMyCoursesForTutor`, §5.3) dan "Kursus Lain" (dari `getOtherCoursesForTutor`) — **exclusive**, course yang sama tidak muncul di dua tab sekaligus
- Tombol **"+ Buat Kursus Baru"** selalu terlihat di kedua tab (memanggil `createCourse`, §4.1) — course baru otomatis masuk ke tab "Kursus Saya" karena pembuatnya langsung jadi anggota `course_tutors`
- Klik card di tab mana pun → masuk ke **Course Detail** yang sama (§8.2), mode edit/read-only otomatis mengikuti `hasEditAccess` — tutor tidak perlu tahu/pilih "mode" apa pun secara eksplisit, cukup konsekuensi natural dari tab asal & kepemilikannya

---

## 9. Edge Cases & Validation Summary

| # | Kondisi | Perilaku yang Diharapkan |
|---|---|---|
| 1 | Tutor mencoba akses/edit kursus yang bukan miliknya (tebak-tebak `courseId` di URL) | `canManageCourse` return `false` → 403, ditolak di Server Action sebelum query lanjut (bukan hanya mengandalkan RLS) |
| 2 | Admin publish kursus tanpa tingkatan & tanpa flag "semua tingkatan" | Ditolak dengan pesan jelas (§4.3), tidak silent fail |
| 3 | Siswa pindah tingkatan setelah enrolled di suatu kursus | Akses & progress tetap ada (A2), kursus tetap muncul di "Kursus Saya" walau sudah tidak cocok tingkatan barunya |
| 4 | Siswa membuka detail kursus yang **tidak** dia punya akses (manipulasi URL langsung) | `getCourseDetailForStudent` return not-found di langkah validasi akses (§5.2 poin 1), tidak sampai cek status enroll |
| 5 | Siswa mencoba `enrollInCourse` ke kursus di luar tingkatannya (manipulasi `courseId` di request) | Ditolak di validasi akses (§5.2b poin 1), tidak ada row enrollment tercipta |
| 6 | Siswa memanggil `markLessonComplete` untuk lesson dari kursus yang belum di-enroll (manipulasi `lessonId`) | Ditolak — validasi §7.1 sekarang cek row `enrollments`, bukan cuma akses tingkatan |
| 7 | Siswa klik tombol "Enroll" dua kali cepat (double-click/race condition) | Aman — `enrollInCourse` pakai upsert idempotent, tidak menghasilkan row duplikat maupun error |
| 7a | Upload file gagal atau ukuran melebihi batas | Ditolak di client (validasi awal Supabase) dan `createLesson` tidak akan terpanggil jika upload gagal. Jika upload berhasil tapi simpan DB gagal (misal *courseId* tidak valid), file yatim harus dibersihkan (fitur *rollback* manual di catch block atau *cron* opsional di masa depan). |
| 8 | Video YouTube yang di-input ternyata di-private-kan tutor setelah lesson dibuat | Tidak terdeteksi otomatis oleh sistem (bukan dicek server-side) — muncul sebagai video error saat siswa memutar; mitigasi dokumentasi, bukan solusi teknis (lihat SDD §10) |
| 9 | Admin unassign satu-satunya tutor dari kursus yang published | Diizinkan — kursus tetap published & bisa diakses siswa, hanya tidak ada tutor yang "memiliki" untuk sementara sampai admin assign ulang |
| 10 | Dua admin/tutor reorder modul secara bersamaan (race condition) | Diterima sebagai limitasi Tier 1 (last-write-wins, konsisten dengan skala kecil single-tenant) — tidak dibangun locking khusus |
| 11 | (v1.6) Tutor tanpa akses edit (tab "Kursus Lain") coba akses data siswa enrolled lewat manipulasi request langsung ke `getEnrolledStudentsForCourse` | Ditolak — fungsi ini hanya pernah dipanggil dari dalam `getCourseDetailForManagement` setelah cek `hasEditAccess` (§5.5), tidak ada endpoint terpisah yang bisa dipanggil langsung tanpa guard yang sama |
| 12 | (v1.6) Tutor coba `updateCourse`/`createModule`/dst pada course di tab "Kursus Lain" (manipulasi request, bukan cuma UI yang menyembunyikan tombol) | Ditolak `403` — `canManageCourse` (§6.1) tetap jadi satu-satunya sumber kebenaran permission, tidak berubah dari sebelumnya, cuma sekarang dipakai juga untuk menentukan `hasEditAccess` di §5.5 |
| 13 | (v1.6) Tutor membuat course baru dari `/tutor/courses` | Course baru langsung muncul di tab "Kursus Saya" (karena `createCourse` §4.1 auto-insert `course_tutors` untuk pembuatnya), **tidak pernah** muncul dulu di "Kursus Lain" sebelum pindah tab |

---

## 10. Dependencies

| Dependency | Kebutuhan Spesifik di Modul Ini |
|---|---|
| Supabase Storage | Bucket `documents`, signed URL generation (§6.3, §6.4) |
| `@cyntler/react-doc-viewer` | Rendering dokumen PDF/PPT/Word secara native di komponen React (§6.4) |
| YouTube (embed iframe biasa) | Video materi, tanpa API key di Tier 1 |
| `prisma` | Transaksi batch untuk `reorderModules`/`reorderLessons`, upsert untuk `enrollments`/`lesson_progress`; `groupBy` untuk hitung progress per course (§5.5b) |
| TSD-Auth-ClassLevel.md (v1.2) | Model `User`/`StudentProfile`/`ClassLevel`; **tidak lagi** dependency ke `assignStudentToClassLevel` (v1.6 — fitur itu murni admin, dihapus dari sisi tutor) |
| TSD-Quiz.md (v3.0, dependency ringan satu arah) | TSD-Quiz.md butuh model `Module`, `Course`, `Enrollment`, pola `canManageCourse` dari dokumen ini — tapi **tidak sebaliknya** |
| TSD-Student-Dashboard.md (v1.0, dependency dua arah sejak v1.6/A7) | Dokumen ini **memanggil** `getReviewsForCourse` (§5.6) yang didefinisikan kanonik di sana — dependency baru yang sebelumnya cuma satu arah (TSD-Student-Dashboard yang butuh dari sini, bukan sebaliknya) |
| TSD-Tutor-Dashboard.md (v1.1, dependency erat) | Halaman `/tutor/courses` (§8.5) & Course Detail (§8.2) yang didetailkan di sini jadi tulang punggung utama dashboard tutor — TSD-Tutor-Dashboard.md v1.1 sekarang cuma menyisakan ringkasan angka & aggregate "Siswa Saya" lintas course, bukan detail per-course lagi |
| TSD-Landing-Page.md (v1.0, dependency baru sejak v1.7) | `CourseCategory` (A9) & `getCourseListForStudent` dengan filter `categoryId` dipakai sebagai basis `getCourseListForPublicLanding` di sana |

---

## 11. Acceptance Criteria

- [ ] Admin bisa CRUD `CourseCategory`; hapus kategori tidak menghapus course, cuma melepas labelnya (A9)
- [ ] Admin & tutor (dengan akses edit) bisa pilih kategori course dari dropdown; filter kategori di listing course berfungsi
- [ ] Tutor membuat kursus baru → otomatis jadi pengampu tanpa perlu admin assign manual
- [ ] Admin bisa assign/unassign banyak tutor ke satu kursus, dan banyak tingkatan ke satu kursus (atau flag "semua tingkatan")
- [ ] Kursus tidak bisa dipublish tanpa tingkatan/flag terisi, pesan error jelas
- [ ] Tutor hanya bisa **edit** kursus yang dia ampu (tab "Kursus Saya") — diverifikasi manual coba edit `courseId` kursus tutor lain langsung via URL/request, harus 403
- [ ] Tutor bisa **melihat** (read-only) semua kursus lain di institusi lewat tab "Kursus Lain", termasuk struktur modul/lesson-nya, tapi tanpa section Siswa Enrolled & tanpa tombol edit apa pun
- [ ] Course Detail admin & tutor memakai 1 komponen yang sama (dicek: tidak ada 2 implementasi terpisah untuk "builder" vs "preview")
- [ ] Response API untuk tutor yang cuma preview (`hasEditAccess: false`) **tidak mengandung** data siswa enrolled sama sekali (dicek lewat Network tab) — bukan cuma disembunyikan di UI
- [ ] Section Reviews tampil di Course Detail untuk semua yang bisa akses (termasuk tutor preview), datanya identik dengan yang tampil di halaman siswa
- [ ] Siswa hanya melihat kursus sesuai tingkatannya atau yang "semua tingkatan", ditambah kursus yang sudah pernah dia enroll sebelumnya (grandfathering)
- [ ] Siswa bisa lihat preview kursus (struktur modul/lesson terkunci) sebelum enroll, dan konten (video) baru terbuka setelah klik "Enroll"
- [ ] Response `getCourseDetailForStudent` untuk siswa yang belum enroll **tidak mengandung** `videoUrl`/`documentUrl` sama sekali (dicek lewat Network tab, bukan cuma UI)
- [ ] Siswa pindah tingkatan tidak kehilangan akses/progress ke kursus yang sudah di-enroll
- [ ] Video YouTube ter-embed & bisa diputar; dokumen PDF & PPT/PPTX bisa dipreview tanpa download (via `@cyntler/react-doc-viewer`)
- [ ] Upload dokumen menolak tipe file di luar PDF/PPT/PPTX, dan file di atas batas ukuran, baik divalidasi di client maupun server
- [ ] Tombol Tandai Selesai/Batalkan hanya bisa dipakai siswa yang sudah enroll, berfungsi dua arah, tersimpan langsung tanpa perlu refresh
- [ ] Semua RLS policy §3 diuji manual per role, termasuk mencoba akses lintas-scope yang seharusnya ditolak

---

*TSD ini merujuk ke SDD.md (§3, §5, §7.6–7.7), TSD-Auth-ClassLevel.md (v1.2), TSD-Student-Dashboard.md (v1.0, `getReviewsForCourse`), dan TSD-Tutor-Dashboard.md (v1.1) untuk dependency dasar. Perubahan pada dokumen-dokumen tersebut harus tercermin di revisi TSD ini.*
