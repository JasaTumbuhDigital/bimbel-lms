# Implementation Plan
## LMS Bimbel Template — [Nama Produk]

**Versi:** 2.9
**Tanggal:** 2 September 2026
**Terkait dokumen:** PRD.md (v2.4), SDD.md (v1.5)
**Target:** Codebase master Tier 1 (Base MVP) siap dijual & direplikasi ke klien pertama

> **Ringkasan perubahan v2.9 (perombakan besar sisi tutor & course):** (1) Pindah tingkatan siswa **kembali jadi hak eksklusif admin** — revert dari v2.7, TSD-Auth-ClassLevel.md v1.2. (2) Halaman kelola kursus tutor (`/tutor/courses`) & bekas "Eksplorasi Kursus" **digabung jadi 1 halaman dengan 2 tab**, Course Detail jadi 1 komponen shared admin/tutor dengan mode edit/preview otomatis (TSD-Course-Content.md v1.6). (3) Course Detail sekarang juga menampilkan daftar siswa enrolled per-course (khusus yang punya akses edit) dan reviews (untuk semua). (4) TSD-Tutor-Dashboard.md v1.1 jadi jauh lebih ringkas — cuma ringkasan lintas-course, detail per-course pindah ke TSD-Course-Content.md.
>
> **Ringkasan perubahan v2.8:** Diskusi arah desain (belum implementasi) — disepakati bahwa fitur Jadwal (Fase 10) audiensnya berdasarkan **ClassLevel** (bukan Enrollment), dan ide `bulkEnrollByClassLevel` dicatat sebagai penambahan opsional di Fase 2. Tidak ada perubahan skema Tier 1. Lihat catatan di masing-masing fase terkait.
>
> **Ringkasan perubahan v2.7:** Dashboard Tutor (`/tutor/dashboard`, `/tutor/students`) didetailkan di TSD-Tutor-Dashboard.md baru — melengkapi Fase 2 yang sebelumnya cuma fokus ke course management, dan sekalian menambal celah scoping tutor di `assignStudentToClassLevel` (FR-37, TSD-Auth-ClassLevel.md v1.1) yang sejak awal belum ada permission check-nya.
>
> **Ringkasan perubahan v2.6:** Fase 1 (`createStudentAccount`) & Fase 5 (Admin Dashboard) disinkronkan — akun tutor & admin tambahan sekarang dibuat lewat 1 Server Action yang sama (`createUserAccount`, generalisasi dari `createStudentAccount`), dan `must_change_password` berlaku semua role (dipindah ke tabel `users`). Detail: TSD-Auth-Account-Management.md v1.1, TSD-Admin-Dashboard.md v1.1.
>
> **Ringkasan perubahan v2.5:** Fase 3 (Kuis) — relasi kuis dipindah dari per-lesson jadi **per-modul** (sejajar dengan lesson sebagai sub-materi). Kelulusan kuis dipertegas **murni informasional**, tidak lagi otomatis mengisi `lesson_progress` — revisi kecil yang sempat dibutuhkan di Fase 2 (`markLessonComplete`) jadi tidak perlu, Fase 2 & 3 sekarang independen satu arah.
>
> **Ringkasan perubahan v2.4:** Fase 3 (Kuis) dirombak — jadi post-test per lesson dengan passing grade (bukan modul ujian berdiri sendiri dengan riwayat percobaan), kelulusan otomatis menandai lesson selesai. Draft desain awal yang ternyata lebih cocok untuk "ujian standalone" dipindah jadi kandidat backlog baru di Fase 11.
>
> **Ringkasan perubahan v2.3:** FR-10 (lesson tipe dokumen PDF/PPT + preview) dikonfirmasi **tetap di Fase 2/Tier 1** dengan menggunakan `@cyntler/react-doc-viewer` sebagai skema awal rendering langsung di browser.
>
> **Ringkasan perubahan v2.2:** Fase 1 & Fase 2 disesuaikan mengikuti SDD v1.1 — relasi kelas↔kursus jadi many-to-many + flag eksplisit, kepemilikan kursus oleh tutor jadi many-to-many (co-teaching), plus scoping akses tutor terbatas ke kursus miliknya (FR-40, FR-41 baru di PRD).
>
> **Ringkasan perubahan v2.1:** Dokumen ini dipangkas jadi **roadmap fase & checklist kerja**, bukan lagi tempat menjelaskan alasan/detail teknis — itu sekarang tinggal di **SDD.md** (arsitektur, data model, keputusan desain) dan akan dilengkapi **TSD per fitur** (spesifikasi teknis detail tiap modul). Skema database di Fase 1 disesuaikan mengikuti keputusan SDD §3.1 (satu tabel `users` + role, bukan tabel terpisah penuh per role).
>
> **Ringkasan perubahan v2.0:** Arsitektur multi-tenant dihapus. Setiap klien = 1 instance terpisah penuh (deployment & database sendiri). Fokus development berubah dari "bangun 1 sistem final" menjadi "bangun 1 codebase master yang mudah dikonfigurasi & direplikasi cepat per klien".

