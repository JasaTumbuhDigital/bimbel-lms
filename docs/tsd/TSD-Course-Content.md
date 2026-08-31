# Technical Spec Document (TSD)
## Fitur: Course & Content Module

**Versi:** 1.2
**Tanggal:** 25 Agustus 2026
**Terkait dokumen:** PRD.md (v2.2) · SDD.md (v1.1) · Implementation-Plan.md (v2.4, Fase 2) · TSD-Auth-ClassLevel.md (v1.0, dependency)
**Scope Implementation Plan:** Fase 2 (Modul Kursus & Materi)

> **Ringkasan perubahan v1.2:** FR-10 (lesson tipe dokumen PDF/PPT + preview) **dikembalikan ke Tier 1** — dibangun dengan skema awal (Google Docs Viewer untuk preview PPT/PPTX, native iframe untuk PDF). Library khusus (`@cyntler/react-doc-viewer`, dst) dicatat sebagai opsi upgrade **jika ada permintaan klien** (custom quote/Tier 2), bukan solusi default. Lihat §6.
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

**A4 — Preview dokumen pakai Google Docs Viewer di Tier 1, library khusus jadi opsi upgrade:** FR-10 (upload dokumen PDF/PPT + preview di browser) **tetap dibangun di Tier 1**, dengan pendekatan paling murah secara effort: PDF pakai native `<iframe>` browser, PPT/PPTX pakai embed **Google Docs Viewer** (§6.4). Library rendering khusus (`@cyntler/react-doc-viewer`, `pptx-viewer`, `pptx-renderer`, `pptx-glimpse`) **tidak dipakai di skema awal** — dicatat sebagai opsi upgrade kalau ada permintaan klien spesifik (misal keberatan file dikirim ke Google untuk preview), bukan dibangun sekarang secara spekulatif.

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
  createdBy          String   @map("created_by") // users.id — admin atau tutor pembuat
  isPublished        Boolean  @default(false) @map("is_published")
  isArchived         Boolean  @default(false) @map("is_archived")
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")

  modules      Module[]
  classLevels  CourseClassLevel[]
  tutors       CourseTutor[]
  enrollments  Enrollment[]

  @@map("courses")
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

-- WRITE course_class_levels: hanya admin (FR-38 dikelola admin)
CREATE POLICY course_class_levels_write ON course_class_levels FOR ALL
USING (EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.role = 'admin'));

-- WRITE course_tutors: hanya admin (FR-40)
CREATE POLICY course_tutors_write ON course_tutors FOR ALL
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

---

## 5. Server Actions/Queries — Listing & Akses per Role

### 5.1 `getCourseListForStudent`

```ts
async function getCourseListForStudent(studentProfileId: string) {
  const student = await prisma.studentProfile.findUniqueOrThrow({
    where: { id: studentProfileId },
    select: { classLevelId: true },
  });

  return prisma.course.findMany({
    where: {
      isPublished: true,
      isArchived: false,
      OR: [
        { visibleToAllLevels: true },
        { classLevels: { some: { classLevelId: student.classLevelId } } },
        { enrollments: { some: { studentId: studentProfileId } } }, // grandfathering, lihat A2
      ],
    },
    include: { modules: { select: { id: true } } }, // untuk hitung jumlah modul di card listing
  });
}
```
> Ini implementasi konkret dari helper `getAccessibleCourseFilter` yang didefinisikan di TSD-Auth-ClassLevel.md §5.4 — filter dasarnya sama, ditambah kondisi `enrollments` untuk mendukung A2 (grandfathering).

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
3. Return `{ success: true }` — client re-fetch `getCourseDetailForStudent` setelah ini untuk dapat data full (§5.2)

### 5.3 `getCourseListForTutor`

**FR terkait:** FR-41

```ts
async function getCourseListForTutor(tutorProfileId: string) {
  return prisma.course.findMany({
    where: {
      isArchived: false,
      // Tutor dapat melihat semua list kursus, jadi filter berdasarkan tutorProfileId dihilangkan.
      // (FR-41 yang baru)
    },
    include: { modules: true },
  });
}
```
> **Catatan tegas:** Fungsi ini **tidak menerima parameter opsional "lihat semua"** dalam bentuk apa pun. Kalau di masa depan admin butuh "melihat sebagai tutor tertentu" (impersonation untuk debugging), itu harus jadi fungsi terpisah dengan audit log eksplisit — bukan menambah flag di fungsi ini, supaya tidak ada celah tutor lain bisa memanfaatkan.

