# Technical Spec Document (TSD)
## Fitur: Auth & Class Level Management

**Versi:** 1.1
**Tanggal:** 5 September 2026
**Terkait dokumen:** PRD.md (v2.4) · SDD.md (v1.4) · Implementation-Plan.md (v2.6)
**Scope Implementation Plan:** Fase 1 (Setup Fondasi & Auth) + Fase 1b (Manajemen Kelas/Tingkatan)

> **Ringkasan perubahan v1.1:** Disesuaikan dengan arsitektur Auth baru (SDD v1.4, TSD-Auth-Account-Management v1.1) — `mustChangePassword` dipindah ke tabel `users` (berlaku semua role), fitur pembuatan akun digeneralisasi jadi `createUserAccount` di TSD Auth, dan redirect ganti password menjadi `/change-password-required`.

---

## 1. Overview & Scope

### 1.1 Tujuan
Spesifikasi siap-coding untuk dua modul fondasi yang harus berdiri sebelum modul lain dibangun: **Auth Module** (login, admin-created account, ganti password) dan **Class Level Module** (CRUD tingkatan, penempatan & perpindahan siswa antar tingkatan).

### 1.2 FR yang Dicakup

| FR | Deskripsi |
|---|---|
| FR-1 | Login role-based (siswa, tutor, admin) |
| FR-2 | Registrasi akun siswa oleh admin |
| FR-4 | Reset password |
| FR-5 | Middleware pembatasan akses berdasarkan role |
| FR-6 | Pengaturan akun/profil dasar |
| FR-36 | CRUD kategori kelas/tingkatan |
| FR-37 | Penempatan tingkatan default & perpindahan siswa antar tingkatan |
| FR-38 | Relasi many-to-many kursus↔tingkatan + flag `visible_to_all_levels` |

### 1.3 Out of Scope (Dibahas di TSD Terpisah)
- **Sebagian besar fitur Auth** (`createUserAccount`, `changePassword`, form login) sekarang diuraikan secara kanonik di **TSD-Auth-Account-Management.md v1.1** (dokumen ini akan mereferensikan ke sana untuk menghindari duplikasi).
- Penugasan tutor ke kursus (`course_tutors`) — bagian dari TSD Course & Content Module (Fase 2), karena baru relevan saat entity `courses` dibangun
- Penerapan filter `course_class_levels` ke query listing kursus — helper query didefinisikan di sini (§5.3), tapi pemakaiannya di halaman kursus dibahas di TSD Course & Content Module
- Registrasi mandiri (self-register) — FR-3, Tier 2

---

## 2. Data Model

### 2.1 Prisma Schema

```prisma
enum UserRole {
  student
  tutor
  admin
}

model User {
  id         String   @id @default(uuid())
  authId     String   @unique @map("auth_id") // references Supabase auth.users.id
  name       String
  email      String   @unique
  phone      String?
  role       UserRole
  avatarUrl  String?  @map("avatar_url")
  isActive   Boolean  @default(true) @map("is_active")
  createdAt  DateTime @default(now()) @map("created_at")

  studentProfile StudentProfile?
  tutorProfile   TutorProfile?
  adminProfile   AdminProfile?

  @@map("users")
}

model StudentProfile {
  id                 String   @id @default(uuid())
  userId             String   @unique @map("user_id")
  classLevelId       String   @map("class_level_id")
  createdAt          DateTime @default(now()) @map("created_at")

  user       User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  classLevel ClassLevel @relation(fields: [classLevelId], references: [id], onDelete: Restrict)

  @@map("student_profiles")
}

model TutorProfile {
  id     String  @id @default(uuid())
  userId String  @unique @map("user_id")
  bio    String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("tutor_profiles")
}

model AdminProfile {
  id     String @id @default(uuid())
  userId String @unique @map("user_id")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("admin_profiles")
}

model ClassLevel {
  id          String   @id @default(uuid())
  name        String
  description String?
  isActive    Boolean  @default(true) @map("is_active")
  sortOrder   Int      @default(0) @map("sort_order")
  createdAt   DateTime @default(now()) @map("created_at")

  students StudentProfile[]

  @@map("class_levels")
}
```