---

## 1. Tech Stack Ringkas

| Layer | Teknologi |
|---|---|
| Framework | Next.js (App Router, TypeScript) |
| Auth + DB + Storage | Supabase (Postgres, Auth, Storage, RLS) — 1 project Supabase per klien |
| ORM | Prisma |
| UI | Tailwind CSS + shadcn/ui |
| Form & Validasi | React Hook Form + Zod |
| Video | YouTube (unlisted, embed iframe biasa di T1) |
| Video progress tracking *(Tier 2)* | react-youtube (IFrame API) |
| Sertifikat *(Tier 2)* | @react-pdf/renderer |
| Pembayaran *(Tier 2)* | Midtrans / Xendit |
| Notifikasi WA *(Tier 2)* | Fonnte / Wablas |
| Server State | TanStack Query |
| Deploy | Vercel — 1 project Vercel per klien |

---

## 2. Prinsip Arsitektur (Ringkas — Detail & Alasan di SDD §1.4, §7)

3 prinsip wajib dipegang sejak Fase 1, karena model bisnisnya "1 klien = 1 deployment terpisah":

1. **Config-driven branding** — `config/institution.ts` + `.env` per klien, bukan hardcoded di komponen
2. **Modular per fitur** — modul Tier 2 bisa "dimatikan" via feature flag tanpa merusak Tier 1 (lihat SDD §5.1)
3. **Versioning & tagging rapi** — Git tag jelas per rilis (`v1.0-tier1`, `v1.1-tier2-payment`) untuk tracking versi per klien

---

## 3. Fase Pengerjaan

### Fase 0 — Persiapan
**Tujuan:** Menyelesaikan keputusan dasar sebelum coding supaya fondasi config-driven benar dari awal.

- [ ] Finalisasi daftar field yang perlu configurable per klien (nama institusi, logo, warna primer/sekunder, alamat, kontak WA, teks hero, dst) — jadi acuan struktur `config/institution.ts`
- [ ] Siapkan template kontrak sederhana (scope project, harga, durasi maintenance retainer, kejelasan kepemilikan source code & infrastruktur) — lihat PRD Open Items §7.4
- [ ] Setup project management sederhana (Trello/Linear/Notion) untuk tracking

**Output:** Struktur config final disepakati, siap jadi acuan development.

---

### Fase 1 — Setup Fondasi Project (Codebase Master)
**Tujuan:** Environment siap, arsitektur dasar berdiri, mudah direplikasi.

1. **Inisialisasi project**
   - `create-next-app` (TypeScript + App Router + Tailwind), ESLint + Prettier
   - Struktur folder (lihat §5)
2. **Config-driven branding**
   - `config/institution.ts` (nama, logo, warna, kontak, teks hero) + `.env.example`
   - Dokumentasikan di README field apa saja yang wajib diganti per klien baru
