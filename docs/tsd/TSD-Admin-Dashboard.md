# Technical Spec Document (TSD)
## Fitur: Admin Dashboard & User Management

**Versi:** 1.1
**Tanggal:** 2 September 2026
**Terkait dokumen:** PRD.md (v2.4) · SDD.md (v1.4) · Implementation-Plan.md (v2.6, Fase 5) · TSD-Auth-Account-Management.md (v1.1, dependency erat — `createUserAccount` kanonik di sana) · TSD-Auth-ClassLevel.md (v1.1, dependency) · TSD-Course-Content.md (v1.5, dependency ringan)
**Scope Implementation Plan:** Fase 5 (Dashboard Admin & Manajemen Akun Manual)

> **Ringkasan perubahan v1.1:** Setelah didiskusikan ulang, `createUserAccount` (generalisasi dari `createStudentAccount`) **dipindah jadi kanonik di TSD-Auth-Account-Management.md v1.1** — dokumen ini cukup memanggilnya, tidak lagi mendefinisikan ulang (§4.1 lama dihapus, digantikan referensi). `mustChangePassword` juga dipindah ke tabel `users` (berlaku semua role) — E2 di bawah direvisi total, dan `resetUserPassword` (§4.5) jadi seragam untuk semua role, tidak ada lagi percabangan siswa vs tutor.

---

## 1. Overview & Scope

### 1.1 Tujuan
Spesifikasi siap-coding untuk dashboard ringkas admin (angka operasional) dan modul manajemen akun user (siswa, tutor, & admin tambahan) secara penuh — UI list, edit, nonaktifkan, dan reset password di atas `createUserAccount` yang sudah kanonik di TSD-Auth-Account-Management.md.

### 1.2 FR yang Dicakup

| FR | Deskripsi |
|---|---|
| FR-29 | Dashboard ringkas admin: total siswa, jumlah kursus, kelas berjalan |
| FR-30 (bagian user) | Admin CRUD user (siswa/tutor/admin) — bagian "CRUD kursus/modul/materi" di FR-30 **sudah selesai** di TSD-Course-Content.md (Course Builder), tidak diulang di sini |
| FR-31 | Admin membuat & mengelola akun siswa secara manual (perluasan dari FR-2) |

### 1.3 Dependency & Resolusi Inkonsistensi Dokumen

**Perlu diketahui sebelum baca lebih lanjut** — ada 2 pernyataan yang sempat terlihat bertentangan di draft sebelumnya soal pembuatan akun tutor/admin:
- TSD-Auth-Account-Management.md v1.0 §3.1 (versi lama): *"akun tutor/admin dibuat langsung oleh developer/owner saat setup awal instance (di luar UI Tier 1)"*
- TSD-Auth-Account-Management.md §1.2 (Out of Scope) & PRD FR-30: *pembuatan akun tutor via UI admin*

**Resolusi (E1, dikonfirmasi):**
- **Akun admin pertama** (bootstrapping) — tetap dibuat manual oleh developer lewat Supabase Dashboard saat setup instance baru per klien (butuh 1 akun admin yang bisa login sebelum ada UI apa pun). Didokumentasikan di README replikasi (Implementation-Plan Fase 1 & 7), **bukan** Server Action di TSD manapun.
- **Semua akun setelahnya — siswa, tutor, maupun admin tambahan** — dibuat lewat 1 Server Action yang sama (`createUserAccount`, sekarang kanonik di TSD-Auth-Account-Management.md v1.1 §4.2), dipanggil dari 3 form berbeda di UI ini (§5.2).

Dependency lain:
- Model `User` (termasuk `mustChangePassword`, sekarang di sini — lihat E2 revisi), `StudentProfile`, `TutorProfile`, `AdminProfile` dari TSD-Auth-Account-Management.md v1.1
- **`createUserAccount`** (TSD-Auth-Account-Management.md v1.1 §4.2) — **dipanggil langsung**, tidak lagi didefinisikan ulang di sini (beda dari v1.0 dokumen ini)
- `updateStudentClassLevelAction` (TSD-Auth-ClassLevel.md, FR-37) — dipakai ulang untuk ubah tingkatan siswa dari halaman edit user
- `course_tutors` (TSD-Course-Content.md) — dipakai read-only untuk menampilkan "jumlah kursus diampu" di listing tutor (§4.2), tidak untuk assign/unassign (itu tetap di TSD-Course-Content §FR-40)

