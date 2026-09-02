# Technical Spec Document (TSD)
## Fitur: Quiz Module (Post-Test per Modul)

**Versi:** 3.0
**Tanggal:** 2 September 2026
**Terkait dokumen:** PRD.md (v2.4, direvisi bersamaan) · SDD.md (v1.3, direvisi bersamaan) · Implementation-Plan.md (v2.5, direvisi bersamaan, Fase 3) · TSD-Course-Content.md (v1.4, direvisi bersamaan — dependency ringan satu arah) · TSD-Auth-ClassLevel.md (v1.0, dependency tidak langsung)
**Scope Implementation Plan:** Fase 3 (Kuis)

> **Ringkasan perubahan v3.0 (relasi dipindah dari Lesson ke Module):** Di v2.0, kuis melekat ke satu `Lesson` (1:1) dan kelulusannya otomatis menandai lesson itu selesai. Setelah didiskusikan ulang, ini diganti: kuis sekarang melekat ke **Module** (1:1) — sejajar/sibling dengan Lesson di bawah modul yang sama, sesuai bahasa asli FR-7 ("modul → sub-materi: video/dokumen/kuis"). Kelulusan kuis sekarang **murni informasional** (badge status) — **tidak** menggerbang penandaan lesson mana pun, tidak butuh lagi helper bersama dengan `lesson_progress`. Ini melepas dependency dua arah ke TSD-Course-Content yang ada di v2.0 — sekarang dependency-nya cuma satu arah dan ringan (TSD-Quiz.md butuh Module/Course/Enrollment dari TSD-Course-Content, tapi tidak sebaliknya).

---

## 1. Overview & Scope

### 1.1 Tujuan
Spesifikasi siap-coding untuk kuis pilihan ganda yang melekat ke satu modul (post-test akhir modul), dengan passing grade sebagai ambang, ditampilkan sebagai badge status kelulusan yang murni informasional — tidak mempengaruhi akses konten atau progress lesson mana pun.

### 1.2 FR yang Dicakup

| FR | Deskripsi (direvisi, lihat PRD v2.4) |
|---|---|
| FR-11 | Tutor/admin membuat kuis pilihan ganda per modul dengan penilaian otomatis & passing grade |
| FR-12 | Siswa melihat status kelulusan & skor terbaik tiap kuis modul yang pernah dikerjakan (badge informasional) |

FR-9 (penandaan manual lesson) **sama sekali tidak terdampak** oleh dokumen ini — lihat ringkasan perubahan di atas. Modul **exam/ujian standalone** (soal beragam jenis, timer, setara modul tersendiri di course) tetap tidak dicakup di sini — lihat TSD-Exam-Standalone-DRAFT.md.

### 1.3 Dependency
Modul ini bergantung **satu arah, ringan** pada TSD-Course-Content.md — hanya butuh:
- Model `Module` (kuis melekat ke tepat satu `moduleId`, relasi **1:1**)
- Model `Enrollment` — syarat siswa boleh mengerjakan kuis: harus sudah enroll di course pemilik modul tersebut
- Pola `canManageCourse` (resolve module → course → cek `course_tutors`) dipakai ulang untuk permission builder kuis

**Tidak** ada dependency balik — TSD-Course-Content.md tidak perlu tahu apa pun tentang internal kuis selain menyediakan 1 slot UI per modul (§8.2, §8.4 di dokumen tersebut, sudah direvisi ke v1.4).

### 1.4 Keputusan Desain

**D1 — Quiz 1:1 dengan Module, sejajar dengan Lesson (bukan lagi melekat ke Lesson):**
`moduleId` di tabel `quizzes` diberi constraint `@unique` — 1 modul maksimal 1 kuis (post-test akhir modul). Ini lebih setia ke bahasa asli FR-7 ("sub-materi: video/dokumen/kuis" — tiga jenis konten yang sejajar di bawah modul) dibanding desain v2.0 yang menempelkan kuis ke satu lesson spesifik.