3. **Setup Supabase (project pertama, jadi acuan/template)**
   - Skema database sesuai SDD §3.2: `users` (1 tabel + kolom `role`) → `student_profiles`/`tutor_profiles`/`admin_profiles`, `class_levels`, `courses` (+ flag `visible_to_all_levels`), pivot `course_class_levels` (many-to-many kelas↔kursus) & `course_tutors` (many-to-many tutor↔kursus), `modules`, `lessons`, `enrollments`, `lesson_progress`, `quizzes` + turunannya, `wishlists`, `reviews`
   - Setup Prisma, generate schema pertama
   - Aktifkan RLS dasar per role (lihat SDD §8 — checklist detail policy per tabel disusun di TSD)
4. **Setup Auth**
   - Integrasi Supabase Auth (`@supabase/ssr`) + Middleware role-based access
   - Alur admin-created account, generik untuk siswa (FR-2) — Server Action `createUserAccount` (TSD-Auth-Account-Management §4.2) sudah didesain generik untuk `role: student|tutor|admin` sejak awal, meski Fase 1 cuma perlu form siswa dulu (form tutor/admin menyusul di Fase 5): lihat flow lengkap di SDD §6.1
   - **Bootstrap akun admin pertama** dilakukan manual oleh developer lewat Supabase Dashboard (bukan lewat UI) — didokumentasikan di README replikasi, satu-satunya akun yang tidak lewat `createUserAccount`
   - **Tidak** ada halaman "Daftar" publik di Tier 1 (baru di Fase 8)
5. **Setup UI foundation**
   - shadcn/ui + Tailwind, warna default dari `config/institution.ts`
   - Layout dasar: `(public)`, `(auth)`, `(student)`, `(admin)`
6. **Setup deploy pipeline (template)**
   - Hubungkan repo GitHub ke Vercel
   - Dokumentasikan langkah deploy ulang untuk klien baru (project Supabase baru → `.env` baru → project Vercel baru → deploy)

**Output:** Project jalan lokal & ter-deploy skeleton ke Vercel, auth admin-created account jalan, proses ganti branding sudah teruji minimal 1x.

**Terkait FR:** FR-1, FR-2, FR-4, FR-5, FR-6

---

### Fase 1b — Manajemen Kelas/Tingkatan
**Tujuan:** Fondasi struktural, dibangun sebelum modul kursus (alasan: PRD §5.1a, desain: SDD §3.3).

- [ ] Admin: CRUD kategori kelas/tingkatan (soft-delete jika masih ada siswa aktif)
- [ ] Logic penetapan tingkatan default saat akun siswa dibuat
- [ ] Admin/tutor: UI pindahkan siswa antar tingkatan (dropdown sederhana)
- [ ] Helper/query filter akses berbasis tingkatan (many-to-many + flag `visible_to_all_levels`, dipakai ulang di Fase 2+) — pattern: SDD §5 (Class Level Module), §7.6

**Output:** Sistem tingkatan siap jadi fondasi filter akses kursus.

**Terkait:** FR-36, FR-37, FR-38 · SDD §3.2, §3.3, §6.2 · TSD-Auth-ClassLevel.md v1.2 (pindah tingkatan murni hak admin — sempat dicoba diperluas ke tutor di v1.1, lalu di-revert, lihat changelog v1.2 dokumen tsb)

---

### Fase 2 — Modul Kursus & Materi
**Tujuan:** Siswa bisa lihat kursus sesuai tingkatannya, pelajari materi, tandai progress. Flow lengkap: SDD §6.2.