### 1.4 Keputusan Desain

**E2 — `mustChangePassword` di tabel `users`, berlaku semua role (REVISI TOTAL dari v1.0):**
Di v1.0 dokumen ini, flag ini dianggap cuma relevan untuk siswa. Setelah dipikir ulang: karena **semua akun (siswa/tutor/admin tambahan) sekarang dibuat lewat jalur yang sama** (`createUserAccount`, E1), dan sistem **belum ada verifikasi email** (jadi tidak ada jalur "lupa password" yang sepenuhnya aman tanpa keterlibatan admin), flag ini dipindah ke tabel `users` — berlaku seragam untuk semua role. Konsekuensi: tutor/admin yang akunnya baru dibuat (atau di-reset passwordnya) **juga** dipaksa ganti password di login pertama, sama seperti siswa. Ini sekaligus jadi fondasi reset password admin yang seragam (§4.5). Perubahan skema ada di TSD-Auth-Account-Management.md v1.1 §3.

**E3 — Nonaktifkan (`is_active = false`), bukan hard delete, untuk siswa maupun tutor:**
Baik siswa (punya `enrollments`, `lesson_progress`, `reviews`, dst) maupun tutor (punya `course_tutors`) merujuk ke banyak data lain — hard delete akan cascade menghapus data itu atau butuh soft-delete manual di banyak tempat. Nonaktifkan cukup toggle `is_active`, dan `loginUser` **sudah** menolak akun nonaktif (`ACCOUNT_INACTIVE`, TSD-Auth-Account-Management §4.1) — tidak perlu perubahan di sana. Data historis (progress, review, kursus yang pernah diampu) tetap utuh, cuma akunnya tidak bisa dipakai login.

**E4 — Admin tidak bisa menonaktifkan akunnya sendiri:**
Mencegah lockout tidak sengaja (terutama kalau baru ada 1 admin di instance itu). `deactivateUserAccount` menolak kalau `targetUserId === currentAdminUserId`.

**E5 — Definisi "Kelas Berjalan" di FR-29 (dikonfirmasi, tidak berubah):**
**Jumlah `ClassLevel` (tingkatan) yang punya minimal 1 siswa aktif** (`is_active = true`) saat ini — bukan jumlah live session (itu Tier 2, Fase 10, belum ada di Tier 1).

**E6 — Reset password admin-triggered generate ulang password sementara, seragam semua role (disederhanakan dari v1.0):**
Memakai fungsi generate password sementara yang sama seperti `createUserAccount` (TSD-Auth-Account-Management §4.2) — bukan `resetPasswordRequest` (self-service, link email, TSD-Auth-Account-Management §4.4). Dua alur ini melayani skenario beda: user lupa password sendiri → `resetPasswordRequest`; admin perlu reset akun tertentu (misal siswa tidak bisa akses email lagi, atau sebagai jalur cadangan karena belum ada verifikasi email) → `resetUserPassword` di sini. **Sejak E2 direvisi, tidak ada lagi percabangan role** — `mustChangePassword` di-set `true` untuk siapa pun yang di-reset, tanpa kecuali.

---

## 2. Data Model
Tidak ada tabel baru — modul ini murni query & Server Action baru di atas skema `users`/`student_profiles`/`tutor_profiles`/`class_levels`/`courses`/`enrollments` yang sudah ada (SDD §3.2, TSD-Auth-Account-Management §3, TSD-Auth-ClassLevel §3).

---

## 3. RLS Policies (Supabase)
Tidak ada policy baru — seluruh Server Action di dokumen ini (create/update/deactivate/reset password) berjalan dengan Supabase `service_role` key di server, **melewati RLS by design**, persis seperti `createStudentAccount` (lihat TSD-Auth-Account-Management §6, catatan implementasi). Query `listUsers`/`getAdminDashboardSummary` juga jalan di Server Component sebagai admin yang sudah lolos middleware — cukup ditambah re-check `role === 'admin'` di dalam tiap Server Action (jangan andalkan middleware saja, konsisten dengan pola existing).

---

## 4. Server Actions & Queries

