# Technical Spec Document (TSD) — DRAFT / DITUNDA
## Fitur: Exam / Ujian Standalone (kandidat, BUKAN scope Fase 3 saat ini)

> ⚠️ **STATUS: DRAFT DITUNDA — bukan dokumen aktif untuk Fase 3.**
> Dokumen ini awalnya ditulis dengan nama "TSD-Quiz.md" untuk Fase 3, tapi setelah didiskusikan ulang, isinya (riwayat percobaan penuh, structure-locked setelah attempt pertama, dsb) ternyata lebih cocok untuk fitur **exam/ujian standalone** yang berdiri sendiri setara modul di sebuah kursus — bukan post-test ringan per lesson.
>
> Fitur **Quiz** yang sebenarnya jadi scope Fase 3 sekarang ada di **TSD-Quiz.md** (versi baru, desainnya jauh lebih ringan: post-test per lesson dengan passing grade, tanpa histori granular).
>
> Dokumen ini disimpan sebagai draft untuk dikembangkan lagi nanti — kemungkinan sebagai modul terpisah setara "module" di dalam course (bisa berbagai jenis soal, timer, dsb), entah masuk backlog Tier 1 lanjutan atau jadi fitur Tier 2. Isi di bawah ini **belum direvisi** untuk konteks itu — masih apa adanya dari draft pertama, perlu direvisit sebelum dipakai.

---

**Versi:** 1.0 (draft awal, belum direvisi ulang untuk konteks Exam standalone)
**Tanggal:** 1 September 2026
**Terkait dokumen:** PRD.md (v2.2) · SDD.md (v1.1) · Implementation-Plan.md (v2.3, Fase 3 — **catatan: exam standalone TIDAK lagi di Fase 3, lihat Implementation-Plan terbaru**) · TSD-Course-Content.md (v1.2, dependency) · TSD-Auth-ClassLevel.md (v1.0, dependency tidak langsung)
**Scope Implementation Plan:** Belum dijadwalkan — kandidat fase lanjutan (lihat Implementation-Plan.md §4 Fase 11)

---

## 1. Overview & Scope

### 1.1 Tujuan
Spesifikasi siap-coding untuk modul kuis: pembuatan kuis pilihan ganda oleh admin/tutor (melekat ke satu lesson), pengerjaan kuis oleh siswa dengan penilaian otomatis, dan riwayat percobaan yang bisa dilihat siswa di dashboard-nya.

### 1.2 FR yang Dicakup

| FR | Deskripsi |
|---|---|
| FR-11 | Tutor/admin membuat kuis pilihan ganda dengan penilaian otomatis |
| FR-12 | Siswa melihat riwayat percobaan kuis (skor & waktu); skor final default = skor tertinggi |

FR-13 (kuis dengan timer, auto-submit, pembahasan otomatis) **tidak** dicakup di sini — itu Tier 2, lihat §1.4 B3 untuk batasan yang relevan di Tier 1.

### 1.3 Dependency
Modul ini **bergantung penuh** pada TSD-Course-Content.md — khususnya:
- Model `Lesson` (satu kuis melekat ke satu `lessonId`, sesuai SDD ERD: `LESSONS ||--o{ QUIZZES`)
- Model `Enrollment` — syarat siswa boleh mengerjakan kuis sama seperti syarat `markLessonComplete` (§7.1 TSD-Course-Content): harus sudah enroll di course pemilik lesson tersebut
- Pola `canManageCourse` (resolve lesson → module → course → cek `course_tutors`) dipakai ulang untuk permission builder kuis

### 1.4 Keputusan Desain

