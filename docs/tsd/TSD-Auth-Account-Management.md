# Technical Spec Document (TSD)
## Fitur: Autentikasi & Manajemen Akun (Auth Module)
### LMS Bimbel Template — [Nama Produk]

**Versi:** 1.1
**Tanggal:** 2 September 2026
**Terkait dokumen:** PRD.md v2.4 (§5.1, §6, §7.1), SDD.md v1.4 (§3.1, §3.2, §4.2, §5, §6.1, §7.3, §8), Implementation Plan v2.6 (Fase 1), TSD-Admin-Dashboard.md v1.1 (dependency — memakai `createUserAccount` di sini)
**Status:** Draft — direvisi setelah TSD-Admin-Dashboard.md (Fase 5) disusun

> **Ringkasan perubahan v1.1:** `mustChangePassword` dipindah dari `StudentProfile` ke `User` (berlaku semua role). `createStudentAccount` digeneralisasi jadi **`createUserAccount`** yang mendukung `role: student | tutor | admin` — jadi fungsi ini sekarang benar-benar tinggal di sini (tidak lagi didefinisikan ulang di TSD-Admin-Dashboard.md, cukup dipanggil dari sana). Alasan: hanya akun admin **pertama** yang perlu bootstrap manual (developer, di luar UI) — semua akun berikutnya (siswa/tutor/admin tambahan) melalui alur yang identik, jadi lebih masuk akal 1 fungsi reusable daripada 2 fungsi mirip di 2 dokumen berbeda. Ini juga membuka fitur "admin reset password siapa pun" secara seragam lintas role — penting karena sistem belum ada verifikasi email, jadi `resetPasswordRequest` (self-service, §4.4) belum sepenuhnya bisa diandalkan sebagai satu-satunya jalur "lupa password".

> **Kenapa fitur ini duluan:** Fase 1 Implementation Plan menempatkan Auth Module sebagai fondasi sebelum modul lain (Class Level, Course, dst) dibangun, karena hampir seluruh modul berikutnya bergantung pada `role` user dan session yang valid. Dokumen ini men-detailkan FR-1, FR-2, FR-4, FR-5, FR-6 (semua P0/P1, Tier 1) menjadi spesifikasi siap-implementasi: request/response tiap Server Action, validasi, error handling, RLS policy, dan halaman terkait.

---

## 1. Cakupan

### 1.1 In Scope (dokumen ini)
| FR | Deskripsi | Prioritas |
|---|---|---|
| FR-1 | Login dengan role terpisah (siswa/tutor/admin) | P0 |
| FR-2 | Admin membuat akun siswa (admin-created account), siswa wajib ganti password saat login pertama | P0 |
| FR-4 | Reset password untuk akun yang sudah ada | P1 |
| FR-5 | Middleware pembatasan akses berdasarkan role | P0 |
| FR-6 | Halaman pengaturan akun/profil dasar | P1 |
| FR-30/FR-31 (v1.1, sebagian) | `createUserAccount` sekarang generik untuk `student\|tutor\|admin` — UI-nya (tombol "Tambah Tutor"/"Tambah Admin", listing user) tetap di TSD-Admin-Dashboard.md, tapi Server Action-nya kanonik di sini | P0 |

### 1.2 Out of Scope (dokumen ini)
- **FR-3 (registrasi mandiri + pembayaran, Tier 2)** — dibahas ulang sebagai TSD terpisah di Fase 8, hanya disebut di sini untuk memastikan skema tidak menabrak (lihat §3.4)
- **UI listing/edit/nonaktifkan user, dashboard admin** — itu tetap di TSD-Admin-Dashboard.md (Fase 5); dokumen ini hanya menyediakan Server Action `createUserAccount`, `loginUser`, `changePassword`, dst sebagai fondasi yang dipanggil ulang dari sana
- **Penetapan `class_level_id` default saat akun siswa dibuat** — logic detailnya didetailkan di TSD Class Level Module (Fase 1b); TSD ini hanya mendefinisikan bahwa `createUserAccount` **memanggil** helper tersebut (khusus `role: student`), bukan mengimplementasikannya ulang.