### 4.1 Pembuatan Akun — dipanggil dari `createUserAccount` (TSD-Auth-Account-Management.md v1.1 §4.2)

**FR terkait:** FR-30, FR-31

Server Action-nya **tidak didefinisikan ulang di sini** (lihat v1.1 changelog di atas) — dokumen ini hanya menyediakan 3 form UI yang memanggilnya dengan `role` berbeda:
- **Form "Tambah Siswa"** → `createUserAccount({ role: "student", ... })`, field: nama, email, phone, tingkatan (opsional)
- **Form "Tambah Tutor"** → `createUserAccount({ role: "tutor", ... })`, field: nama, email, phone, bio (opsional)
- **Form "Tambah Admin"** → `createUserAccount({ role: "admin", ... })`, field: nama, email, phone — **di luar teks literal FR-30/31** (yang cuma sebut siswa/tutor), tapi konsekuensi wajar dari E1 (admin tambahan pun lewat jalur yang sama) dan biayanya nyaris nol karena Server Action-nya sudah generik. Kalau dirasa tidak perlu untuk MVP, tombol ini gampang disembunyikan tanpa mengubah apa pun di backend.

Response `{ tempPassword }` ditampilkan sekali ke admin persis seperti dijelaskan di TSD-Auth-Account-Management §4.2 — tidak ada perbedaan penanganan di sisi UI ini.

### 4.2 `updateUserAccount`

**FR terkait:** FR-30, FR-31

**Input:**
```ts
const updateUserAccountSchema = z.object({
  userId: z.string().uuid(),
  name: z.string().min(2).max(100).optional(),
  phone: z.string().min(9).max(15).optional(),
  email: z.string().email().optional(),
  bio: z.string().max(500).optional(), // hanya relevan kalau target tutor, diabaikan kalau siswa/admin
});
```

**Alur logika:**
1. Cek `role === 'admin'` pemanggil
2. Kalau `email` diubah: cek belum dipakai user lain (`EMAIL_ALREADY_EXISTS`, sama seperti `createUserAccount`), lalu update **dua tempat** dalam urutan yang aman — `supabase.auth.admin.updateUserById(authId, { email })` dulu, baru `prisma.user.update` (kebalikan urutan dari create, karena di sini yang "sumber kebenaran awal" adalah baris `users` yang sudah ada; kalau step Supabase gagal, jangan lanjut update Prisma)
3. Update field lain (`name`, `phone`) di `users`; `bio` di `tutor_profiles` kalau target adalah tutor
4. **Perubahan `classLevelId` siswa TIDAK lewat sini** — arahkan ke `updateStudentClassLevelAction` (TSD-Auth-ClassLevel.md) yang sudah ada, supaya logic soal riwayat/log perpindahan tingkatan (kalau ada) tidak terduplikasi di dua tempat

### 4.3 `listUsers` (query)

**FR terkait:** FR-30

**Input:**
```ts
const listUsersSchema = z.object({
  role: z.enum(["student", "tutor", "admin"]), // 1 tab aktif per waktu, bukan gabungan
  search: z.string().optional(), // cocok ke name ATAU email, case-insensitive
  classLevelId: z.string().uuid().optional(), // filter tambahan, hanya relevan untuk role=student
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});
```

**Alur logika:**
```ts
const where = {
  role,
  ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] } : {}),
  ...(role === "student" && classLevelId ? { studentProfile: { classLevelId } } : {}),
};
const [users, total] = await Promise.all([
  prisma.user.findMany({
    where,
    include: role === "student"
      ? { studentProfile: { include: { classLevel: { select: { name: true } } } } }
      : { tutorProfile: true, _count: { select: { courseTutors: true } } }, // "jumlah kursus diampu" untuk tutor
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: { createdAt: "desc" },
  }),
  prisma.user.count({ where }),
]);
```

### 4.4 `deactivateUserAccount` / `reactivateUserAccount`

**FR terkait:** FR-31