**B1 — Kebijakan skor final di-hardcode, bukan configurable per klien (Tier 1):**
PRD §7.4 mencatat ini sebagai open item yang belum diputuskan sepenuhnya. Untuk Tier 1, skor final yang ditampilkan = `MAX(score)` dari seluruh `quiz_attempts` milik siswa untuk kuis tersebut, ditulis langsung di query (§6.1) — bukan lewat kolom config atau UI setting baru. Ini konsisten dengan filosofi "config-driven" project ini: yang configurable adalah *field per instance* (`config/institution.ts`), bukan *runtime toggle per fitur* di tiap kalkulasi. Kalau ada klien spesifik yang butuh kebijakan "skor terakhir" alih-alih "skor tertinggi", itu jadi override kode kecil per instance saat replikasi, bukan setting.
> **Perlu dikonfirmasi sebelum development dimulai** — kalau ternyata product owner butuh ini benar-benar configurable tanpa sentuh kode (misal lewat dashboard admin), ada effort tambahan di luar estimasi TSD ini.

**B2 — Kuis "terkunci" (structure-locked) setelah percobaan pertama masuk:**
Begitu suatu kuis sudah punya minimal 1 row `quiz_attempts`, struktur soal & opsi (tambah/hapus/edit pertanyaan, opsi, atau `is_correct`) **tidak boleh diubah lagi**, dan kuis itu sendiri **tidak bisa dihapus**. Alasan: mencegah histori skor siswa yang sudah ada jadi tidak konsisten dengan soal yang sebenarnya mereka kerjakan (misal `is_correct` diubah setelah beberapa siswa submit, bikin skor lama jadi tidak akurat secara retroaktif). Field `title` kuis tetap boleh diedit kapan saja (tidak memengaruhi penilaian). Kalau tutor/admin perlu merombak total, sarankan buat kuis baru di lesson yang sama — skema mendukung ini karena relasi lesson↔quiz memang one-to-many.

**B3 — Hasil kuis Tier 1 tampilkan skor & tanda benar/salah per soal, TANPA pembahasan:**
Selaras SDD §6.3 ("Skor & hasil per soal"), setelah submit siswa melihat skor total dan indikator ✓/✗ per pertanyaan. Sistem **tidak** menampilkan opsi jawaban yang benar untuk soal yang salah, dan tidak ada teks pembahasan — itu ranah FR-13 (Tier 2). Ini juga jadi mitigasi sederhana terhadap siswa saling membocorkan kunci jawaban lewat screenshot hasil kuis.

**B4 — Soal yang tidak dijawab dihitung salah, tidak memblokir submit:**
Siswa boleh submit kuis meski ada soal yang belum dipilih jawabannya (`selectedOptionId = null` untuk soal itu) — dihitung sebagai salah saat scoring, bukan validasi yang menolak submit. Ini menghindari siswa "terjebak" tidak bisa submit karena lupa 1 soal, konsisten dengan tidak adanya timer/auto-submit di Tier 1.

---

## 2. Data Model

### 2.1 Prisma Schema

```prisma
model Quiz {
  id        String   @id @default(uuid())
  lessonId  String   @map("lesson_id")
  title     String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  lesson    Lesson         @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  questions QuizQuestion[]
  attempts  QuizAttempt[]

  @@map("quizzes")
}

model QuizQuestion {
  id           String @id @default(uuid())
  quizId       String @map("quiz_id")
  questionText String @map("question_text")
  sortOrder    Int    @default(0) @map("sort_order")

  quiz    Quiz         @relation(fields: [quizId], references: [id], onDelete: Cascade)
  options QuizOption[]
  answers QuizAnswer[]

  @@map("quiz_questions")
}

model QuizOption {
  id         String  @id @default(uuid())
  questionId String  @map("question_id")
  optionText String  @map("option_text")
  isCorrect  Boolean @default(false) @map("is_correct")
  sortOrder  Int     @default(0) @map("sort_order")

  question       QuizQuestion @relation(fields: [questionId], references: [id], onDelete: Cascade)
  selectedByAnswers QuizAnswer[] @relation("SelectedOption")

  @@map("quiz_options")
}

model QuizAttempt {
  id          String   @id @default(uuid())
  studentId   String   @map("student_id") // student_profiles.id
  quizId      String   @map("quiz_id")
  score       Float    // persentase 0-100, lihat §5.2
  startedAt   DateTime @map("started_at")
  submittedAt DateTime @default(now()) @map("submitted_at")

  student StudentProfile @relation(fields: [studentId], references: [id], onDelete: Cascade)
  quiz    Quiz           @relation(fields: [quizId], references: [id], onDelete: Cascade)
  answers QuizAnswer[]

  @@map("quiz_attempts")
}

model QuizAnswer {
  id               String  @id @default(uuid())
  attemptId        String  @map("attempt_id")
  questionId       String  @map("question_id")
  selectedOptionId String? @map("selected_option_id") // null = soal tidak dijawab (B4)

  attempt        QuizAttempt  @relation(fields: [attemptId], references: [id], onDelete: Cascade)
  question       QuizQuestion @relation(fields: [questionId], references: [id], onDelete: Cascade)
  selectedOption QuizOption?  @relation("SelectedOption", fields: [selectedOptionId], references: [id], onDelete: SetNull)

  @@unique([attemptId, questionId]) // 1 jawaban per soal per attempt
  @@map("quiz_answers")
}
```