---

## 2. Referensi Desain (ringkas dari SDD — lihat SDD untuk alasan lengkap)

- Model user: **1 tabel `users` + kolom `role`**, ditautkan ke `student_profiles` / `tutor_profiles` / `admin_profiles` (SDD §3.1, §7.3)
- Pola komunikasi: **Server Actions**, bukan REST API terpisah (SDD §4.1, §7.2)
- Middleware baca `role` dari session Supabase Auth, redirect ke `/unauthorized` jika akses tidak sah (SDD §5, FR-5 edge case)
- Tidak ada halaman "Daftar" publik di Tier 1 — folder `(auth)/register/` di struktur project ada tapi **tidak di-route/di-expose** sampai Fase 8 (Implementation Plan §5)

---

## 3. Data Model (Bagian Relevan — Sumber Kebenaran di SDD §3.2)

```prisma
model User {
  id                 String    @id @default(uuid())
  authId             String    @unique @map("auth_id") // FK ke Supabase auth.users
  name               String
  email              String    @unique
  phone              String?
  role               Role
  avatarUrl          String?   @map("avatar_url")
  isActive           Boolean   @default(true) @map("is_active")
  mustChangePassword Boolean   @default(true) @map("must_change_password") // v1.1 — dipindah dari StudentProfile, berlaku untuk semua role
  createdAt          DateTime  @default(now()) @map("created_at")

  studentProfile StudentProfile?
  tutorProfile   TutorProfile?
  adminProfile   AdminProfile?

  @@map("users")
}

enum Role {
  student
  tutor
  admin
}

model StudentProfile {
  id           String   @id @default(uuid())
  userId       String   @unique @map("user_id")
  classLevelId String   @map("class_level_id")
  createdAt    DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id])

  @@map("student_profiles")
}

model TutorProfile {
  id     String  @id @default(uuid())
  userId String  @unique @map("user_id")
  bio    String?

  user User @relation(fields: [userId], references: [id])

  @@map("tutor_profiles")
}

model AdminProfile {
  id     String @id @default(uuid())
  userId String @unique @map("user_id")

  user User @relation(fields: [userId], references: [id])

  @@map("admin_profiles")
}
```

### 3.1 Catatan Implementasi Skema
- `User.email` unik di level aplikasi (Prisma `@unique`) **dan** di Supabase `auth.users` — dua sumber kebenaran ini harus tetap sinkron; `createUserAccount` wajib cek keduanya sebelum insert (lihat §4.2 edge case).
- **`mustChangePassword` sekarang di tabel `users`, berlaku untuk semua role (v1.1 — revisi dari desain awal yang cuma taruh ini di `StudentProfile`).** Alasan perubahan: bootstrap admin pertama tetap manual (developer, lewat Supabase Dashboard), tapi **semua akun setelahnya — siswa, tutor, maupun admin tambahan — dibuat lewat UI oleh admin yang sudah ada** (`createUserAccount`, §4.2), jadi semua butuh flag ini dengan cara yang sama. Ini juga jadi fondasi fitur "reset password oleh admin" (TSD-Admin-Dashboard.md §4.6) yang berlaku ke semua role, bukan cuma siswa — penting karena sistem **belum** verifikasi email pengguna (tidak ada alur "lupa password via email" yang aman sepenuhnya tanpa verifikasi; admin-triggered reset jadi jalur cadangan utama untuk semua role selama verifikasi email belum ada).
- Tidak ada kolom `password` di tabel manapun — seluruh credential dikelola Supabase Auth (`auth.users`), aplikasi hanya menyimpan `authId` sebagai referensi.

### 3.2 Zod Schema (Validasi)