> Catatan: model `Course`, `CourseClassLevel`, `CourseTutor` **tidak** didefinisikan penuh di TSD ini (milik TSD Course & Content Module), tapi relasi ke `ClassLevel` akan ditambahkan di sana mengikuti pola SDD §3.2.

### 2.2 Constraint & Index Penting
- `users.email` — unique constraint (validasi FR-1)
- `users.auth_id` — unique constraint, 1:1 dengan Supabase `auth.users`
- `student_profiles.user_id` — unique (1 user = maksimal 1 student profile)
- `student_profiles.class_level_id` — `onDelete: Restrict` (bukan Cascade/SetNull) — **secara sengaja mencegah penghapusan `ClassLevel` di level database selama masih direferensikan**, selaras dengan FR-36 edge case (tingkatan dengan siswa aktif tidak boleh dihapus). Validasi aplikasi (§4.2) harus tetap ada di layer Server Action untuk memberi pesan error yang jelas ke admin, bukan mengandalkan database constraint error mentah.

---

## 3. RLS Policies (Supabase)

> Policy ditulis dalam bentuk pseudo-SQL, siap diterjemahkan ke `CREATE POLICY` saat implementasi. `auth.uid()` merujuk ke `authId` di tabel `users`.

### 3.1 Tabel `users`
```sql
-- SELECT: user bisa baca datanya sendiri; admin bisa baca semua
CREATE POLICY users_select ON users FOR SELECT
USING (
  auth_id = auth.uid()
  OR EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.role = 'admin')
);

-- UPDATE: user hanya bisa update datanya sendiri (untuk FR-6 profile settings);
-- admin bisa update siapa saja (untuk FR-2 create/manage akun)
CREATE POLICY users_update ON users FOR UPDATE
USING (
  auth_id = auth.uid()
  OR EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.role = 'admin')
);

-- INSERT: hanya admin (lewat Server Action createUserAccount, bukan self-register di T1)
CREATE POLICY users_insert ON users FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.role = 'admin')
);
```

### 3.2 Tabel `student_profiles`
```sql
-- SELECT: siswa baca profilnya sendiri; admin baca semua; tutor TIDAK punya akses langsung
-- di sini (scoping tutor ke siswa "miliknya" via course_tutors didefinisikan di TSD Course Module)
CREATE POLICY student_profiles_select ON student_profiles FOR SELECT
USING (
  user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  OR EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.role = 'admin')
);

-- UPDATE (termasuk pindah class_level_id): hanya admin
CREATE POLICY student_profiles_update ON student_profiles FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.role = 'admin')
  OR user_id = (SELECT id FROM users WHERE auth_id = auth.uid()) -- siswa hanya untuk kasus tertentu, lihat catatan di bawah
);
```
> **Catatan penting:** Policy `student_profiles_update` di atas sengaja **tidak** membedakan kolom mana yang boleh diubah siswa vs admin (RLS Postgres bekerja di level row, bukan kolom). Siswa **tidak boleh** bisa mengubah `class_level_id` sendiri — ini harus ditegakkan di **layer Server Action** (validasi eksplisit: field apa saja yang boleh masuk payload dari request siswa), bukan hanya mengandalkan RLS. Lihat §4.1 `updateProfile` untuk detail pembatasan field.

### 3.3 Tabel `class_levels`
```sql
-- SELECT: semua role authenticated bisa baca (siswa perlu tahu nama tingkatannya,
-- tutor/admin perlu untuk keperluan assignment)
CREATE POLICY class_levels_select ON class_levels FOR SELECT
USING (auth.uid() IS NOT NULL);

-- INSERT, UPDATE, DELETE: hanya admin (FR-36)
CREATE POLICY class_levels_write ON class_levels FOR ALL
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.role = 'admin')
);
```

---

## 4. Server Actions — Auth Module

> **Catatan (v1.1):** Seluruh logika pembuatan akun (`createUserAccount`), login, dan manajemen password (`changePassword`, `resetPasswordRequest`) **telah dipindahkan sepenuhnya** ke spesifikasi kanonik **TSD-Auth-Account-Management.md v1.1**.
>
> Server Action `updateProfile` tetap relevan dan didefinisikan di bawah.