### 2.2 Constraint Penting
- `@@unique([attemptId, questionId])` di `QuizAnswer` — target upsert-safe write saat `submitQuizAttempt` insert banyak jawaban sekaligus dalam 1 transaksi
- `selectedOptionId` nullable + `onDelete: SetNull` — kalau suatu opsi dihapus (hanya mungkin sebelum kuis "terkunci", lihat B2), jawaban historis yang mengacu ke opsi itu tidak ikut hilang/rusak, cukup jadi null
- **Tidak ada** kolom `isCorrect` yang dihitung/disimpan di `QuizAnswer` — kebenaran jawaban selalu dihitung ulang dari `QuizOption.isCorrect` saat dibutuhkan (scoring saat submit, atau saat render riwayat), supaya tidak ada data ganda yang bisa saling tidak sinkron
- Semua child relation pakai `onDelete: Cascade` ke `Quiz`/`QuizQuestion` — secara praktis hanya relevan sebelum kuis "terkunci" (B2), karena setelah ada attempt, `deleteQuiz`/`deleteQuizQuestion` ditolak di level aplikasi

---

## 3. RLS Policies (Supabase)

### 3.1 Tabel `quizzes`, `quiz_questions`, `quiz_options`

> **Catatan penting soal `is_correct`:** RLS Postgres bekerja di level **baris**, bukan kolom — RLS tidak bisa menyembunyikan kolom `is_correct` dari siswa yang punya akses SELECT ke baris `quiz_options` tersebut. Maka **query aplikasi untuk siswa (§5.1) wajib melakukan `select` eksplisit di Prisma yang mengecualikan `isCorrect`** saat menampilkan soal untuk dikerjakan. RLS di bawah ini hanya mengatur *siapa boleh lihat baris kuis yang mana*, bukan *kolom apa yang boleh dilihat* — lapisan penyembunyian `is_correct` sepenuhnya ada di kode aplikasi, sesuai catatan SDD §6.3 ("tanpa expose is_correct ke client").