**D2 — Tidak ada histori granular per percobaan yang disimpan:**
Sama seperti v2.0 — hanya 1 row agregat per pasangan `(student, quiz)` di `quiz_progress`, bukan tabel `quiz_attempts`/`quiz_answers` terpisah. Hasil per-soal (benar/salah) tetap dihitung & dikirim balik ke UI saat submit untuk feedback instan, tapi ephemeral, tidak persisted.

**D3 — Passing grade per kuis (persentase), default 70%:**
Sama seperti v2.0 — field `passingScorePercent`, bisa diubah tutor/admin per kuis.

**D4 — Attempt tidak dibatasi; status lulus tidak pernah turun lagi:**
Sama seperti v2.0 — `attemptsCount += 1` tiap submit, `bestScore = MAX(lama, baru)`, `isPassed = lama OR (baru ≥ passingScorePercent)`, permanen begitu tercapai.

**D5 — Kelulusan kuis murni informasional, TIDAK menggerbang apa pun (keputusan baru, ganti C5 di v2.0):**
Berbeda total dari v2.0. Status lulus/belum & skor terbaik kuis modul **hanya ditampilkan sebagai badge** di UI (§7.3) — sengaja **tidak** dipakai untuk:
- Menandai lesson mana pun sebagai selesai (FR-9 tetap 100% manual, tidak ada exception)
- Mengunci/membuka modul berikutnya (tidak ada sequential unlock di Tier 1)
- Dihitung ke progress bar kursus (`X lesson selesai / Y total`) — progress bar tetap murni berbasis `lesson_progress`, kuis modul ditampilkan sebagai badge terpisah di sampingnya, bukan bagian dari angka itu

> **Konsekuensi arsitektur:** karena tidak ada gating, `submitQuizAttempt` (§5.2) **tidak perlu** transaksi gabungan dengan `lesson_progress` — cukup upsert `quiz_progress` sendiri. Ini juga berarti akses ke halaman kuis **tidak disyaratkan** menyelesaikan semua lesson modul itu dulu — siswa yang sudah enroll bisa langsung kerjakan kuis modul kapan saja, terlepas dari status lesson-lesson di modul yang sama. Kalau nanti ternyata dibutuhkan urutan wajib (misal "harus selesaikan semua lesson dulu baru bisa buka kuis"), itu jadi keputusan tambahan terpisah — dicatat sebagai potensi follow-up di §8, bukan diasumsikan sekarang.

**D6 — Tidak ada "structure-locked" setelah ada progress siswa:**
Sama seperti v2.0 — tutor/admin bebas mengedit soal/opsi kapan saja. Perubahan soal setelah beberapa siswa lulus tidak me-reset status `isPassed` mereka (trade-off yang diterima sadar, sama seperti v2.0).

**D7 — `deleteQuiz` diizinkan kapan saja:**
Sama seperti v2.0, tapi konsekuensinya sekarang **lebih sederhana** dari v2.0 karena tidak ada coupling ke `lesson_progress` — menghapus kuis cukup menghapus `quiz_progress` terkait (cascade), tidak ada efek samping ke data lain sama sekali.

---

## 2. Data Model

### 2.1 Prisma Schema