- [ ] Skema & CRUD: courses (pilih 1/beberapa/semua tingkatan via `course_class_levels` + flag) → modules → lessons (video/dokumen)
- [ ] Admin: assign/unassign satu atau lebih tutor pengampu per kursus (`course_tutors`) — FR-40
- [ ] Siswa: listing kursus terfilter tingkatan; detail kursus tampil sebagai preview (struktur modul terlihat, konten terkunci) sebelum klik "Enroll"
- [ ] Tombol "Enroll" eksplisit di halaman detail kursus (bukan auto-enroll diam-diam) — buka akses penuh ke konten setelah diklik
- [ ] **(catatan tambahan, disepakati 2 September 2026, belum wajib di-Fase-2)** `bulkEnrollByClassLevel(courseId, classLevelId)` — tutor bisa daftarkan sekaligus semua siswa 1 tingkatan ke course-nya, bukan cuma per-siswa. Cukup insert banyak baris `enrollments` sekaligus (tabel & logic sama persis dengan enroll individual), tidak perlu perubahan skema. Boleh menyusul kapan saja, tidak blocking Fase 2 selesai duluan tanpa ini.
- [ ] Tutor: 1 halaman `/tutor/courses` dengan 2 tab — "Kursus Saya" (scoped via `course_tutors`, editable) & "Kursus Lain" (semua kursus institusi, read-only preview untuk saling koreksi antar tutor) — tidak dibedakan Tutor Utama vs Co-Tutor untuk hak edit — FR-41
- [ ] Course Detail (dipakai admin & tutor): section daftar siswa enrolled per-course + progress (khusus yang punya akses edit), section reviews (tampil untuk semua)
- [ ] Video: embed YouTube unlisted (player biasa, **tanpa** tracking otomatis di T1)
- [ ] Dokumen: upload PDF/PPT ke Supabase Storage + preview di browser via `@cyntler/react-doc-viewer`
- [ ] Tombol "Tandai Selesai" manual per lesson (Server Action ke `lesson_progress`, hanya untuk siswa yang sudah enroll)

**Output:** Siswa jelajahi & enroll kursus secara sadar, belajar & tandai progress manual; admin kelola konten, batasan tingkatan, & penugasan tutor; tutor kelola kursus miliknya + preview read-only kursus lain dari 1 halaman yang sama.

**Terkait:** FR-7, FR-8, FR-9, FR-10, FR-40, FR-41 · SDD §6.2 · TSD-Course-Content.md v1.6 (Course Detail terpadu admin/tutor, §8.2, §8.5 — termasuk daftar siswa enrolled & reviews per-course) · Ringkasan dashboard tutor lintas-course di TSD-Tutor-Dashboard.md v1.1

---

### Fase 3 — Kuis (Post-Test per Modul)
**Tujuan:** Siswa uji pemahaman lewat post-test pilihan ganda per modul (sejajar dengan lesson sebagai sub-materi), dengan passing grade sebagai ambang. Status kelulusan **murni informasional** (badge), tidak menggerbang apa pun. Detail lengkap: TSD-Quiz.md v3.0 (menggantikan pendekatan "riwayat percobaan penuh" di draft awal — lihat TSD-Exam-Standalone-DRAFT.md, dipindah jadi kandidat Fase 11).

- [ ] Skema & builder kuis pilihan ganda per modul (admin/tutor), 1 modul maksimal 1 kuis, field passing grade (default 70%)
- [ ] Siswa: kerjakan kuis, submit, lihat skor & status lulus per percobaan
- [ ] Status kuis (lulus/skor terbaik) tersimpan sebagai 1 row agregat per siswa per kuis — bukan riwayat kronologis tiap percobaan
- [ ] Badge status kuis modul tampil di halaman detail kursus, murni informasional — **tidak** mengubah tombol "Tandai Selesai" lesson, **tidak** ikut dihitung ke progress bar kursus, **tidak** mengunci modul berikutnya

**Output:** Modul kuis end-to-end, independen (satu arah) dari modul progress tracking Fase 2.

**Terkait:** FR-11, FR-12 · TSD-Quiz.md v3.0

---