```sql
-- SELECT quizzes: admin & tutor lihat semua (termasuk kuis di kursus yang bukan miliknya, untuk "Eksplorasi Kursus" read-only, FR-41);
-- siswa hanya jika sudah enroll di course pemilik lesson-nya (konten kuis terkunci sebelum enroll, selaras A1 di TSD-Course-Content)
CREATE POLICY quizzes_select ON quizzes FOR SELECT
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.role IN ('admin', 'tutor'))
  OR EXISTS (
    SELECT 1 FROM lessons l
    JOIN modules m ON m.id = l.module_id
    JOIN enrollments e ON e.course_id = m.course_id
    JOIN student_profiles sp ON sp.id = e.student_id
    JOIN users u ON u.id = sp.user_id
    WHERE l.id = quizzes.lesson_id AND u.auth_id = auth.uid()
  )
);

-- WRITE quizzes/quiz_questions/quiz_options: admin, atau tutor (utama/pendamping) yang ada di course_tutors
-- untuk course pemilik lesson terkait — pola identik dengan modules_write/lessons_write (TSD-Course-Content §3.3)
CREATE POLICY quizzes_write ON quizzes FOR ALL
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.role = 'admin')
  OR EXISTS (
    SELECT 1 FROM lessons l
    JOIN modules m ON m.id = l.module_id
    JOIN course_tutors ct ON ct.course_id = m.course_id
    JOIN tutor_profiles tp ON tp.id = ct.tutor_profile_id
    JOIN users u ON u.id = tp.user_id
    WHERE l.id = quizzes.lesson_id AND u.auth_id = auth.uid()
  )
);
-- Policy quiz_questions & quiz_options mengikuti pola identik, join berjenjang lewat quiz_id / question_id
-- sampai ke lessons.module_id → modules.course_id → course_tutors
```
> **Catatan implementasi (sama seperti TSD-Course-Content §3.3):** query aplikasi tetap wajib memvalidasi akses secara eksplisit di Server Action (bukan hanya mengandalkan RLS ini sebagai satu-satunya lapisan), terutama untuk validasi enrollment siswa yang lebih spesifik dari sekadar "punya akses tingkatan".

### 3.2 Tabel `quiz_attempts` & `quiz_answers`
```sql
-- SELECT: siswa hanya lihat attempt miliknya sendiri; admin lihat semua (untuk kebutuhan oversight/troubleshooting)
-- Tidak ada scoping tutor di Tier 1 (belum ada kebutuhan analytics tutor — itu FR-33, Tier 2) — sengaja tidak dibangun spekulatif
CREATE POLICY quiz_attempts_select ON quiz_attempts FOR SELECT
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.role = 'admin')
  OR EXISTS (SELECT 1 FROM student_profiles sp JOIN users u ON u.id = sp.user_id WHERE sp.id = quiz_attempts.student_id AND u.auth_id = auth.uid())
);

-- INSERT: hanya siswa pemilik attempt (dari Server Action submitQuizAttempt, atas nama diri sendiri)
CREATE POLICY quiz_attempts_insert ON quiz_attempts FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM student_profiles sp JOIN users u ON u.id = sp.user_id WHERE sp.id = quiz_attempts.student_id AND u.auth_id = auth.uid())
);
-- Tidak ada policy UPDATE/DELETE — quiz_attempts & quiz_answers bersifat immutable begitu tercatat (riwayat, bukan draft)

-- quiz_answers: SELECT & INSERT mengikuti akses ke quiz_attempts induknya (join attempt_id → quiz_attempts.student_id)
CREATE POLICY quiz_answers_select ON quiz_answers FOR SELECT
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.role = 'admin')
  OR EXISTS (
    SELECT 1 FROM quiz_attempts qa
    JOIN student_profiles sp ON sp.id = qa.student_id
    JOIN users u ON u.id = sp.user_id
    WHERE qa.id = quiz_answers.attempt_id AND u.auth_id = auth.uid()
  )
);
CREATE POLICY quiz_answers_insert ON quiz_answers FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM quiz_attempts qa
    JOIN student_profiles sp ON sp.id = qa.student_id
    JOIN users u ON u.id = sp.user_id
    WHERE qa.id = quiz_answers.attempt_id AND u.auth_id = auth.uid()
  )
);
```

---

## 4. Server Actions — Quiz Builder (Admin/Tutor)

### 4.1 `createQuiz`

**FR terkait:** FR-11

**Input:**
```ts
const createQuizSchema = z.object({
  lessonId: z.string().uuid(),
  title: z.string().min(3).max(150),
});
```

**Alur logika:**
1. Resolve `lesson → module → course`, cek permission via `canManageCourse` (admin, atau tutor di `course_tutors` untuk course tersebut — Tutor Utama maupun Co-Tutor keduanya boleh, sesuai FR-41 hak CRUD materi)
2. Jika tidak lolos → `403 FORBIDDEN`
3. Insert `quizzes` (tanpa soal — builder soal dilakukan terpisah lewat §4.3)