```typescript
// lib/validations/auth.ts
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

export const createUserAccountSchema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("student"),
    name: z.string().min(2, "Nama minimal 2 karakter").max(100),
    email: z.string().email("Format email tidak valid"),
    phone: z.string().min(9).max(15).optional(),
    classLevelId: z.string().uuid().optional(), // kosong = pakai default (lihat TSD Class Level)
  }),
  z.object({
    role: z.literal("tutor"),
    name: z.string().min(2, "Nama minimal 2 karakter").max(100),
    email: z.string().email("Format email tidak valid"),
    phone: z.string().min(9).max(15).optional(),
    bio: z.string().max(500).optional(),
  }),
  z.object({
    role: z.literal("admin"),
    name: z.string().min(2, "Nama minimal 2 karakter").max(100),
    email: z.string().email("Format email tidak valid"),
    phone: z.string().min(9).max(15).optional(),
  }),
]);

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().optional(), // optional: kosong saat alur wajib-ganti pertama kali
    newPassword: z
      .string()
      .min(8, "Password minimal 8 karakter")
      .regex(/[a-zA-Z]/, "Password harus mengandung huruf")
      .regex(/[0-9]/, "Password harus mengandung angka"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
  });

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(9).max(15).optional(),
  avatarUrl: z.string().url().optional(),
});

export const resetPasswordRequestSchema = z.object({
  email: z.string().email("Format email tidak valid"),
});
```

Validasi password (`min 8, kombinasi huruf-angka`) mengikuti FR-1 secara verbatim — diterapkan konsisten di `createUserAccount` (password sementara auto-generate juga wajib lolos aturan ini) dan `changePassword`.

---

## 4. Server Actions — Spesifikasi Detail

> Lokasi: `app/(auth)/**/actions.ts` untuk aksi yang dipicu dari halaman auth publik, `app/(admin)/users/actions.ts` untuk `createUserAccount`. Semua Server Action mengembalikan bentuk hasil konsisten: `{ success: boolean; data?: T; error?: { field?: string; message: string } }`.

### 4.1 `loginUser`

**FR terkait:** FR-1

| Aspek | Detail |
|---|---|
| Input | `{ email: string; password: string }` (divalidasi `loginSchema`) |
| Proses | 1. Validasi Zod → 2. `supabase.auth.signInWithPassword({ email, password })` → 3. Jika sukses, ambil `users.role` & `users.mustChangePassword` via Prisma berdasarkan `authId` dari session → 4. Kalau `mustChangePassword = true` (role apa pun sejak v1.1, bukan cuma siswa) → redirect ke `/change-password-required` sebelum ke dashboard mana pun → 5. Kalau tidak, redirect sesuai role: `student` → `/dashboard`, `tutor` → `/tutor/dashboard`, `admin` → `/admin/dashboard` |
| Output sukses | `{ success: true, data: { role: Role, mustChangePassword: boolean } }` |
| Error cases | `INVALID_CREDENTIALS` → "Email atau password salah" (pesan generik, **jangan** bedakan "email tidak ditemukan" vs "password salah" — mencegah user enumeration); `ACCOUNT_INACTIVE` → jika `users.isActive = false`, tampilkan "Akun Anda tidak aktif, hubungi admin" |
| Catatan keamanan | Rate limiting percobaan login idealnya di level Supabase Auth (bawaan) — tidak perlu implementasi custom di Tier 1, cukup dicatat sebagai asumsi (selaras A2/C1 di SDD) |

### 4.2 `createUserAccount` (generalisasi dari `createStudentAccount`, v1.1)

**FR terkait:** FR-2, FR-30, FR-31