```prisma
model Quiz {
  id                  String   @id @default(uuid())
  moduleId            String   @unique @map("module_id") // 1:1 dengan module (D1), post-test akhir modul
  title               String
  passingScorePercent Int      @default(70) @map("passing_score_percent")
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  module    Module         @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  questions QuizQuestion[]
  progress  QuizProgress[]

  @@map("quizzes")
}

model QuizQuestion {
  id           String @id @default(uuid())
  quizId       String @map("quiz_id")
  questionText String @map("question_text")
  sortOrder    Int    @default(0) @map("sort_order")

  quiz    Quiz         @relation(fields: [quizId], references: [id], onDelete: Cascade)
  options QuizOption[]

  @@map("quiz_questions")
}

model QuizOption {
  id         String  @id @default(uuid())
  questionId String  @map("question_id")
  optionText String  @map("option_text")
  isCorrect  Boolean @default(false) @map("is_correct")
  sortOrder  Int     @default(0) @map("sort_order")

  question QuizQuestion @relation(fields: [questionId], references: [id], onDelete: Cascade)

  @@map("quiz_options")
}

model QuizProgress {
  id            String   @id @default(uuid())
  studentId     String   @map("student_id")
  quizId        String   @map("quiz_id")
  bestScore     Float    @map("best_score")   // persentase 0-100, skor tertinggi dari semua percobaan (D4)
  isPassed      Boolean  @default(false) @map("is_passed")
  attemptsCount Int      @default(0) @map("attempts_count")
  lastAttemptAt DateTime @map("last_attempt_at")

  student StudentProfile @relation(fields: [studentId], references: [id], onDelete: Cascade)
  quiz    Quiz           @relation(fields: [quizId], references: [id], onDelete: Cascade)

  @@unique([studentId, quizId]) // 1 row per siswa per kuis
  @@map("quiz_progress")
}
```

### 2.2 Constraint Penting
- `quizzes.module_id` **unique** — menegakkan D1 (1:1 module↔quiz) di level database
- Tidak ada FK apa pun dari tabel kuis ke `lessons` atau `lesson_progress` (beda dari v2.0) — benar-benar independen dari struktur lesson di modul yang sama
- `quiz_progress` tetap tidak punya tabel anak (konsisten dengan D2)

---

## 3. RLS Policies (Supabase)

### 3.1 Tabel `quizzes`, `quiz_questions`, `quiz_options`

> **Catatan sama seperti versi sebelumnya:** RLS tidak bisa menyembunyikan kolom `is_correct` dari baris yang boleh di-SELECT siswa — penyembunyian wajib lewat `select` eksplisit di Prisma pada query sisi siswa (§5.1).

```sql
-- SELECT: admin & tutor lihat semua; siswa hanya jika sudah enroll di course pemilik modul
CREATE POLICY quizzes_select ON quizzes FOR SELECT
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.role IN ('admin', 'tutor'))
  OR EXISTS (
    SELECT 1 FROM modules m
    JOIN enrollments e ON e.course_id = m.course_id
    JOIN student_profiles sp ON sp.id = e.student_id
    JOIN users u ON u.id = sp.user_id
    WHERE m.id = quizzes.module_id AND u.auth_id = auth.uid()
  )
);

-- WRITE: admin, atau tutor (utama/pendamping) di course_tutors untuk course pemilik modul
-- Satu hop lebih pendek dari v2.0 (langsung module → course_tutors, tidak lewat lessons)
CREATE POLICY quizzes_write ON quizzes FOR ALL
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.role = 'admin')
  OR EXISTS (
    SELECT 1 FROM modules m
    JOIN course_tutors ct ON ct.course_id = m.course_id
    JOIN tutor_profiles tp ON tp.id = ct.tutor_profile_id
    JOIN users u ON u.id = tp.user_id
    WHERE m.id = quizzes.module_id AND u.auth_id = auth.uid()
  )
);
-- quiz_questions & quiz_options mengikuti pola identik lewat join berjenjang ke quiz_id / question_id
```

### 3.2 Tabel `quiz_progress`
```sql
-- SELECT: siswa lihat baris miliknya sendiri; admin lihat semua
-- (Tutor tidak diberi akses di Tier 1 — belum ada kebutuhan analytics tutor, FR-33 baru Tier 2)
CREATE POLICY quiz_progress_select ON quiz_progress FOR SELECT
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.role = 'admin')
  OR EXISTS (SELECT 1 FROM student_profiles sp JOIN users u ON u.id = sp.user_id WHERE sp.id = quiz_progress.student_id AND u.auth_id = auth.uid())
);

-- WRITE (upsert): hanya siswa pemilik baris, dari Server Action submitQuizAttempt
CREATE POLICY quiz_progress_write ON quiz_progress FOR ALL
USING (
  EXISTS (SELECT 1 FROM student_profiles sp JOIN users u ON u.id = sp.user_id WHERE sp.id = quiz_progress.student_id AND u.auth_id = auth.uid())
);
```

