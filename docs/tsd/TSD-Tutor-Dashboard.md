# Technical Spec Document (TSD)
## Fitur: Dashboard Tutor

**Versi:** 1.1
**Tanggal:** 2 September 2026
**Terkait dokumen:** PRD.md (v2.4) · SDD.md (v1.5) · Implementation-Plan.md (v2.9) · TSD-Course-Content.md (v1.6, dependency erat) · TSD-Quiz.md (v3.0, dependency ringan) · TSD-Auth-ClassLevel.md (v1.2, dependency — HANYA baca) · TSD-Auth-Account-Management.md (v1.1, dependency)

> **Ringkasan perubahan v1.1 (perombakan mengikuti diskusi ulang):**
> 1. **Fitur pindah tingkatan dihapus total dari sisi tutor** — sekarang murni hak admin (TSD-Auth-ClassLevel.md v1.2, revert). Halaman `/tutor/students` di sini jadi **read-only**, tidak ada aksi apa pun lagi.
> 2. **Kelola per-course (termasuk daftar siswa enrolled per course) pindah ke TSD-Course-Content.md v1.6** — Course Detail sekarang 1 komponen shared untuk admin & tutor, dengan section "Siswa Enrolled" langsung di situ. Dokumen ini **tidak lagi** jadi tempat detail per-course, cuma ringkasan lintas-course.
> 3. Halaman `/tutor/courses` (list) & bekas `/tutor/explore` **digabung jadi satu** — didetailkan penuh di TSD-Course-Content.md §8.5, bukan di sini lagi (peta di §3 diperbarui).

---

## 1. Overview & Scope

### 1.1 Tujuan
Setelah perombakan, dokumen ini fokus jadi **1 hal saja**: halaman landing dashboard tutor (`/tutor/dashboard`) — ringkasan angka lintas-course, dan halaman "Siswa Saya" (`/tutor/students`) sebagai **daftar read-only** siswa lintas semua course yang diampu (pelengkap, karena breakdown per-course yang lebih detail sudah ada langsung di Course Detail masing-masing course).

§3 tetap dipertahankan sebagai peta rujukan kapabilitas tutor secara keseluruhan, supaya masih ada 1 tempat untuk orientasi cepat "apa aja yang bisa tutor lakukan" — walau sebagian besar detailnya sekarang tinggal di TSD-Course-Content.md.

Dokumen ini **bukan** tempat untuk FR-33 (dashboard analytics tutor — progress rendah, rata-rata nilai per kelas), itu eksplisit Tier 2 (Fase 12). Dan **bukan** tempat untuk pindah tingkatan siswa — itu murni TSD-Auth-ClassLevel.md, admin only.

### 1.2 FR yang Dicakup

| FR | Deskripsi | Status |
|---|---|---|
| FR-41 (bagian dashboard) | Landing page tutor dengan ringkasan kursus & siswa yang relevan dengannya | **Dokumen ini, §4.1 & §5.1** |
| FR-41 (bagian siswa) | Daftar siswa lintas-course milik tutor (read-only) | **Dokumen ini, §4.2 & §5.2** |
| FR-7, FR-40, FR-41 (course scoping, Course Detail, siswa per-course) | Manajemen kursus/modul/lesson, daftar siswa per-course, reviews | **TSD-Course-Content.md v1.6** — lihat peta di §3 |
| FR-11 | Builder kuis modul oleh tutor | **TSD-Quiz.md** — lihat peta di §3 |
| FR-37 | Pindah tingkatan siswa | **Bukan cakupan tutor** — murni admin, TSD-Auth-ClassLevel.md v1.2 |

---

## 2. Data Model
Tidak ada tabel baru. Modul ini murni 2 query ringan di atas skema yang sudah ada: `course_tutors`, `enrollments`, `student_profiles`.

---

## 3. Peta Kapabilitas Tutor (Rujukan, Bukan Spek Baru)