| Aspek | Detail |
|---|---|
| Aktor | Admin only (divalidasi di level middleware + re-check di dalam action, jangan andalkan middleware saja) |
| Input | `createUserAccountSchema` (discriminated union `role`, lihat §3.2) |
| Proses | 1. Validasi Zod → 2. Cek email di `users` (Prisma) — sumber kebenaran aplikasi yang selalu sinkron dengan insert di langkah 4 → 3. Jika email sudah ada → return error **sebelum** lanjut (lihat edge case FR-2) → 4. Generate password sementara (random, lolos aturan `changePasswordSchema.newPassword`, misal 10 karakter alfanumerik) → 5. `supabase.auth.admin.createUser({ email, password: tempPassword, email_confirm: true })` → 6. Insert `users` (`role` sesuai input, `mustChangePassword: true` — **berlaku semua role sejak v1.1**) **dan** profile turunannya sesuai `role`: `student` → `student_profiles` (`classLevelId` = input atau hasil `getDefaultClassLevel()`); `tutor` → `tutor_profiles` (`bio` = input); `admin` → `admin_profiles` (tanpa field tambahan) — seluruhnya dalam **satu transaction Prisma** (`prisma.$transaction`) → 7. Return kredensial sementara ke UI admin (email + password) untuk dikirim manual |
| Output sukses | `{ success: true, data: { userId: string; email: string; tempPassword: string } }` |
| Error cases | `EMAIL_ALREADY_EXISTS` → field `email`, pesan "Email sudah digunakan" (ditampilkan inline di form, **realtime saat blur** sesuai edge case FR-2, bukan hanya setelah submit — perlu Server Action tambahan ringan `checkEmailAvailability(email)` yang dipanggil `onBlur` field email di form) |
| Rollback | Jika step 6 (insert Prisma) gagal **setelah** step 5 (`auth.admin.createUser` sukses), wajib panggil `supabase.auth.admin.deleteUser(authId)` di blok `catch` — mencegah akun Supabase Auth "yatim" tanpa data `users` terkait |
| Catatan | `tempPassword` **tidak** disimpan di database dalam bentuk apapun (bukan plaintext, bukan hash tambahan) — hanya dikembalikan sekali ke response untuk ditampilkan admin, konsisten dengan prinsip minimal data collection (SDD §8 NFR Compliance) |

> **Untuk TSD-Admin-Dashboard.md:** fungsi ini yang dipanggil dari form "Tambah Siswa"/"Tambah Tutor"/"Tambah Admin" di sana — tidak perlu didefinisikan ulang. UI form tetap boleh dipisah per role (field yang dibutuhkan beda: `classLevelId` vs `bio`), tapi Server Action di baliknya satu ini saja.

**Sub-action pendukung:**
```typescript
async function checkEmailAvailability(email: string): Promise<{ available: boolean }>
```
Dipanggil dari client (via `onBlur`), read-only, tidak butuh role check ketat (hanya dipakai di context form admin yang sudah di-guard middleware).

### 4.3 `changePassword`

**FR terkait:** FR-2 (alur wajib ganti), FR-6 (ganti password dari halaman settings)

| Aspek | Detail |
|---|---|
| Dua mode pemanggilan | **(a) Wajib ganti saat login pertama** — `currentPassword` tidak divalidasi (user login pakai password sementara yang valid di step sebelumnya, session sudah terbentuk); **(b) Ganti password sukarela dari halaman Settings** — `currentPassword` **wajib** diisi & diverifikasi ulang via `supabase.auth.signInWithPassword` sebelum update, untuk mencegah orang lain mengganti password dari sesi yang ditinggal terbuka |
| Input | `{ currentPassword?: string; newPassword: string; confirmPassword: string }` |
| Proses | 1. Validasi Zod (`changePasswordSchema`) → 2. Jika mode (b), verifikasi `currentPassword` → 3. `supabase.auth.updateUser({ password: newPassword })` → 4. Jika dipanggil dalam konteks mode (a) (dicek dari flag terpisah yang dikirim UI, bukan ditebak dari ada/tidaknya `currentPassword`), update `users.mustChangePassword = false` (v1.1 — sebelumnya di `student_profiles`, sekarang berlaku sama untuk role apa pun) |
| Output sukses | `{ success: true }` |
| Error cases | `WRONG_CURRENT_PASSWORD` (mode b) → "Password saat ini salah"; validasi Zod standar untuk `newPassword` tidak lolos aturan |