**Alur logika:**
1. Cek `role === 'admin'` pemanggil
2. **Guard (E4):** tolak kalau `targetUserId === currentAdminUserId` (`CANNOT_DEACTIVATE_SELF`)
3. Toggle `prisma.user.update({ where: { id: targetUserId }, data: { isActive: <true|false> } })`
> Tidak ada efek cascade ke tabel lain — `enrollments`/`course_tutors`/dsb tetap ada apa adanya (E3). Kalau tutor yang dinonaktifkan masih jadi Tutor Utama satu-satunya di suatu course, itu **tidak divalidasi/diblokir** di sini — dianggap keputusan operasional admin (sadar akan konsekuensinya), bukan constraint sistem. Dicatat sebagai catatan, bukan validasi keras, supaya admin tidak "terjebak" tidak bisa menonaktifkan siapa pun.

### 4.5 `getAdminDashboardSummary` (query)

**FR terkait:** FR-29

**Alur logika:**
```ts
const [totalSiswa, totalKursus, kelasBerjalan] = await Promise.all([
  prisma.user.count({ where: { role: "student", isActive: true } }),
  prisma.course.count(),
  prisma.classLevel.count({
    where: { students: { some: { user: { isActive: true } } } }, // E5
  }),
]);
```
`totalSiswa` sengaja hanya menghitung yang `isActive: true` — siswa yang dinonaktifkan tidak relevan ditampilkan sebagai "total siswa" operasional saat ini. `totalKursus` menghitung **semua** course tanpa filter status (tidak ada konsep draft/published terpisah di skema Tier 1 saat ini, course yang dibuat langsung dianggap "ada").

### 4.6 `resetUserPassword`

**FR terkait:** FR-31

**Alur logika:**
1. Cek `role === 'admin'` pemanggil
2. Generate password sementara baru (fungsi yang sama dipakai `createUserAccount`, TSD-Auth-Account-Management §4.2)
3. `supabase.auth.admin.updateUserById(authId, { password: newTempPassword })`
4. Set `users.mustChangePassword = true` lagi — **seragam untuk semua role sejak E2 direvisi**, tidak ada percabangan siswa vs tutor/admin lagi
5. Return `{ tempPassword }` ke UI admin untuk disampaikan manual — **tidak** disimpan di database dalam bentuk apa pun, sama seperti `createUserAccount`

---

## 5. UI Requirements

### 5.1 Dashboard Admin (`/admin/dashboard`)
3 kartu ringkas dari `getAdminDashboardSummary`: **Total Siswa**, **Jumlah Kursus**, **Kelas Berjalan**.

### 5.2 Halaman Manajemen User (`/admin/users`)
- 3 tab: **Siswa**, **Tutor**, **Admin** (`listUsers` dengan `role` sesuai tab aktif) — tab Admin opsional untuk MVP (§4.1), gampang disembunyikan kalau dirasa belum perlu
- Search box (nama/email) + filter tingkatan (khusus tab Siswa)
- Tiap baris: nama, email, status (Aktif/Nonaktif badge), untuk tutor tambahan kolom "jumlah kursus diampu"; tombol aksi: Edit, Reset Password, Nonaktifkan/Aktifkan
- 3 tombol tambah, satu per tab aktif: **"+ Tambah Siswa"**, **"+ Tambah Tutor"**, **"+ Tambah Admin"** — semua memanggil `createUserAccount` dari TSD-Auth-Account-Management dengan `role` berbeda (§4.1), bukan 1 form dengan dropdown role (field yang dibutuhkan beda: tingkatan vs bio vs tanpa field tambahan)
- Modal/halaman Edit: form `updateUserAccount`; untuk siswa ada tombol terpisah "Ubah Tingkatan" yang memanggil `updateStudentClassLevelAction` (bukan bagian form yang sama, supaya jelas ini aksi berbeda dengan histori/efek sendiri kalau ada)
- Tombol "Reset Password" menampilkan modal konfirmasi, lalu tampilkan `tempPassword` baru sekali (mirip alur `createUserAccount`) — pesan eksplisit "password ini tidak akan ditampilkan lagi, catat/kirim sekarang"
- Tombol "Nonaktifkan" untuk akun sendiri **disembunyikan** di UI (selain guard di server, E4) — mencegah kebingungan kenapa tombolnya ada tapi selalu gagal

---

## 6. Edge Cases & Validation Summary