### 4.2 `updateQuiz` (title only) / `deleteQuiz`

**FR terkait:** FR-11

**Alur logika `updateQuiz`:**
1. Cek permission sama seperti §4.1
2. Update `title` — **selalu diizinkan**, tidak terpengaruh status "terkunci" (B2)

**Alur logika `deleteQuiz`:**
1. Cek permission sama seperti §4.1
2. Cek `prisma.quizAttempt.count({ where: { quizId } })` — jika > 0 → tolak dengan pesan jelas (B2), **jangan** hard-delete
3. Jika 0 attempt → hapus (cascade membersihkan `quiz_questions`/`quiz_options` yang belum pernah dipakai siapa pun)

### 4.3 `addQuizQuestion` / `updateQuizQuestion` / `deleteQuizQuestion`

**FR terkait:** FR-11

**Input (`addQuizQuestion`):**
```ts
const addQuizQuestionSchema = z.object({
  quizId: z.string().uuid(),
  questionText: z.string().min(3).max(500),
});
```

**Alur logika (semua 3 aksi):**
1. Cek permission via `canManageCourse` (resolve `quiz → lesson → module → course`)
2. **Guard structure-locked (B2):** cek `prisma.quizAttempt.count({ where: { quizId } })` — jika > 0 → tolak (`QUIZ_LOCKED`), berlaku untuk `add`/`update`/`delete` ketiganya
3. Jika lolos — `add`: insert dengan `sortOrder = count existing + 1`; `update`: update `questionText`; `delete`: hapus (cascade `quiz_options` & `quiz_answers` milik soal itu — aman karena guard poin 2 memastikan belum ada attempt sama sekali untuk kuis ini)

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
1. Cek permission (resolve `question → quiz → lesson → module → course`) + guard structure-locked (B2), sama seperti §4.3
2. **Jika `isCorrect = true` pada `add`/`update`:** dalam transaksi yang sama, set `isCorrect = false` untuk **semua opsi lain** di soal yang sama terlebih dahulu (perilaku radio-button — mencegah 2 opsi benar sekaligus karena `is_correct` tidak punya constraint DB untuk "exactly one true per question")
3. `deleteQuizOption`: tolak jika ini opsi terakhir yang tersisa untuk soal tersebut (soal minimal harus punya 2 opsi — divalidasi juga di §4.5 saat "selesai" builder)

### 4.5 Validasi Kesiapan Kuis (dicek saat render builder & saat siswa membuka kuis)

**FR terkait:** FR-11

Sebuah kuis dianggap **siap ditampilkan ke siswa** jika:
```ts
const isQuizReady = questions.length > 0 &&
  questions.every(q => q.options.length >= 2 && q.options.some(o => o.isCorrect));
```
Tidak ada tombol "Publish" terpisah untuk kuis (beda dari `publishCourse` di TSD-Course-Content) — kuis yang belum lolos `isQuizReady` cukup ditampilkan sebagai "Kuis belum tersedia" di sisi siswa (§5.1 poin 3), sementara di sisi builder tetap bisa diedit bebas oleh admin/tutor.

---

## 5. Server Actions & Queries — Siswa Mengerjakan Kuis

### 5.1 `getQuizForStudent` (query, dipanggil dari Server Component)

**FR terkait:** FR-11

**Alur logika:**
1. Resolve `quiz → lesson → module → course`; cek siswa sudah **enroll** di course tersebut (query `enrollments`, pola sama seperti §7.1 TSD-Course-Content) — jika belum, return not-found (konten kuis mengikuti aturan sama seperti video/dokumen: terkunci sebelum enroll)
2. Cek `isQuizReady` (§4.5) — jika belum siap, return status khusus `NOT_READY` (bukan error, siswa lihat pesan "Kuis belum tersedia")
3. Jika lolos keduanya, query soal & opsi dengan **Prisma `select` eksplisit yang mengecualikan `isCorrect`**:
   ```ts
   const questions = await prisma.quizQuestion.findMany({
     where: { quizId },
     orderBy: { sortOrder: "asc" },
     select: {
       id: true,
       questionText: true,
       options: {
         orderBy: { sortOrder: "asc" },
         select: { id: true, optionText: true }, // isCorrect TIDAK di-select
       },
     },
   });
   ```