### 4.1 `updateProfile`

**FR terkait:** FR-6

**Input:**
```ts
const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().regex(/^08\d{8,11}$/).optional(),
  avatarUrl: z.string().url().optional(),
});
```

**Pembatasan eksplisit:** Schema ini **hanya** menerima `name`, `phone`, `avatarUrl` — field lain (`role`, `email`, `isActive`, dan untuk siswa: `classLevelId`) **tidak ada di schema ini sama sekali**, sehingga secara struktural tidak mungkin diubah lewat action ini walau RLS row-level policy mengizinkan update. Perubahan email/role dilakukan lewat action admin terpisah.

---

## 5. Server Actions — Class Level Module

### 5.1 `createClassLevel`

**FR terkait:** FR-36

**Input:**
```ts
const createClassLevelSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(255).optional(),
  sortOrder: z.number().int().min(0).default(0),
});
```

**Validasi tambahan:** `name` harus unik di antara tingkatan yang `isActive = true` (mencegah admin membuat 2 tingkatan bernama sama secara tidak sengaja) — dicek di Server Action, bukan constraint database (supaya nama yang sama boleh dipakai ulang setelah tingkatan lama di-nonaktifkan).

### 5.2 `deactivateClassLevel`

**FR terkait:** FR-36 edge case

**Alur logika:**
1. Cek jumlah `student_profiles` dengan `classLevelId` ini yang terhubung ke user `isActive = true`
2. Jika > 0 → return error `CLASS_LEVEL_HAS_ACTIVE_STUDENTS` dengan jumlah siswa terdampak (untuk ditampilkan di UI: "Tidak bisa menonaktifkan, masih ada 12 siswa di tingkatan ini")
3. Jika 0 → set `isActive = false` (soft-delete, bukan hard delete row — sesuai SDD §3.3)

### 5.3 `assignStudentToClassLevel`

**FR terkait:** FR-37

**Input:**
```ts
const assignStudentSchema = z.object({
  studentProfileId: z.string().uuid(),
  newClassLevelId: z.string().uuid(),
});
```

**Alur logika:**
1. Validasi `newClassLevelId` merujuk ke tingkatan yang `isActive = true` (tidak bisa pindahkan siswa ke tingkatan yang sudah dinonaktifkan)
2. Update `student_profiles.classLevelId`
3. **Tidak ada riwayat perpindahan tersimpan di Tier 1** (sesuai PRD §7.3 Out of Scope — log historis perpindahan kelas ditunda ke Tier 2 jika dibutuhkan)

### 5.4 Helper: `getAccessibleClassLevelFilter` (dipakai modul lain, bukan Server Action langsung)

**FR terkait:** FR-38 (fondasi query, dipakai penuh di TSD Course & Content Module)

```ts
// lib/class-level/access-filter.ts
// Menghasilkan kondisi Prisma `where` untuk memfilter courses sesuai tingkatan siswa.
// Dipakai ulang oleh Course Module — didefinisikan di sini karena secara konsep
// "milik" Class Level Module (SDD §5), walau baru dipakai nyata di Fase 2.

export function getAccessibleCourseFilter(studentClassLevelId: string) {
  return {
    OR: [
      { visibleToAllLevels: true },
      { classLevels: { some: { classLevelId: studentClassLevelId } } },
    ],
  };
}
```

---

## 6. UI Requirements

### 6.1 Halaman `/admin/class-levels`
- Table list tingkatan (nama, jumlah siswa aktif, status aktif/nonaktif)
- Tombol tambah tingkatan → dialog form (nama, deskripsi, urutan)
- Tombol nonaktifkan → jika ada siswa aktif, tampilkan pesan error dari §5.2 langsung di tempat (bukan generic toast)

### 6.2 Halaman `/admin/users/students` (list & pindah tingkatan)
- Table siswa dengan kolom tingkatan saat ini
- Dropdown inline per row untuk pindah tingkatan (memanggil `assignStudentToClassLevel`) — tidak perlu halaman terpisah, cukup interaksi inline sesuai PRD §5.1a ("UI seminimal mungkin")