---

## 4. Server Actions — Quiz Builder (Admin/Tutor)

### 4.1 `createQuiz`

**FR terkait:** FR-11

**Input:**
```ts
const createQuizSchema = z.object({
  moduleId: z.string().uuid(),
  title: z.string().min(3).max(150),
  passingScorePercent: z.number().int().min(1).max(100).default(70),
});
```

**Alur logika:**
1. Resolve `module → course`, cek permission via `canManageCourse` (admin, atau tutor di `course_tutors` — Tutor Utama maupun Co-Tutor keduanya boleh, sesuai FR-41)
2. Cek modul **belum** punya kuis (`prisma.quiz.findUnique({ where: { moduleId } })` harus `null`) — kalau sudah ada, tolak (`QUIZ_ALREADY_EXISTS`, konsekuensi D1); arahkan ke edit kuis yang sudah ada
3. Insert `quizzes` (tanpa soal — builder soal terpisah di §4.3)

### 4.2 `updateQuiz` (title & passing grade) / `deleteQuiz`

**FR terkait:** FR-11

**Alur logika `updateQuiz`:** cek permission (§4.1 poin 1), lalu update `title`/`passingScorePercent` — selalu diizinkan tanpa guard tambahan (D6)

**Alur logika `deleteQuiz`:** cek permission, lalu hapus langsung (cascade `quiz_questions`/`quiz_options`/`quiz_progress`) — tanpa guard (D7). Karena tidak ada lagi coupling ke `lesson_progress`, tidak perlu banner konfirmasi khusus seperti v2.0 — cukup konfirmasi standar "hapus kuis ini?"

### 4.3 `addQuizQuestion` / `updateQuizQuestion` / `deleteQuizQuestion`

**FR terkait:** FR-11

**Input (`addQuizQuestion`):**
```ts
const addQuizQuestionSchema = z.object({
  quizId: z.string().uuid(),
  questionText: z.string().min(3).max(500),
});
```

**Alur logika (ketiga aksi):** cek permission via `canManageCourse` (resolve `quiz → module → course`) — tanpa guard structure-locked (D6). `add`: insert dengan `sortOrder = count existing + 1`; `update`: update teks; `delete`: hapus (cascade `quiz_options` milik soal itu).

### 4.4 `addQuizOption` / `updateQuizOption` / `deleteQuizOption`

**FR terkait:** FR-11

**Input (`addQuizOption`):**
```ts
const addQuizOptionSchema = z.object({
  questionId: z.string().uuid(),
  optionText: z.string().min(1).max(300),
  isCorrect: z.boolean().default(false),
});
```

**Alur logika:**
1. Cek permission (resolve `question → quiz → module → course`)
2. **Jika `isCorrect = true`** pada `add`/`update`: dalam transaksi yang sama, set `isCorrect = false` untuk semua opsi lain di soal yang sama (perilaku radio-button)
3. `deleteQuizOption`: tolak jika ini opsi terakhir yang tersisa untuk soal tersebut (minimal 2 opsi per soal)

### 4.5 Validasi Kesiapan Kuis (`isQuizReady`)

**FR terkait:** FR-11

```ts
const isQuizReady = questions.length > 0 &&
  questions.every(q => q.options.length >= 2 && q.options.some(o => o.isCorrect));
```
Tidak ada tombol "Publish" terpisah — kuis yang belum lolos `isQuizReady` cukup ditampilkan sebagai "Kuis belum tersedia" ke siswa (§7.2).