### 5.4 `getCourseListForAdmin`

```ts
async function getCourseListForAdmin(filters?: { isArchived?: boolean }) {
  return prisma.course.findMany({
    where: { isArchived: filters?.isArchived ?? false },
    include: { modules: true, tutors: { include: { tutorProfile: { include: { user: true } } } }, classLevels: true },
  });
}
```

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
- **PDF** → native `<iframe src={signedUrl}>` — browser modern merender PDF langsung tanpa library tambahan
- **PPT/PPTX** → **tidak ada rendering native browser**. Solusi: embed via **Google Docs Viewer** (`https://docs.google.com/gview?url={signedUrl}&embedded=true`), yang menerima URL publik/signed dan merender pratinjau tanpa perlu convert file di server sendiri

**Trade-off yang diterima:** Google Docs Viewer mengirim URL file (walau signed & sementara) ke pihak ketiga (Google) untuk generate preview — ini diterima sebagai kompromi wajar untuk Tier 1 (menghindari kompleksitas convert PPTX→PDF sendiri di server, yang butuh library berat/headless office, atau integrasi library rendering khusus yang belum tentu dibutuhkan semua klien).

**Jalur upgrade (jika klien minta, bukan default):** Kalau suatu klien keberatan file-nya dikirim ke Google (concern privasi/kerahasiaan materi), atau butuh kualitas preview PPTX yang lebih baik, evaluasi salah satu dari `@cyntler/react-doc-viewer`, `pptx-viewer`, `pptx-renderer`, atau `pptx-glimpse` sebagai pengganti — pilih berdasarkan kualitas rendering & kemudahan integrasi Next.js **saat kebutuhan itu muncul**, karena ekosistem library ini cukup cepat berubah dan belum tentu opsi terbaik hari ini masih relevan nanti. Ini scope custom quote per klien, bukan bagian template standar.

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
- List semua kursus (published + draft, exclude archived by default, toggle filter arsip)
- Kolom: judul, status (draft/published), jumlah tingkatan terkait / "Semua Tingkatan", jumlah tutor pengampu
- Tombol "Arsipkan" per row (memanggil `deleteCourse`, dengan dialog konfirmasi)

### 8.2 Admin/Tutor — `/[role]/courses/[id]/edit` (Course Builder)
- Form info dasar kursus (title, description, thumbnail)
- **Section tingkatan** (khusus admin — tutor tidak melihat/mengedit section ini sesuai FR-40 hak admin): multi-select checkbox daftar `class_levels` + toggle terpisah "Berlaku untuk Semua Tingkatan" (kalau toggle ini aktif, multi-select checkbox di-disable secara visual)
- **Section tutor pengampu** (khusus admin): multi-select tutor dari daftar `tutor_profiles`, dengan tag/chip yang bisa dihapus (unassign)
- **Section modul & lesson** (admin & tutor pemilik): drag-and-drop reorder (memanggil `reorderModules`/`reorderLessons`), tombol tambah modul/lesson — form lesson punya pilihan tipe konten (Video atau Dokumen); jika Video, field URL YouTube; jika Dokumen, komponen upload file (memanggil `uploadDocument`, §6.3)
- Tombol "Publish" — jika validasi §4.3 gagal, tampilkan pesan error tepat di section tingkatan (bukan toast generik), supaya admin langsung tahu apa yang perlu dilengkapi

### 8.3 Siswa — `/student/courses` (Listing)
- Grid/list card kursus hasil `getCourseListForStudent`
- Badge kecil di tiap card menandakan status: "Belum Diikuti" vs "Sedang Diikuti" (berdasarkan ada/tidaknya row `enrollments`) — sekarang jadi pembeda yang bermakna karena enroll adalah aksi sadar (A1), bukan cuma indikator kosmetik