| Kapabilitas | Halaman | Detail di |
|---|---|---|
| Lihat ringkasan kursus & siswa (agregat lintas-course) | `/tutor/dashboard` | **Dokumen ini, §4.1 & §5.1** |
| Kelola kursus yang diampu (CRUD modul/lesson, kuis, publish) **dan** preview read-only kursus tutor lain — 1 halaman, 2 tab | `/tutor/courses` | TSD-Course-Content.md §5.3, §8.2, §8.5 |
| Lihat daftar siswa enrolled di 1 course tertentu + progress-nya | Di dalam Course Detail | TSD-Course-Content.md §5.5, §5.5b |
| Lihat review & rating course | Di dalam Course Detail | TSD-Course-Content.md §5.6 (reuse TSD-Student-Dashboard.md) |
| Buat & kelola kuis modul (post-test) | Di dalam Course Detail | TSD-Quiz.md §4, §7.1 |
| Lihat daftar siswa lintas-course (read-only, agregat) | `/tutor/students` | **Dokumen ini, §4.2 & §5.2** |
| Ganti password, edit profil sendiri | `/tutor/settings` | TSD-Auth-Account-Management.md §4.3, §4.4 |
| ~~Pindah tingkatan siswa~~ | — | **Bukan hak tutor** — TSD-Auth-ClassLevel.md v1.2, admin only |

---

## 4. Server Actions & Queries

### 4.1 `getTutorDashboardSummary` (query)

**FR terkait:** FR-41

**Alur logika:**
```ts
const myCourses = await prisma.course.findMany({
  where: { courseTutors: { some: { tutorProfile: { userId: currentUserId } } } },
  select: {
    id: true,
    title: true,
    _count: { select: { enrollments: true } },
  },
});

const totalKursusDiampu = myCourses.length;

// Siswa unik lintas semua course yang diampu (bukan sekadar jumlah enrollment,
// karena 1 siswa bisa enroll di lebih dari 1 course yang sama-sama diampu tutor ini)
const uniqueStudentIds = await prisma.enrollment.findMany({
  where: { courseId: { in: myCourses.map((c) => c.id) } },
  select: { studentId: true },
  distinct: ["studentId"],
});

const summary = {
  totalKursusDiampu,
  totalSiswaUnik: uniqueStudentIds.length,
  perCourse: myCourses.map((c) => ({ courseId: c.id, title: c.title, jumlahSiswa: c._count.enrollments })),
};
```
**G2 (keputusan, tidak berubah):** "Total Siswa" dihitung **unik** (distinct), bukan jumlah baris enrollment — supaya tutor yang mengampu 2 course dengan siswa yang sama tidak melihat siswa itu terhitung dobel.

### 4.2 `getMyStudents` (query, read-only)

**FR terkait:** FR-41

**Alur logika:**
```ts
const students = await prisma.studentProfile.findMany({
  where: {
    enrollments: { some: { course: { courseTutors: { some: { tutorProfile: { userId: currentUserId } } } } } },
  },
  include: {
    user: { select: { name: true, email: true } },
    classLevel: { select: { id: true, name: true } },
  },
  distinct: ["id"],
  orderBy: { user: { name: "asc" } },
});
```
Dipakai untuk halaman `/tutor/students` (§5.2) — **murni untuk dibaca**, tidak ada aksi apa pun di halaman ini (v1.1, beda dari v1.0 yang sempat punya dropdown pindah tingkatan). RLS `student_profiles_select` (TSD-Auth-ClassLevel.md v1.2 §3.2) sudah menegakkan scoping baca yang sama di level database — kolom SELECT-nya **dipertahankan** dari revisi sebelumnya (masih dipakai untuk kebutuhan baca ini), yang dihapus cuma kolom UPDATE-nya.

---

## 5. UI Requirements

### 5.1 Dashboard Tutor (`/tutor/dashboard`)
- 2 kartu ringkas: **Kursus Diampu**, **Total Siswa** (dari `getTutorDashboardSummary`)
- List singkat "Kursus Saya" di bawahnya (dari `perCourse`) — tiap baris: judul course, jumlah siswa, link ke Course Detail course tsb (`/tutor/courses/[id]`, TSD-Course-Content.md §8.2 — otomatis dapat mode edit karena tutor ini memang pengampunya)
- **Tidak ada** grafik/analytics apa pun di halaman ini — itu FR-33 (Tier 2)