> **Catatan (v1.1):** Halaman UI untuk otentikasi seperti `/login`, `/change-password-required`, form pembuatan akun `/admin/users/new`, dan pengaturan profil kini sepenuhnya terpusat di **TSD-Auth-Account-Management.md v1.1**.

---

## 7. Middleware — Access Control

```
middleware.ts (pseudocode alur)

1. Baca session dari Supabase (via @supabase/ssr)
2. Jika tidak ada session & route bukan /login atau /reset-password → redirect /login
3. Jika ada session:
   a. Ambil role dari tabel users (via query ringan/cache session)
   b. Jika route diawali /admin/* dan role != admin → redirect /unauthorized
   c. Jika route diawali /tutor/* dan role != tutor → redirect /unauthorized
   d. Jika route diawali /student/* dan role != student → redirect /unauthorized
   e. Jika users.mustChangePassword = true DAN route bukan /change-password-required 
      → paksa redirect ke /change-password-required (berlaku SEMUA role, v1.1)
```

**Catatan performa:** Poin 3a (ambil role & mustChangePassword) sebaiknya disimpan di JWT custom claim Supabase (bukan query database di setiap request middleware) untuk memenuhi NFR response time — detail setup custom claim didokumentasikan saat implementasi (di luar cakupan spesifikasi ini, catatan teknis untuk developer).

---

## 8. Edge Cases & Validation Summary

| # | Kondisi | Perilaku yang Diharapkan |
|---|---|---|
| 1 | Admin input email yang sudah terdaftar saat create akun siswa | Error inline langsung di field email, tidak submit ke Supabase Auth sama sekali |
| 2 | Siswa mencoba akses `/admin/*` atau `/tutor/*` langsung via URL | Redirect ke `/unauthorized`, bukan error 500 |
| 3 | User (role apa pun) dengan `mustChangePassword = true` mencoba akses halaman lain sebelum ganti password | Dipaksa redirect ke `/change-password-required` oleh middleware |
| 4 | Admin coba nonaktifkan tingkatan yang masih punya siswa aktif | Ditolak, pesan error menyebutkan jumlah siswa terdampak |
| 5 | Admin pindahkan siswa ke tingkatan yang sudah nonaktif | Ditolak di validasi Server Action (`INVALID_CLASS_LEVEL` atau setara) |
| 6 | Proses pembuatan akun gagal di tengah jalan (auth berhasil, insert profil gagal) | Rollback transaksi aplikasi + best-effort hapus user auth yang terlanjur dibuat |
| 7 | User reset password dengan email yang tidak terdaftar | Response sukses generik tetap ditampilkan (anti-enumeration), tidak ada email terkirim di baliknya (natural behavior Supabase) |
| 8 | Siswa mencoba mengubah `classLevelId` lewat form profil | Tidak mungkin terjadi secara struktural — field itu tidak ada di schema `updateProfile` |

---

## 9. Dependencies

| Dependency | Kebutuhan Spesifik di Modul Ini |
|---|---|
| `@supabase/ssr` | Session management di Server Component & Middleware |
| Supabase Admin API (`auth.admin.*`) | `createUser` untuk FR-2 — memerlukan `service_role` key, **hanya dipanggil dari Server Action**, tidak pernah expose ke client |
| `react-hook-form` + `zod` | Seluruh form di §6 |
| `prisma` | Query & transaksi (`$transaction` khusus untuk FR-2, lihat §4.1) |

---

## 10. Acceptance Criteria (Checklist Siap Dianggap Selesai)

- [ ] Admin bisa CRUD tingkatan, termasuk gagal-nonaktifkan yang masih ada siswa aktif dengan pesan jelas
- [ ] Admin bisa pindahkan siswa antar tingkatan lewat UI inline
- [ ] Semua RLS policy `class_levels` dan `student_profiles` sudah diterapkan dan diuji
- [ ] Helper `getAccessibleCourseFilter` sudah ada dan siap dipakai TSD Course & Content Module berikutnya
- [ ] *(Acceptance criteria selebihnya tentang Auth dipindah ke TSD-Auth-Account-Management.md)*

---

*TSD ini merujuk ke SDD.md untuk konteks arsitektur & alasan desain. Perubahan pada SDD (terutama §3, §5, §7.6–7.7) harus tercermin di revisi TSD ini.*