### 4.4 `updateProfile`

**FR terkait:** FR-6

| Aspek | Detail |
|---|---|
| Aktor | Semua role (siswa/tutor/admin), hanya bisa update profil sendiri (`auth.uid()` harus cocok, ditegakkan RLS — lihat §6) |
| Input | `{ name: string; phone?: string; avatarUrl?: string }` |
| Proses | 1. Validasi Zod → 2. Jika `avatarUrl` berasal dari upload baru, file sudah diupload ke Supabase Storage **sebelum** action ini dipanggil (action terpisah `uploadAvatar`, di luar cakupan detail TSD ini — pola sama seperti `uploadDocument` di SDD §4.2) → 3. Update row `users` sesuai `auth.uid()` |
| Output sukses | `{ success: true, data: { name, phone, avatarUrl } }` |
| Catatan | `email` **tidak** bisa diubah dari halaman ini di Tier 1 (email adalah identitas login di Supabase Auth; mengubahnya butuh alur verifikasi ulang yang di luar scope FR-6) — field email di form Settings ditampilkan read-only |

### 4.5 `resetPasswordRequest`

**FR terkait:** FR-4

| Aspek | Detail |
|---|---|
| Input | `{ email: string }` |
| Proses | `supabase.auth.resetPasswordForEmail(email, { redirectTo: <url halaman set-password-baru> })` |
| Output | **Selalu** `{ success: true }` terlepas email terdaftar atau tidak — mencegah user enumeration (pesan UI generik: "Jika email terdaftar, link reset akan dikirim") |
| Catatan | FR-4 eksplisit "khusus akun yang sudah ada" — tidak ada alur ini untuk membuat akun baru; ini murni reset credential untuk akun existing (siswa yang lupa password, atau tutor/admin) |
| Ketergantungan eksternal | Membutuhkan konfigurasi email sender di Supabase Auth (default Supabase SMTP cukup untuk Tier 1 volume kecil — dicatat sebagai item konfigurasi per klien di README replikasi, bukan kode) |

---

## 5. Middleware — Access Control

**FR terkait:** FR-5

```typescript
// middleware.ts (ringkasan logic, bukan implementasi penuh)
```

| Aspek | Detail |
|---|---|
| Trigger | Setiap request ke path di bawah `(student)`, `(tutor)`, `(admin)` route groups |
| Proses | 1. Baca session dari cookie via `@supabase/ssr` → 2. Jika tidak ada session valid → redirect `/login` → 3. Query/cache `role` user (lihat catatan performa di bawah) → 4. Cocokkan `role` dengan route group yang diakses (mapping statis, misal `(admin)` hanya untuk `role === 'admin'`) → 5. Jika tidak cocok → redirect `/unauthorized` (bukan error 500, sesuai edge case FR-5 eksplisit) |
| Redirect map | `student` mencoba akses `(admin)/*` atau `(tutor)/*` → `/unauthorized`; sebaliknya juga berlaku untuk semua kombinasi role×route-group yang tidak cocok |
| Catatan performa | Query `role` di setiap request middleware berpotensi menambah latency — mitigasi: simpan `role` di custom claim JWT Supabase Auth (`app_metadata`) saat akun dibuat/login, sehingga middleware baca dari session/JWT tanpa round-trip DB tambahan per request. Ini keputusan implementasi level TSD (bukan di SDD), dicatat di sini supaya tidak terlewat saat coding |
| Batas tanggung jawab middleware | Middleware ini **hanya** membatasi akses ke *halaman* berdasarkan role. Pembatasan akses ke *data* spesifik (misal tutor hanya lihat kursus miliknya, FR-41) **di luar cakupan TSD ini** — didetailkan di TSD Course & Tutor Assignment Module (Fase 2), sesuai catatan eksplisit SDD §5 baris Access Control Middleware |