| # | Kondisi | Perilaku yang Diharapkan |
|---|---|---|
| 1 | Admin membuat akun tutor/admin dengan email yang sudah dipakai siswa/tutor/admin lain | Ditolak `EMAIL_ALREADY_EXISTS`, sama seperti `createUserAccount` untuk role apa pun |
| 2 | Admin ubah email user, tapi step `supabase.auth.admin.updateUserById` gagal (misal masalah jaringan) | Jangan lanjut update Prisma — return error, data `users.email` tetap konsisten dengan `auth.users` |
| 3 | Admin coba nonaktifkan akunnya sendiri | Ditolak `CANNOT_DEACTIVATE_SELF`, tombol juga disembunyikan di UI (§5.2) |
| 4 | Admin nonaktifkan tutor yang masih jadi Tutor Utama satu-satunya di suatu course | Diizinkan (tidak ada blocking constraint) — dicatat sebagai keputusan operasional admin, bukan celah sistem |
| 5 | Siswa/tutor/admin yang dinonaktifkan coba login | Ditolak `ACCOUNT_INACTIVE` — sudah ditangani `loginUser` existing, tidak perlu perubahan |
| 6 | Admin reset password user yang sedang login (sesi aktif) | Sesi lama tetap jalan sampai logout/expired (Supabase tidak otomatis invalidate sesi lain saat password diganti admin) — diterima sebagai batasan Tier 1, bukan bug |
| 7 | `listUsers` dipanggil dengan `classLevelId` filter tapi `role: "tutor"`/`"admin"` | Filter diabaikan (tidak relevan) — divalidasi di Zod schema dengan `.refine()` atau cukup diabaikan di query (tidak perlu error keras) |

---

## 7. Dependencies

| Dependency | Kebutuhan Spesifik di Modul Ini |
|---|---|
| TSD-Auth-Account-Management.md (v1.1) | `createUserAccount` (§4.2, dipanggil langsung — **tidak didefinisikan ulang di sini**, lihat E1); model `User` (termasuk `mustChangePassword`), `StudentProfile`/`TutorProfile`/`AdminProfile`; `loginUser` (guard `is_active` & `mustChangePassword`, tidak perlu diubah) |
| TSD-Auth-ClassLevel.md (v1.1) | `updateStudentClassLevelAction` dipakai ulang dari UI edit user (§5.2), tidak diduplikasi |
| TSD-Course-Content.md (v1.5) | `course_tutors` dibaca read-only untuk kolom "jumlah kursus diampu" di listing tutor |
| Supabase Auth Admin API | `updateUserById` (ubah email/password), dipakai di §4.2 & §4.6 |

---

## 8. Acceptance Criteria

- [ ] Admin bisa membuat akun tutor & admin tambahan lewat UI (sebelumnya cuma bisa siswa) — akun baru bisa login & langsung masuk ke dashboard sesuai role
- [ ] `listUsers` menampilkan data benar per tab (Siswa/Tutor/Admin), search & filter tingkatan berfungsi
- [ ] Admin bisa edit nama/email/phone/bio user; perubahan email tersinkron ke Supabase Auth (dicek: user bisa login pakai email baru)
- [ ] Admin tidak bisa menonaktifkan akunnya sendiri (dicoba manual, ditolak dengan pesan jelas)
- [ ] Siswa/tutor/admin yang dinonaktifkan tidak bisa login (`ACCOUNT_INACTIVE`), tapi data historis (enrollment/course_tutors/dst) tetap utuh di database
- [ ] Reset password admin menghasilkan password baru yang valid untuk login; **user mana pun** (siswa/tutor/admin) dipaksa ganti password lagi di login berikutnya (E2 direvisi — tidak ada lagi pengecualian role)
- [ ] Dashboard admin menampilkan 3 angka yang sesuai definisi §4.5 (total siswa aktif, total kursus, kelas berjalan)
- [ ] Mengubah tingkatan siswa dari halaman ini benar-benar memanggil `updateStudentClassLevelAction` existing, bukan logic duplikat

---

*TSD ini melengkapi TSD-Auth-Account-Management.md v1.1 (UI list/edit/nonaktifkan/reset password di atas `createUserAccount` yang sudah kanonik di sana) — tidak ada Server Action pembuatan akun yang didefinisikan ulang di sini. Perubahan lebih lanjut pada `createUserAccount`/`mustChangePassword` harus tercermin di kedua dokumen sekaligus.*