### Fase 4 — Dashboard Siswa Lengkap (Wishlist & Reviews)
- [ ] Dashboard real-time: enrolled/aktif/selesai
- [ ] Wishlist: simpan/hapus kursus
- [ ] Reviews: rating & ulasan kursus yang sudah diikuti
  - Sertakan **ringkasan rating** (rata-rata, total ulasan, bintang) di atas daftar ulasan — sudah diimplementasikan.
  - Pola paginasi: load semua ulasan tanpa batasan di fase ini (data masih sedikit). Threshold "Load More" akan diaktifkan di **Fase 11** saat data bertambah.

> **Keputusan Desain UX (disetujui):**
> - **Ulasan (Reviews):** Gunakan pola **"Muat Lebih Banyak" (Load More)** — user klik tombol untuk memuat ulasan berikutnya secara eksplisit. Bukan infinite scroll otomatis agar footer tetap dapat diakses.
> - **Katalog Kursus (`/student/courses`):** Gunakan pola **Infinite Scroll otomatis** saat kursus aktif ≥ 30 item — dikombinasikan dengan fitur Pencarian & Filter Kelas.

**Terkait:** FR-14, FR-15, FR-16

---

### Fase 5 — Dashboard Admin & Manajemen Akun Manual
- [ ] Dashboard ringkas: total siswa, kursus, kelas berjalan (kelas berjalan = tingkatan dengan ≥1 siswa aktif)
- [ ] CRUD user (siswa/tutor/admin) — pakai `createUserAccount` generik dari Fase 1, tambah UI list/edit/nonaktifkan/reset password (TSD-Admin-Dashboard.md)
- [ ] CRUD kursus/modul/lesson (lengkapi dari Fase 2 jika perlu)

**Terkait:** FR-29, FR-30, FR-31 · TSD-Admin-Dashboard.md v1.1

---

### Fase 6 — Landing Page & Blog
- [ ] Landing page: hero, statistik, listing kursus + filter kategori, testimoni — full config-driven
- [ ] `next/image` + `generateMetadata` untuk SEO dasar
- [ ] Blog/artikel: mulai dari MDX statis + SEO metadata dasar

**Terkait:** FR-34, FR-35

---

### Fase 7 — QA, Dokumentasi Serah Terima & Paket Replikasi
- [ ] QA menyeluruh per role (siswa, admin) mengikuti user stories Tier 1 di PRD
- [ ] **Uji replikasi**: simulasi klien baru — ganti config penuh + deploy ke project Supabase/Vercel baru dari nol, catat durasi & yang masih ketinggalan hardcoded
- [ ] Dokumentasi serah terima: panduan penggunaan, dokumentasi teknis, kejelasan kepemilikan source code/infrastruktur (sesuai kontrak Fase 0)
- [ ] Checklist keamanan dasar: RLS aktif & benar per role, tidak ada credential hardcoded

**Output:** Template Tier 1 siap dijual — proses replikasi teruji & terdokumentasi.

---

## 4. Fase Lanjutan — Tier 2 (Dikerjakan Setelah Tier 1 Terjual/Tervalidasi)

Modul-modul ini dibangun sebagai **tambahan modular** di atas codebase master, diaktifkan lewat feature flag config saat klien upgrade ke Tier 2.

### Fase 8 — Registrasi Mandiri & Pembayaran
- Halaman "Daftar" publik + pemilihan kursus (menggantikan alur admin-only untuk klien Tier 2)
- Integrasi payment gateway (Midtrans/Xendit): checkout, webhook handler (API Route), auto-enroll setelah pembayaran terverifikasi
- Dashboard admin: verifikasi & tracking pembayaran

**Terkait FR:** FR-3, FR-24, FR-25, FR-26

### Fase 8b — Progress Tracking Otomatis (Video)
- Integrasi `react-youtube` (IFrame API) menggantikan player biasa dari Fase 2
- Player custom + progress bar berbasis durasi tonton aktual, auto-save progress (debounce, Server Action)
- Auto mark selesai otomatis di ≥90% durasi, menggantikan tombol manual "Tandai Selesai" (data lama dari Tier 1 tetap kompatibel karena struktur tabel `lesson_progress` sama, hanya cara pengisian yang berubah)