### 8.4 Siswa — `/student/courses/[id]` (Detail & Belajar)
- **Belum enroll (`isEnrolled = false`):** tampilkan info kursus (judul, deskripsi, thumbnail), struktur modul → lesson sebagai **daftar judul saja** (terkunci, ikon gembok, tidak bisa diklik), tombol besar **"Enroll"** yang memanggil `enrollInCourse` (§5.2b) lalu re-fetch halaman
- **Sudah enroll (`isEnrolled = true`):** struktur modul → lesson penuh (accordion/expandable list). Per lesson: jika `video`, embed YouTube iframe standar (`https://www.youtube.com/embed/{videoId}`); jika `document`, tampilkan preview sesuai §6.4. Tombol "Tandai Selesai" / "Batalkan Tanda Selesai" (toggle, state dari `lesson_progress` yang sudah di-include di query §5.2), progress bar ringkas di header (jumlah lesson selesai / total lesson dalam course)
- Tidak ada tombol "Un-enroll" di Tier 1 — sekali enroll, tetap enroll (selaras A2, tidak ada mekanisme keluar dari kursus)

### 8.5 Tutor — `/tutor/courses` (Listing Scoped)
- Sama seperti §8.3 secara struktur, tapi data dari `getCourseListForTutor` — **tidak ada** UI untuk "lihat kursus lain", tidak ada search yang menembus scope ini

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

---

## 10. Dependencies

| Dependency | Kebutuhan Spesifik di Modul Ini |
|---|---|
| Supabase Storage | Bucket `documents`, signed URL generation (§6.3, §6.4) |
| Google Docs Viewer (eksternal, tanpa API key) | Preview PPT/PPTX (§6.4) — trade-off privasi dicatat eksplisit, ada jalur upgrade ke library khusus jika diminta klien |
| YouTube (embed iframe biasa) | Video materi, tanpa API key di Tier 1 |
| `prisma` | Transaksi batch untuk `reorderModules`/`reorderLessons`, upsert untuk `enrollments`/`lesson_progress` |
| TSD-Auth-ClassLevel.md | `getAccessibleCourseFilter` helper, model `User`/`StudentProfile`/`ClassLevel` |

---

## 11. Acceptance Criteria

- [ ] Tutor membuat kursus baru → otomatis jadi pengampu tanpa perlu admin assign manual
- [ ] Admin bisa assign/unassign banyak tutor ke satu kursus, dan banyak tingkatan ke satu kursus (atau flag "semua tingkatan")
- [ ] Kursus tidak bisa dipublish tanpa tingkatan/flag terisi, pesan error jelas
- [ ] Tutor hanya melihat & bisa edit kursus yang dia ampu — diverifikasi manual coba akses `courseId` kursus tutor lain langsung via URL
- [ ] Siswa hanya melihat kursus sesuai tingkatannya atau yang "semua tingkatan", ditambah kursus yang sudah pernah dia enroll sebelumnya (grandfathering)
- [ ] Siswa bisa lihat preview kursus (struktur modul/lesson terkunci) sebelum enroll, dan konten (video) baru terbuka setelah klik "Enroll"
- [ ] Response `getCourseDetailForStudent` untuk siswa yang belum enroll **tidak mengandung** `videoUrl`/`documentUrl` sama sekali (dicek lewat Network tab, bukan cuma UI)
- [ ] Siswa pindah tingkatan tidak kehilangan akses/progress ke kursus yang sudah di-enroll
- [ ] Video YouTube ter-embed & bisa diputar; dokumen PDF & PPT/PPTX bisa dipreview tanpa download (via Google Docs Viewer untuk PPT/PPTX)
- [ ] Upload dokumen menolak tipe file di luar PDF/PPT/PPTX, dan file di atas batas ukuran, baik divalidasi di client maupun server
- [ ] Tombol Tandai Selesai/Batalkan hanya bisa dipakai siswa yang sudah enroll, berfungsi dua arah, tersimpan langsung tanpa perlu refresh
- [ ] Semua RLS policy §3 diuji manual per role, termasuk mencoba akses lintas-scope yang seharusnya ditolak

---

*TSD ini merujuk ke SDD.md (§3, §5, §7.6–7.7) dan TSD-Auth-ClassLevel.md untuk dependency dasar. Perubahan pada dokumen tersebut harus tercermin di revisi TSD ini.*