### 5.1 Halaman `/unauthorized`
Halaman statis sederhana: pesan "Anda tidak memiliki akses ke halaman ini" + tombol kembali ke dashboard sesuai role (role diambil dari session yang tetap valid, hanya route-nya yang tidak sah).

---

## 6. RLS Policy (Level Database)

Selaras SDD §8 baris "Security — RLS aktif per role". Tabel yang disentuh fitur ini: `users`, `student_profiles`, `tutor_profiles`, `admin_profiles`.

| Tabel | Policy | Aturan |
|---|---|---|
| `users` | `select_own_or_admin` | `auth.uid() = auth_id OR EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.role = 'admin')` |
| `users` | `update_own` | `auth.uid() = auth_id` — user hanya bisa update row miliknya sendiri (dipakai `updateProfile`); insert/delete row `users` **tidak** lewat RLS client-side sama sekali — hanya lewat `createUserAccount` yang jalan di server dengan `service_role` key (bypass RLS by design, karena butuh insert atas nama user lain) |
| `student_profiles` | `select_own_or_staff` | Siswa: `auth.uid()` cocok dengan `user_id` terkait; Admin: selalu lolos; Tutor: **tidak** ada akses langsung ke tabel ini di fitur Auth (akses tutor ke data siswa baru relevan lewat `course_tutors`, di luar cakupan TSD ini) |
| `tutor_profiles`, `admin_profiles` | `select_own_or_admin` | Sama pola dengan `users` |

**Catatan implementasi:** `createUserAccount` dan operasi admin lain yang insert/update data atas nama user lain dijalankan via Server Action yang menggunakan Supabase `service_role` key (server-side only, tidak pernah di-expose ke client) — ini **melewati** RLS secara sengaja, bukan celah. RLS di atas berlaku untuk query yang dijalankan dengan `anon`/user JWT (langsung dari client atau Server Component yang membaca sebagai user login).

---

## 7. Halaman & Routing Terkait

| Route | Deskripsi | Akses |
|---|---|---|
| `app/(auth)/login/page.tsx` | Form login, memanggil `loginUser` | Publik |
| `app/(auth)/reset-password/page.tsx` | Form input email untuk `resetPasswordRequest` | Publik |
| `app/(auth)/reset-password/confirm/page.tsx` | Form set password baru (landing dari link email) | Publik (token-gated oleh Supabase) |
| `app/(auth)/change-password-required/page.tsx` | Halaman paksa ganti password (redirect otomatis jika `users.mustChangePassword = true`) — **berlaku semua role sejak v1.1**, bukan cuma siswa | Siapa pun yang baru login pertama kali |
| `app/(student)/settings/page.tsx`, `app/(tutor)/settings/page.tsx`, `app/(admin)/settings/page.tsx` | Halaman profil (FR-6) — bisa satu komponen shared, di-mount di 3 route group | Role masing-masing, data sendiri |
| `app/(admin)/users/new/page.tsx` | Form `createUserAccount` — 3 varian tombol (Siswa/Tutor/Admin), field beda sesuai `role`, UI detail di TSD-Admin-Dashboard.md | Admin only |
| `app/unauthorized/page.tsx` | Halaman FR-5 edge case | Siapapun dengan session valid tapi role tidak cocok |

---

## 8. Error & Pesan UI (Bahasa Indonesia, Konsisten)

| Kode Internal | Pesan ke User | Konteks |
|---|---|---|
| `INVALID_CREDENTIALS` | "Email atau password salah." | Login gagal |
| `ACCOUNT_INACTIVE` | "Akun Anda tidak aktif. Hubungi admin institusi." | Login, `users.is_active = false` |
| `EMAIL_ALREADY_EXISTS` | "Email sudah digunakan." | `createUserAccount`, realtime saat blur field email |
| `WRONG_CURRENT_PASSWORD` | "Password saat ini salah." | `changePassword` mode sukarela |
| `PASSWORD_TOO_WEAK` | "Password minimal 8 karakter, kombinasi huruf dan angka." | Validasi Zod, semua form password |
| — (generik) | "Jika email terdaftar, link reset password telah dikirim." | `resetPasswordRequest`, selalu ditampilkan terlepas hasil aktual |