### 5.2 Halaman Siswa Saya (`/tutor/students`) — read-only
- Table siswa dari `getMyStudents`: nama, email, tingkatan saat ini
- **Tidak ada aksi apa pun** di halaman ini (v1.1) — murni informasi. Kalau tutor perlu lihat progress siswa tertentu di course spesifik, arahkan ke Course Detail course terkait (TSD-Course-Content.md §5.5b, yang juga menampilkan progress per lesson) — halaman ini sengaja tetap ringan, cuma agregat lintas-course
- Tidak ada search/filter tambahan untuk MVP

---

## 6. Edge Cases & Validation Summary

| # | Kondisi | Perilaku yang Diharapkan |
|---|---|---|
| 1 | Tutor belum diampu kursus manapun (baru dibuat akunnya, belum di-assign admin ke course apa pun) | Dashboard tampil dengan angka 0/0, list "Kursus Saya" kosong dengan pesan ramah ("Belum ada kursus yang ditugaskan, hubungi admin") |
| 2 | Siswa yang sama enrolled di 2 course berbeda yang sama-sama diampu tutor ini | Muncul **sekali** saja di `getMyStudents` (constraint `distinct: ["id"]`) dan dihitung sekali di `totalSiswaUnik` (G2) |
| 3 | Tutor di-unassign dari suatu course (admin lewat FR-40) sementara dia sedang lihat `/tutor/students` | Data lama di browser jadi stale sampai refresh — diterima sebagai batasan Tier 1 (tidak ada realtime sync) |
| 4 | Tutor coba cari tombol/aksi pindah tingkatan di `/tutor/students` | Tidak ada — dihapus total dari UI sesuai keputusan v1.1, bukan disembunyikan/disabled tapi memang tidak pernah dirender |

---

## 7. Dependencies

| Dependency | Kebutuhan Spesifik di Modul Ini |
|---|---|
| TSD-Auth-ClassLevel.md (v1.2) | **Hanya** RLS `student_profiles_select` (baca), **tidak** memanggil `assignStudentToClassLevel` sama sekali (v1.1 — beda dari versi sebelumnya) |
| TSD-Course-Content.md (v1.6) | Model `Course`, `CourseTutors`, `Enrollment`; link ke Course Detail dari dashboard — **detail siswa per-course & reviews sekarang di sana, bukan di sini** |
| TSD-Auth-Account-Management.md (v1.1) | Halaman settings tutor (sudah ada, cukup di-link dari nav) |

---

## 8. Acceptance Criteria

- [ ] Dashboard tutor menampilkan jumlah kursus diampu & total siswa unik yang benar (diuji dengan tutor yang mengampu ≥2 course dengan siswa overlap)
- [ ] `/tutor/students` hanya menampilkan siswa yang enrolled di course milik tutor yang login — diuji dengan 2 akun tutor berbeda, pastikan datanya tidak bocor satu sama lain
- [ ] `/tutor/students` **tidak punya aksi apa pun** — dipastikan tidak ada tombol/dropdown yang memanggil `assignStudentToClassLevel` atau Server Action lain apa pun dari halaman ini
- [ ] Tutor tanpa course yang diampu melihat dashboard kosong dengan pesan yang jelas, bukan error
- [ ] RLS `student_profiles` SELECT (TSD-Auth-ClassLevel.md v1.2) diuji manual: tutor A tidak bisa `SELECT` profil siswa yang cuma enrolled di course tutor B

---

*TSD ini melengkapi (bukan menggantikan) TSD-Course-Content.md dan TSD-Quiz.md untuk sisi tutor. Sejak v1.1, dokumen ini jauh lebih ringkas karena sebagian besar kapabilitas tutor (kelola course, lihat siswa per-course, reviews) sudah terintegrasi langsung di TSD-Course-Content.md v1.6. Perubahan pada `course_tutors`/`enrollments` di dokumen lain harus tercermin di revisi berikutnya di sini.*