**Terkait FR:** FR-39

### Fase 9 — Portal Orang Tua
- Penautan akun orang tua ↔ siswa (1 → banyak)
- Portal: progress belajar, kehadiran, riwayat pembayaran anak

**Terkait FR:** FR-18, FR-19, FR-20

### Fase 10 — Live Class & Kehadiran
- Jadwal live class + link Zoom/Meet
- Notifikasi WA (Fonnte/Wablas) sebelum kelas
- Presensi per sesi oleh tutor

> **Catatan arah desain (disepakati 2 September 2026, belum diimplementasikan):** Audiens jadwal (`Schedule`) ditentukan berdasarkan **ClassLevel**, bukan Enrollment — `Schedule { courseId, classLevelId, tutorId, hari, jam, link }`. Alasan: setiap siswa cuma punya 1 `classLevelId` (scalar), jadi cek bentrok jadwal jadi 1 query sederhana per ClassLevel; kalau berdasarkan Enrollment (opt-in, tak terbatas), deteksi bentrok jauh lebih berat & tidak terjamin. Ini **tidak** mengubah orientasi tutor (tetap 100% by Course untuk materi/kuis/progress) — Schedule cuma layer tipis yang nempelin `classLevelId` sebagai target audiens di atas struktur yang sudah ada. Efek samping positif: 1 Course yang sama bisa punya beberapa baris Schedule untuk ClassLevel berbeda (menjawab kebutuhan "Course A untuk Kelas A vs Kelas B" tanpa duplikasi Course atau entitas "Section" baru). Opsional: saat bikin Schedule, tutor bisa sekalian trigger `bulkEnrollByClassLevel` (lihat Fase 2 addendum) supaya siswa di kelas itu otomatis ter-enroll ke course terkait — tetap eksplisit (tutor yang klik), bukan auto-enroll diam-diam, konsisten dengan A1. **Tidak ada perubahan skema Tier 1 yang perlu dilakukan sekarang** — ini murni catatan arah untuk saat Fase 10 mulai dikerjakan.

**Terkait FR:** FR-21, FR-22, FR-23

### Fase 11 — Konten & Interaksi Lanjutan
- Sertifikat otomatis (@react-pdf/renderer)
- Forum Q&A per kursus
- Kuis (post-test modul, Fase 3) dengan timer & pembahasan otomatis — FR-13
- **Paginasi Ulasan (FR-16):** Implementasi "Load More" aktif — fetch 10 ulasan pertama, muat 10 lagi per klik tombol; menggunakan cursor-based pagination di Prisma (`take`/`skip` atau `cursor`). Ini adalah kelanjutan langsung dari keputusan desain di Fase 4.
- **Infinite Scroll Katalog Kursus:** Implementasi infinite scroll di `/student/courses` jika jumlah kursus aktif sudah mendekati 30+; dikombinasikan dengan fitur Pencarian dan Filter Kelas.
- **Modul Ujian/Exam standalone (FR-11b, kandidat baru)** — berdiri sendiri setara "modul" di sebuah kursus (bukan melekat ke 1 modul tertentu), berbagai jenis soal (bukan cuma pilihan ganda), riwayat percobaan penuh, kemungkinan benar-benar menggerbang kelulusan kursus untuk kebutuhan sertifikasi. Draft teknis awal sudah ada: **TSD-Exam-Standalone-DRAFT.md** (perlu direvisit total sebelum dipakai — ditulis dengan asumsi lama sebelum Fase 3 dirombak jadi post-test ringan). Belum diprioritaskan vs fitur Fase 11 lain, evaluasi bareng saat fase ini mulai dikerjakan.
- *(Opsional)* Kustomisasi preview dokumen jika ada permintaan klien lebih lanjut terkait `@cyntler/react-doc-viewer`