---

## 9. Testing Checklist (Acceptance Criteria)

- [ ] Login dengan kredensial benar → redirect ke dashboard sesuai role (3 role diuji terpisah)
- [ ] Login dengan password salah → pesan generik, tidak membedakan "email tidak ada" vs "password salah"
- [ ] Login dengan akun `is_active = false` → ditolak dengan pesan spesifik
- [ ] Admin membuat akun siswa dengan email baru → sukses, `users` ter-insert dengan `must_change_password = true` dan `student_profiles` terkait ter-insert
- [ ] Admin membuat akun **tutor** dengan email baru → sukses, `tutor_profiles` ter-insert, `users.must_change_password = true` (v1.1)
- [ ] Admin membuat akun **admin** tambahan dengan email baru → sukses, `admin_profiles` ter-insert, `users.must_change_password = true` (v1.1)
- [ ] Admin membuat akun (role apa pun) dengan email yang sudah ada → error muncul **saat blur**, bukan hanya setelah submit (edge case FR-2)
- [ ] Simulasi kegagalan step insert Prisma setelah `auth.admin.createUser` sukses → akun Supabase Auth ter-rollback (tidak ada akun "yatim")
- [ ] Siswa/tutor/admin (akun baru mana pun) login pertama kali → dipaksa ke halaman ganti password, tidak bisa mengakses halaman lain sebelum ganti password selesai (v1.1 — sebelumnya cuma diuji untuk siswa)
- [ ] User mana pun ganti password dari Settings dengan `currentPassword` salah → ditolak
- [ ] Siswa/tutor mencoba akses route `(admin)/*` langsung via URL → redirect `/unauthorized`, bukan error 500
- [ ] `resetPasswordRequest` dengan email tidak terdaftar → tetap menampilkan pesan sukses generik (tidak bocorkan status email)
- [ ] RLS: user A tidak bisa `SELECT` row `users`/`student_profiles` milik user B lewat client langsung (query manual via Supabase client, bukan hanya lewat UI)
- [ ] RLS: admin bisa `SELECT` seluruh `users`/`student_profiles`

---

## 10. Dependencies & Urutan Kerja

- **Blocking dependency:** Setup Supabase project + Prisma schema pertama (Implementation Plan Fase 1, langkah 3) harus selesai sebelum TSD ini bisa diimplementasikan.
- **Diperlukan oleh:** Hampir semua TSD berikutnya (Class Level, Course, Quiz, Student Dashboard, Admin Dashboard, dst) bergantung pada middleware & session dari fitur ini — TSD ini secara sengaja dikerjakan lebih dulu (lihat catatan pembuka dokumen).
- **Soft dependency:** `createUserAccount` memanggil `getDefaultClassLevel()` dari Class Level Module (Fase 1b), khusus saat `role: student` — jika Class Level Module belum ada saat Auth Module mulai dikerjakan, gunakan stub sementara (`classLevelId` wajib diisi manual di form, bukan default otomatis) agar Fase 1 tidak ter-blok menunggu Fase 1b selesai penuh.
- **Dibutuhkan oleh (v1.1):** TSD-Admin-Dashboard.md (Fase 5) memanggil `createUserAccount` untuk form "Tambah Tutor"/"Tambah Admin", dan `resetUserPassword` di sana memakai pola generate password sementara yang sama seperti di §4.2.

---

*Dokumen ini adalah TSD pertama, mengikuti pola yang disebut Implementation Plan v2.2 (§ catatan v2.1) dan dirujuk dari SDD.md §4.2, §5, §6.1. TSD berikutnya (Class Level Module, lalu Course & Content Module) mengikuti urutan Fase di Implementation Plan.*