---

## 5. Server Actions — Siswa Mengerjakan Kuis

### 5.1 `getQuizForStudent` (query)

**FR terkait:** FR-11

**Alur logika:**
1. Resolve `quiz → module → course`; cek siswa **sudah enroll** — kalau belum, return not-found. **Tidak ada syarat tambahan** apakah lesson-lesson di modul itu sudah selesai atau belum (D5) — siswa yang enroll bisa langsung akses kuis modul kapan saja
2. Cek `isQuizReady` (§4.5) — kalau belum siap, return status `NOT_READY`
3. Ambil progress siswa saat ini (`quiz_progress`, kalau ada) — dikirim ke UI supaya siswa lihat status lulus/skor terbaik sebelumnya
4. Query soal & opsi dengan `select` eksplisit yang mengecualikan `isCorrect`:
   ```ts
   const questions = await prisma.quizQuestion.findMany({
     where: { quizId },
     orderBy: { sortOrder: "asc" },
     select: {
       id: true,
       questionText: true,
       options: { orderBy: { sortOrder: "asc" }, select: { id: true, optionText: true } },
     },
   });
   ```

### 5.2 `submitQuizAttempt`

**FR terkait:** FR-11, FR-12

**Input:**
```ts
const submitQuizAttemptSchema = z.object({
  quizId: z.string().uuid(),
  answers: z.array(z.object({
    questionId: z.string().uuid(),
    selectedOptionId: z.string().uuid().nullable(), // null = tidak dijawab, dihitung salah
  })),
});
```

**Alur logika:**
1. Validasi siswa **sudah enroll** (§5.1 poin 1) — kalau belum, `403 FORBIDDEN`
2. Ambil `quiz_questions` + `quiz_options` **dengan** `isCorrect` (kode server)
3. Validasi `answers[].questionId` semua milik kuis ini; soal yang tidak ada di `answers` diperlakukan tidak dijawab
4. Hitung skor:
   ```ts
   const totalQuestions = questions.length;
   const correctCount = questions.filter(q => {
     const answer = answers.find(a => a.questionId === q.id);
     if (!answer?.selectedOptionId) return false;
     const opt = q.options.find(o => o.id === answer.selectedOptionId);
     return opt?.isCorrect === true;
   }).length;
   const score = (correctCount / totalQuestions) * 100;
   const passedThisAttempt = score >= quiz.passingScorePercent;
   ```
5. Upsert `quiz_progress` (D4) — **satu operasi berdiri sendiri, tidak perlu transaksi gabungan dengan tabel lain** (beda dari v2.0):
   ```ts
   const existing = await prisma.quizProgress.findUnique({ where: { studentId_quizId: { studentId, quizId } } });
   const newBestScore = Math.max(existing?.bestScore ?? 0, score);
   const newIsPassed = (existing?.isPassed ?? false) || passedThisAttempt;

   await prisma.quizProgress.upsert({
     where: { studentId_quizId: { studentId, quizId } },
     update: { bestScore: newBestScore, isPassed: newIsPassed, attemptsCount: { increment: 1 }, lastAttemptAt: new Date() },
     create: { studentId, quizId, bestScore: score, isPassed: passedThisAttempt, attemptsCount: 1, lastAttemptAt: new Date() },
   });
   ```
6. Return ke UI: skor attempt ini (persen), `passedThisAttempt`, `bestScore` & `isPassed` terbaru, plus array `{questionId, isCorrect}` per soal untuk feedback instan (ephemeral, tidak disimpan)

---

## 6. Queries — Status Kuis (Dashboard & Halaman Modul)

### 6.1 Tampilan di halaman detail kursus
Status `quiz_progress` untuk siswa yang login ikut ter-include di query `getCourseDetailForStudent` (TSD-Course-Content §5.2) sebagai bagian data modul — cukup 1 include tambahan per modul (`quiz: { include: { progress: { where: { studentId } } } }`), bukan per-lesson.