**Terkait FR:** FR-13, FR-27, FR-28, FR-11b

### Fase 12 — Analytics & Gamifikasi
- Dashboard admin: revenue tracking, laporan bisnis
- Dashboard tutor: analytics progress siswa
- Leaderboard/badge

**Terkait FR:** FR-32, FR-33, FR-17

---

## 5. Struktur Folder (Referensi Awal)

```
app/
  (public)/                # landing page, blog, listing kursus publik
    page.tsx
    courses/
    blog/
  (auth)/
    login/
    register/               # dibangun aktif hanya untuk instance Tier 2
  (student)/
    dashboard/
    courses/[id]/
    quiz/[id]/
    wishlist/
  (admin)/
    dashboard/
    users/                   # termasuk fitur create akun manual (Tier 1)
    class-levels/            # CRUD kelas/tingkatan (Tier 1)
    courses/
    orders/                  # aktif untuk instance Tier 2
  api/
    webhook/payment/         # aktif untuk instance Tier 2
config/
  institution.ts             # branding & konten config-driven
  features.ts                 # feature flag per tier
components/
  ui/                        # shadcn components
  shared/
lib/
  supabase/
  prisma/
  validations/                # Zod schemas
prisma/
  schema.prisma
middleware.ts
```

---

## 6. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Belum pernah pakai Next.js — potensi lambat di fase awal | Alokasikan waktu belajar eksplisit di Fase 1, jangan gabung dengan target fitur |
| Config-driven branding kurang menyeluruh (masih ada yang hardcoded), bikin replikasi ke klien baru jadi lambat/error | Wajibkan langkah "Uji Replikasi" di Fase 7 sebelum dianggap siap jual — jangan asumsikan config sudah lengkap tanpa dites end-to-end |
| Scoping akses tutor (hanya lihat kursus miliknya) lupa diterapkan di salah satu halaman/dashboard baru | Pusatkan logic scoping di satu module (`course_tutors` + RLS, lihat SDD §5, §7.7), jangan tulis filter manual berulang di tiap halaman tutor |
| YouTube unlisted video berpotensi di-download/dibagikan siswa | Diterima sebagai trade-off sadar untuk Tier 1 (biaya rendah); tawarkan Bunny.net/Mux sebagai opsi custom jika klien spesifik minta proteksi lebih |
| Free tier Supabase/Vercel per klien terlampaui saat instance klien bertambah besar | Pantau usage tiap instance secara berkala; ini jadi bagian natural dari percakapan upgrade/maintenance dengan klien, bukan ditanggung sepihak oleh kamu |
| Scope creep saat demo ke calon klien (klien minta fitur di luar Tier 1/2 sebelum deal jelas) | Gunakan PRD §7.3 (Out of Scope) sebagai acuan tegas saat sales — fitur di luar itu = custom quote terpisah, didiskusikan setelah deal dasar disepakati |
| Kesulitan tracking versi codebase yang sudah di-deploy ke tiap klien saat butuh maintenance | Disiplin Git tag/branch per rilis (lihat §2 poin 3) sejak awal, jangan ditunda sampai klien pertama masuk |
| Data progress manual (Tier 1) dianggap kurang objektif oleh sebagian klien | Terima sebagai batasan sadar Tier 1, jadikan progress otomatis (FR-39) sebagai salah satu alasan konkret upgrade ke Tier 2, bukan sesuatu yang perlu "diperbaiki" di Tier 1 |

---

*Dokumen ini adalah roadmap fase & checklist kerja — ringkas secara sengaja. Detail arsitektur & alasan keputusan teknis ada di SDD.md; spesifikasi detail tiap fitur (request/response, validasi, dsb) akan disusun sebagai TSD terpisah per fitur. Perubahan scope di PRD atau keputusan arsitektur di SDD harus tercermin di rencana fase ini.*