4. Client menyimpan `startedAt = new Date()` di state lokal saat form kuis pertama kali dirender (dikirim balik saat submit, §5.2) — tidak ada Server Action terpisah untuk "mulai kuis" karena Tier 1 tidak punya timer (selaras SDD §6.3 yang tidak menunjukkan step start terpisah)

### 5.2 `submitQuizAttempt`

**FR terkait:** FR-11, FR-12

**Input:**
```ts
const submitQuizAttemptSchema = z.object({
  quizId: z.string().uuid(),
  startedAt: z.string().datetime(), // dari client, lihat §5.1 poin 4
  answers: z.array(z.object({
    questionId: z.string().uuid(),
    selectedOptionId: z.string().uuid().nullable(), // null = tidak dijawab (B4)
  })),
});
```

**Alur logika:**
1. Validasi siswa **sudah enroll** di course pemilik kuis (sama seperti §5.1 poin 1) — jika belum, `403 FORBIDDEN`, jangan buat attempt
2. Ambil seluruh `quiz_questions` + `quiz_options` (kali ini **dengan** `isCorrect`, karena ini kode server, bukan payload ke client) untuk kuis ini
3. Validasi `answers[].questionId` semua milik kuis ini (tolak/abaikan entri asing hasil manipulasi request); soal milik kuis yang tidak ada di `answers` diperlakukan sebagai tidak dijawab (B4)
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
   ```
5. Dalam **1 transaksi Prisma**: insert `quiz_attempts` (`score`, `startedAt` dari input, `submittedAt = now()`), lalu insert seluruh `quiz_answers` terkait (`createMany`)
6. Return ke UI: skor total + array `{questionId, isCorrect}` per soal (**tanpa** `selectedOptionId` opsi yang benar untuk soal yang salah — selaras B3)

### 5.3 Edge Case Penting: Percobaan Tak Terbatas
Tidak ada validasi "sudah pernah mengerjakan → tolak" di `submitQuizAttempt` — siswa boleh mengulang kuis berkali-kali (setiap submit = row baru di `quiz_attempts`), konsisten dengan kebijakan skor final = tertinggi (B1) yang secara implisit mendorong percobaan berulang.

---

## 6. Queries — Riwayat Percobaan (Dashboard Siswa)

### 6.1 `getQuizAttemptHistory`

**FR terkait:** FR-12

**Alur logika:**
```ts
const attempts = await prisma.quizAttempt.findMany({
  where: { studentId },
  orderBy: { submittedAt: "desc" },
  include: {
    quiz: { select: { title: true, lesson: { select: { title: true, module: { select: { title: true, course: { select: { title: true } } } } } } } },
  },
});
```
Ditampilkan sebagai list flat (per attempt: judul kuis, konteks kursus/modul, skor, waktu submit) di dashboard siswa — bukan dikelompokkan, supaya riwayat kronologis tetap terlihat apa adanya.

### 6.2 `getFinalQuizScore(quizId, studentId)`

**FR terkait:** FR-12 (skor final = tertinggi, B1)

```ts
const result = await prisma.quizAttempt.aggregate({
  where: { quizId, studentId },
  _max: { score: true },
});
const finalScore = result._max.score ?? null; // null = belum pernah attempt sama sekali
```
Dipakai di badge ringkas pada listing kursus/lesson ("Skor terbaik: 85") — **berbeda** dari `getQuizAttemptHistory` yang menampilkan semua percobaan apa adanya, bukan cuma yang terbaik.

---

## 7. UI Requirements

### 7.1 Admin/Tutor — Quiz Builder (bagian dari Course Builder, TSD-Course-Content §8.2)
- Di section modul & lesson pada Course Builder, tiap lesson punya tombol **"Kelola Kuis"** (buat baru jika belum ada, atau daftar kuis existing jika lesson sudah punya ≥1 kuis — ingat, relasi lesson↔quiz one-to-many per B2)
- Halaman builder per kuis: field `title`, list soal (accordion/expandable), tiap soal: textarea pertanyaan + list opsi jawaban (radio untuk tandai benar — memilih 1 otomatis unset yang lain sesuai §4.4 poin 2), tombol tambah/hapus opsi (disable hapus jika tersisa 2 opsi), tombol tambah/hapus soal
- **Jika kuis sudah "terkunci" (B2):** seluruh section soal & opsi jadi read-only dengan banner penjelasan ("Kuis ini sudah dikerjakan siswa, struktur soal tidak bisa diubah lagi — buat kuis baru jika perlu revisi besar"); hanya field `title` yang tetap bisa diedit
- Indikator kecil di tiap soal jika belum punya jawaban benar ("⚠️ Belum ada opsi yang ditandai benar") — membantu admin/tutor sadar sebelum kuis dianggap `isQuizReady`

### 7.2 Siswa — Halaman Kerjakan Kuis (`/student/courses/[id]/lessons/[lessonId]/quiz/[quizId]`)
- **Kuis belum `isQuizReady`:** tampilkan pesan "Kuis belum tersedia, coba lagi nanti" (bukan error/404, karena lesson-nya sendiri valid)
- **Kuis siap:** daftar soal dengan radio button per opsi, tombol "Submit Kuis" di bawah (aktif meski ada soal belum dijawab, selaras B4)
- **Setelah submit:** tampilkan skor (X dari Y benar, dalam persen), lalu daftar tiap soal dengan ikon ✓/✗ (tanpa membocorkan opsi yang benar untuk soal yang salah, selaras B3), tombol "Coba Lagi" (submit baru, §5.3) dan tombol kembali ke lesson

### 7.3 Siswa — Riwayat Kuis (Dashboard)
- Section/tab "Riwayat Kuis" di dashboard siswa: list dari `getQuizAttemptHistory` (§6.1), tiap baris: judul kuis, nama kursus, skor, tanggal — urut terbaru dulu
- Badge "Terbaik" pada attempt dengan skor tertinggi per kuis (dihitung di UI dari data yang sama, tidak perlu query terpisah)

---

## 8. Edge Cases & Validation Summary

| # | Kondisi | Perilaku yang Diharapkan |
|---|---|---|
| 1 | Siswa membuka kuis dari course yang belum dia enroll (manipulasi URL langsung) | `getQuizForStudent` return not-found di validasi enrollment (§5.1 poin 1), tidak sampai render soal |
| 2 | Siswa memanggil `submitQuizAttempt` untuk kuis di kursus yang belum di-enroll (manipulasi request, bypass UI) | Ditolak di validasi §5.2 poin 1 sebelum hitung skor, tidak ada row `quiz_attempts` tercipta |
| 3 | Kuis belum punya soal, atau ada soal tanpa opsi benar (`isQuizReady = false`) | Siswa lihat "Kuis belum tersedia" (§7.2); admin/tutor tetap bisa mengedit bebas karena belum ada attempt yang mengunci (B2) |
| 4 | Admin/tutor coba tambah/hapus/edit soal atau opsi pada kuis yang sudah punya ≥1 attempt | Ditolak (`QUIZ_LOCKED`, B2) di Server Action sebelum query lanjut, pesan jelas di UI (§7.1) |
| 5 | Admin/tutor coba `deleteQuiz` pada kuis yang sudah punya ≥1 attempt | Ditolak, sarankan buat kuis baru di lesson yang sama (B2) |
| 6 | Siswa submit kuis dengan beberapa soal tidak dijawab | Diizinkan — soal itu dihitung salah, bukan validasi yang memblokir submit (B4) |
| 7 | Payload `answers[].questionId` berisi ID soal dari kuis lain (manipulasi request) | Diabaikan/ditolak di validasi §5.2 poin 3, tidak ikut dihitung skor maupun tersimpan |
| 8 | Admin/tutor set opsi baru jadi `isCorrect = true` padahal sudah ada opsi benar lain di soal yang sama | Opsi lama otomatis di-unset dalam transaksi yang sama (§4.4 poin 2) — tidak pernah ada 2 opsi benar sekaligus |
| 9 | Tutor coba kelola kuis di lesson milik kursus yang bukan dia ampu (tebak-tebak `quizId`/`lessonId` di URL) | `canManageCourse` (resolve sampai `course_tutors`) return `false` → 403, ditolak sebelum query lanjut, konsisten dengan pola TSD-Course-Content §9 poin 1 |
| 10 | Siswa mengerjakan kuis yang sama berkali-kali | Diizinkan tanpa batas — setiap submit = row `quiz_attempts` baru, skor final tetap `MAX(score)` (B1, §6.2) |
| 11 | Dua siswa submit kuis yang sama bersamaan (concurrent) | Aman — masing-masing insert row `quiz_attempts` independen milik `studentId` masing-masing, tidak ada shared state yang di-lock |

---

## 9. Dependencies

| Dependency | Kebutuhan Spesifik di Modul Ini |
|---|---|
| TSD-Course-Content.md | Model `Lesson`, `Enrollment`; pola `canManageCourse`; guard enrollment sebelum akses konten |
| TSD-Auth-ClassLevel.md | Tidak langsung — akses ke course sudah difilter di layer TSD-Course-Content, modul ini hanya perlu tahu status enroll |
| `prisma` | Transaksi batch untuk `submitQuizAttempt` (insert attempt + banyak answer sekaligus), `createMany` |
| Supabase RLS | Lihat §3 — kombinasi RLS + validasi eksplisit di Server Action untuk permission builder & submit |

---

## 10. Acceptance Criteria

- [ ] Admin/tutor (utama maupun co-tutor) bisa membuat kuis pada lesson di kursus yang mereka ampu; tutor kursus lain ditolak (403), diverifikasi manual lewat manipulasi URL
- [ ] Response `getQuizForStudent` **tidak mengandung** field `isCorrect` sama sekali (dicek lewat Network tab, bukan cuma UI) — sesuai catatan §3.1
- [ ] Kuis tanpa soal, atau dengan soal yang belum punya opsi benar, tampil sebagai "belum tersedia" ke siswa, bukan error
- [ ] Siswa yang belum enroll tidak bisa membuka maupun submit kuis dari course tersebut (baik lewat UI maupun manipulasi request langsung)
- [ ] Skor dihitung otomatis & benar untuk kombinasi: semua benar, semua salah, sebagian tidak dijawab
- [ ] Siswa bisa mengerjakan kuis yang sama berkali-kali; riwayat menampilkan semua percobaan, skor final yang tampil di badge/dashboard = skor tertinggi
- [ ] Setelah kuis punya ≥1 attempt, seluruh percobaan edit struktur soal/opsi/hapus kuis ditolak dengan pesan jelas — diverifikasi manual dengan mencoba tiap aksi builder setelah 1 siswa submit
- [ ] Menandai satu opsi sebagai benar otomatis meng-unset opsi benar lain di soal yang sama — tidak pernah ada 2 opsi benar tersimpan bersamaan
- [ ] Hasil kuis yang ditampilkan ke siswa tidak membocorkan opsi jawaban yang benar untuk soal yang dijawab salah
- [ ] Semua RLS policy §3 diuji manual per role, termasuk mencoba akses lintas-scope yang seharusnya ditolak

---

*TSD ini merujuk ke SDD.md (§6.3, §7.6–7.7) dan TSD-Course-Content.md untuk dependency dasar (Lesson, Enrollment, pola permission). Perubahan pada dokumen tersebut, atau keputusan final soal B1 (kebijakan skor configurable), harus tercermin di revisi TSD ini.*