### 6.2 `getQuizProgressSummaryForStudent` (opsional, dashboard)

**FR terkait:** FR-12

```ts
const quizProgress = await prisma.quizProgress.findMany({
  where: { studentId },
  include: { quiz: { select: { title: true, module: { select: { title: true, course: { select: { title: true } } } } } } },
  orderBy: { lastAttemptAt: "desc" },
});
```
List ringkas "kuis modul yang pernah dikerjakan" (judul, lulus/belum, skor terbaik) — bukan riwayat kronologis tiap percobaan.

---

## 7. UI Requirements

### 7.1 Admin/Tutor — Quiz Builder (bagian dari Course Builder, TSD-Course-Content §8.2)
- Tiap **modul** di Course Builder punya tombol **"Kelola Kuis Modul"** di bagian bawah daftar lesson-nya — jika modul belum punya kuis, tombol ini membuka form buat baru (title + passing grade, default 70%); jika sudah ada, langsung ke builder soal
- Builder soal: textarea pertanyaan + list opsi (radio untuk tandai benar, min 2 opsi per soal), tombol tambah/hapus soal & opsi — tidak ada status "terkunci" apa pun, builder selalu bisa diedit
- Field passing grade (persen) bisa diubah kapan saja
- Indikator kecil per soal kalau belum ada opsi benar

### 7.2 Siswa — Halaman Kerjakan Kuis (`/student/courses/[id]/modules/[moduleId]/quiz`)
- **Kuis belum `isQuizReady`:** pesan "Kuis belum tersedia, coba lagi nanti"
- **Kuis siap, siswa belum pernah lulus:** tampilkan status terakhir jika pernah mencoba, form soal, tombol "Submit Kuis"
- **Kuis siap, siswa sudah lulus:** badge "✅ Lulus — skor terbaik: 85%", tetap sediakan tombol "Kerjakan Lagi" (opsional)
- **Setelah submit:** skor attempt ini, status lulus/tidak, badge ✓/✗ per soal (tanpa membocorkan opsi benar untuk soal yang salah) — **tidak ada** notifikasi "materi ditandai selesai" (beda dari v2.0), karena memang tidak menggerbang apa pun (D5)

### 7.3 Siswa — Halaman Detail Kursus (Modul)
- Tiap kartu/section modul yang punya kuis menampilkan **badge status** di bagian bawah (sejajar dengan daftar lesson, bukan menggantikan apa pun): "Kuis: Belum dikerjakan" / "Kuis: Belum lulus (skor terbaik 60%)" / "Kuis: ✅ Lulus (skor terbaik 85%)" — klik badge membuka §7.2
- Progress bar kursus di header **tidak berubah** dari TSD-Course-Content — tetap murni `lesson selesai / total lesson`, badge kuis modul ditampilkan terpisah, bukan bagian dari angka itu

---

## 8. Edge Cases & Validation Summary

| # | Kondisi | Perilaku yang Diharapkan |
|---|---|---|
| 1 | Siswa membuka/submit kuis dari course yang belum di-enroll | Ditolak di validasi §5.1/§5.2 poin 1 |
| 2 | Kuis belum punya soal, atau ada soal tanpa opsi benar | Siswa lihat "belum tersedia" (§7.2); builder tetap bisa diedit bebas (D6) |
| 3 | Siswa submit dengan sebagian soal tidak dijawab | Diizinkan, dihitung salah, tidak memblokir submit |
| 4 | Tutor/admin edit soal & opsi setelah beberapa siswa sudah lulus | Diizinkan tanpa guard (D6); status `isPassed` siswa lama tidak otomatis reset |
| 5 | Tutor/admin hapus kuis yang sudah punya `quiz_progress` | Diizinkan (D7), tanpa efek samping ke tabel lain sama sekali (beda dari v2.0) |
| 6 | Siswa buka kuis modul padahal belum menyelesaikan satu pun lesson di modul itu | **Diizinkan** — tidak ada prasyarat urutan (D5); ini keputusan sadar untuk MVP, lihat catatan follow-up di bawah |
| 7 | Siswa sudah lulus, lalu mengerjakan ulang dan skornya lebih rendah | `isPassed` tetap `true`; `bestScore` tidak berubah; `attemptsCount` tetap bertambah |
| 8 | Tutor coba kelola kuis di modul milik kursus yang bukan dia ampu | `canManageCourse` return `false` → 403 |
| 9 | Admin/tutor coba `createQuiz` pada modul yang sudah punya kuis | Ditolak (`QUIZ_ALREADY_EXISTS`, D1) |

**Follow-up yang sengaja ditunda (bukan bug, bukan wajib MVP):**
- **Prasyarat urutan** (edge case #6) — kalau nanti ternyata dibutuhkan "siswa harus selesaikan semua lesson dulu baru bisa buka kuis modul", ini jadi validasi tambahan sederhana di `getQuizForStudent`/`submitQuizAttempt` (cek semua `lesson_progress` di modul itu `isCompleted = true`) — tidak butuh perubahan skema, cukup ditambahkan kapan pun dibutuhkan
- `resetQuizProgressForAllStudents(quizId)` — aksi eksplisit untuk memaksa semua siswa mengulang setelah revisi soal besar (lihat D6), nice-to-have

---

## 9. Dependencies

| Dependency | Kebutuhan Spesifik di Modul Ini |
|---|---|
| TSD-Course-Content.md (v1.4) | Model `Module`, `Course`, `Enrollment`; pola `canManageCourse`. **Satu arah** — tidak ada lagi ketergantungan balik seperti di v2.0 |
| `prisma` | Upsert `quiz_progress` sederhana (§5.2), tidak perlu transaksi lintas-tabel |
| Supabase RLS | Lihat §3 |

---

## 10. Acceptance Criteria

- [ ] Admin/tutor (utama maupun co-tutor) bisa membuat kuis pada modul di kursus yang mereka ampu; tutor kursus lain ditolak (403)
- [ ] Satu modul tidak bisa punya lebih dari 1 kuis — `createQuiz` kedua pada modul yang sama ditolak
- [ ] Response `getQuizForStudent` tidak mengandung field `isCorrect` (dicek lewat Network tab)
- [ ] Siswa yang belum enroll tidak bisa membuka maupun submit kuis
- [ ] Siswa **bisa** membuka & mengerjakan kuis modul meski belum menyelesaikan satu pun lesson di modul itu (memverifikasi D5 — tidak ada gating tersembunyi)
- [ ] Skor & status lulus dihitung otomatis & benar sesuai `passingScorePercent`
- [ ] Siswa bisa mengulang kuis berkali-kali; `bestScore` selalu skor tertinggi, `isPassed` tidak pernah turun setelah pernah `true`
- [ ] **Tombol "Tandai Selesai" lesson tetap berfungsi normal untuk semua lesson**, termasuk lesson di modul yang punya kuis — memverifikasi tidak ada coupling tersisa ke `lesson_progress`
- [ ] Progress bar kursus (header halaman detail) tidak berubah nilainya akibat status kuis modul — tetap murni dari `lesson_progress`
- [ ] Menghapus kuis tidak mempengaruhi data lesson/progress apa pun
- [ ] Mengedit soal/opsi setelah ada siswa yang mengerjakan tidak diblokir sistem
- [ ] Semua RLS policy §3 diuji manual per role

---

*TSD ini menggantikan v2.0 sepenuhnya (relasi Lesson→Module, gating dihapus). TSD-Course-Content.md direvisi bersamaan ke v1.4 untuk melepas coupling yang sempat ditambahkan di v1.3.*
