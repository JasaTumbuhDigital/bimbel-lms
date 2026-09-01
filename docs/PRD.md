# Product Requirements Document (PRD)
## LMS Bimbel Template — [Nama Produk]

**Versi:** 2.2
**Tanggal:** 25 Agustus 2026
**Status:** Draft
**Owner:** [Nama kamu]

> **Ringkasan perubahan v2.2:** FR-38 diubah dari single tingkatan (nullable) jadi many-to-many + flag eksplisit `visible_to_all_levels`; kepemilikan kursus oleh tutor jadi many-to-many (co-teaching, FR-40); scoping akses tutor dipertegas (FR-41). FR-10 (dokumen PDF/PPT + preview) sempat dipertimbangkan pindah ke Tier 2, tapi **dikonfirmasi tetap di Tier 1** dengan skema Google Docs Viewer — library rendering khusus dicatat sebagai opsi upgrade custom quote, bukan default.
>
> **Ringkasan perubahan dari v1.0:** Produk direposisi dari "rebuild khusus untuk Zest College" menjadi **template LMS yang dijual berkali-kali sebagai project** ke berbagai institusi bimbel berbeda. Model bisnis: jual project (one-time, kepemilikan pindah ke klien) + opsional retainer maintenance — **bukan** SaaS subscription multi-tenant. Setiap klien mendapat deployment & database sendiri-sendiri (single-tenant per instance), bukan berbagi satu sistem.

---

## 1. Problem Statement

### 1.1 Konteks
Mayoritas bimbel skala kecil-menengah di Indonesia masih mengelola operasional (materi belajar, progress siswa, jadwal, pembayaran) secara manual lewat kombinasi WhatsApp grup, Excel, dan platform LMS generik (plugin WordPress seperti LearnDash/Tutor LMS) yang mahal secara lisensi berulang dan sulit dikustomisasi sesuai kebutuhan spesifik tiap institusi.

### 1.2 Dasar Observasi
Karena produk ini dikembangkan sebagai template yang dijual ke banyak institusi (bukan riset primer untuk satu klien spesifik), validasi kebutuhan dilakukan melalui:

| Sumber | Temuan |
|---|---|
| **Observasi produk eksisting (studi kasus Zest College)** | Sistem LMS berbasis WordPress plugin menampilkan dashboard siswa dasar (enrolled/active/completed courses), namun statis dan tanpa fitur pendukung operasional lanjutan (portal orang tua, notifikasi otomatis, live class terjadwal). Ini representatif untuk pola kebutuhan bimbel dengan skala serupa. |
| **Analisis kompetitor/produk sejenis** | Platform LMS umum (LearnDash, Tutor LMS, Google Classroom) menyediakan fitur belajar dasar, tapi minim fitur operasional bisnis bimbel (tagihan otomatis, laporan orang tua, kehadiran live class) — celah ini jadi peluang diferensiasi produk. |
| **Riset primer (wawancara/survei institusi riil)** | *Belum dilakukan — lihat Open Items §7.4. Direncanakan dilakukan secara oportunistik saat proses sales/demo ke calon klien pertama, bukan riset formal terpisah di muka.* |

> **Catatan jujur:** Karena keterbatasan akses ke banyak responden riil di tahap ini, validasi kebutuhan bersifat **iteratif melalui proses penjualan** — asumsi fitur di dokumen ini divalidasi ulang tiap kali ada calon klien nyata yang di-demo, dan PRD ini diperbarui berdasarkan feedback tersebut, bukan hanya diasumsikan benar dari awal.

### 1.3 Rumusan Masalah
Institusi bimbel skala kecil-menengah butuh sistem LMS yang **(a)** menggantikan proses manual (WA + Excel) dengan alur belajar & administrasi yang terstruktur, **(b)** cukup terjangkau untuk dibeli secara sekali bayar (bukan biaya lisensi/subscription berulang yang memberatkan bimbel kecil), dan **(c)** cukup fleksibel untuk dikustomisasi ringan (branding, fitur bertahap) tanpa perlu dibangun ulang dari nol setiap kali ada klien baru.

### 1.4 Mengapa Model Ini (Project-based, bukan SaaS)
- Target pasar (bimbel kecil-menengah) umumnya lebih familiar dan lebih nyaman dengan model **beli putus** (seperti beli software akuntansi/kasir) dibanding komitmen biaya bulanan tak terbatas waktu.
- Kepemilikan penuh oleh klien (source code, database, deployment) mengurangi kekhawatiran mereka soal ketergantungan vendor jangka panjang — ini jadi nilai jual pembeda dari kompetitor SaaS.
- Bagi kamu sebagai pembuat produk, pendekatan "1 codebase master, dikonfigurasi & di-deploy ulang per klien" tetap menjaga efisiensi build (tidak membangun dari nol tiap deal), sambil mempertahankan kesederhanaan arsitektur (tidak perlu kompleksitas multi-tenancy).

---

## 2. Goals

### 2.1 Goals Produk (untuk kamu sebagai pembuat/penjual)

**Objective 1: Memiliki template produk yang siap dijual & direplikasi cepat**
- KR1: Codebase Tier 1 (Base MVP) selesai dan bisa di-deploy ke instance baru dalam < 1 hari kerja (setup config + deploy), dalam [target waktu pengerjaan awal — isi sesuai kapasitasmu]
- KR2: Proses "kustomisasi ringan" (branding, logo, warna, nama institusi) untuk klien baru dapat dilakukan tanpa mengubah struktur kode inti (config-driven)
- KR3: Berhasil menutup 1 deal klien pertama (baik gratis/diskon untuk portofolio awal, atau berbayar) dalam [target waktu — misal 3 bulan setelah MVP selesai]

**Objective 2: Validasi produk lewat klien nyata, bukan asumsi**
- KR1: Setiap klien baru yang onboarding memberikan minimal 1 sesi feedback terstruktur (bisa informal) yang didokumentasikan dan digunakan untuk revisi PRD
- KR2: Fitur Tier 2 diprioritaskan berdasarkan permintaan riil dari klien Tier 1 yang ingin upgrade, bukan spekulasi di awal

### 2.2 Goals Fungsional (untuk institusi/klien yang memakai produk)

> Catatan: karena tiap klien adalah institusi berbeda dengan baseline operasional masing-masing, target di bawah ini bersifat **target kualitatif umum** yang divalidasi ulang per klien, bukan angka pasti universal.

- Siswa memiliki visibilitas progress belajar yang jelas (bukan lagi manual dari WA/ingatan tutor)
- Admin bimbel dapat mengelola pendaftaran & kursus dari satu sistem terpusat, menggantikan kombinasi WA + Excel
- (Tier 2) Orang tua & admin mendapat otomatisasi komunikasi (reminder, laporan) yang mengurangi beban kerja manual staf bimbel

---

## 3. Target Users (Persona)

Persona di bawah tetap relevan sebagai **pengguna akhir di dalam tiap instance klien** (bukan pembeli produk itu sendiri — pembeli produk adalah pemilik/admin institusi bimbel, dibahas terpisah di §3.5).

### Persona 1: Siswa
- **Peran:** Peserta didik yang akunnya dibuatkan oleh admin bimbel (Tier 1) atau melalui pendaftaran+pembayaran (Tier 2)
- **Pain points:** Info jadwal/materi tersebar di WA, tidak ada visibilitas progress belajar sendiri, kesulitan menemukan rekaman materi lama
- **Kapan pakai produk:** Sebelum kelas (cek jadwal & materi), saat/setelah kelas (nonton materi, kerjakan kuis)
- **Device utama:** Smartphone

### Persona 2: Orang Tua *(relevan mulai Tier 2)*
- **Peran:** Penanggung jawab pembayaran & pemantau progress anak
- **Pain points:** Tidak ada visibilitas objektif progress anak, tidak ada reminder tagihan otomatis
- **Kapan pakai produk:** Awal bulan (cek tagihan), berkala (cek laporan progress)
- **Device utama:** Smartphone, lebih nyaman lewat WA daripada aplikasi terpisah

### Persona 3: Tutor
- **Peran:** Mengelola materi & kuis untuk kursus yang **dia ampu** (satu kursus bisa diampu lebih dari satu tutor sekaligus), dan (Tier 2) presensi & Q&A. Akses & data yang terlihat **terbatas ke kursus/siswa yang relevan dengannya saja** — bukan seluruh institusi.
- **Pain points:** Laporan progress manual di Excel, materi tersebar di berbagai platform
- **Device utama:** Laptop (input konten), smartphone (cek cepat)

### Persona 4: Admin Bimbel
- **Peran:** Mengelola operasional **level institusi** — pendaftaran siswa & tutor, kategori tingkatan, penugasan tutor ke kursus, dan (Tier 2) verifikasi pembayaran. Melihat & mengelola **seluruh** kursus/siswa/tutor, bukan terbatas seperti tutor.
- **Pain points:** Rekonsiliasi manual, tidak ada dashboard ringkas kondisi operasional
- **Device utama:** Laptop

### Persona 5: Pemilik/Pengambil Keputusan Institusi *(pembeli produk)*
- **Peran:** Pihak yang memutuskan membeli sistem ini — biasanya bukan yang mengoperasikan harian, tapi yang peduli pada biaya, kepemilikan, dan ROI
- **Pain points:** Biaya lisensi SaaS berulang terasa berat untuk bimbel skala kecil, khawatir ketergantungan vendor jangka panjang jika berhenti bayar subscription
- **Kapan berinteraksi:** Saat proses sales/demo, saat negosiasi harga & scope maintenance
- **Faktor keputusan:** Harga sekali bayar, kejelasan apa yang didapat (source code + deployment sendiri), opsi maintenance terpisah yang tidak memaksa

---

## 4. User Stories

### Siswa
- **US-1:** Sebagai siswa, saya ingin melihat daftar kursus yang saya ikuti beserta progress-nya, supaya saya tahu materi mana yang harus saya lanjutkan.
- **US-2:** Sebagai siswa, saya ingin menandai materi yang sudah saya pelajari sebagai "selesai", supaya saya tahu materi mana yang masih perlu saya pelajari.
- **US-2a (Tier 2):** Sebagai siswa, saya ingin progress tonton video saya tersimpan otomatis berdasarkan durasi yang benar-benar saya tonton, supaya progress belajar saya tercatat lebih akurat tanpa saya perlu menandai manual.
- **US-3:** Sebagai siswa, saya ingin mengerjakan kuis dan langsung melihat hasil, supaya saya bisa belajar mandiri dari kesalahan saya.
- **US-4:** Sebagai siswa, saya ingin menyimpan kursus ke wishlist, supaya saya bisa mengambilnya nanti.
- **US-5:** Sebagai siswa, saya ingin memberi rating & ulasan pada kursus yang sudah saya ikuti, supaya siswa lain dapat referensi.
- **US-6 (Tier 2):** Sebagai siswa, saya ingin bertanya ke tutor lewat fitur Q&A per materi, supaya pertanyaan saya tidak tenggelam di WA grup.
- **US-7 (Tier 2):** Sebagai siswa, saya ingin mendapat sertifikat otomatis setelah menyelesaikan kursus, supaya saya punya bukti pencapaian.
- **US-8 (Tier 2):** Sebagai siswa, saya ingin menerima notifikasi WA sebelum jadwal kelas dimulai, supaya saya tidak ketinggalan.

### Orang Tua *(Tier 2)*
- **US-9:** Sebagai orang tua, saya ingin melihat laporan progress & kehadiran anak saya, supaya saya bisa memantau tanpa harus bertanya langsung.
- **US-10:** Sebagai orang tua, saya ingin menerima reminder tagihan otomatis via WA, supaya saya tidak terlambat membayar.

### Tutor
- **US-11:** Sebagai tutor, saya ingin mengunggah materi (video, dokumen) dan menyusunnya per modul, supaya siswa bisa belajar terstruktur.
- **US-12:** Sebagai tutor, saya ingin membuat kuis pilihan ganda dengan penilaian otomatis, supaya saya tidak perlu koreksi manual.
- **US-13 (Tier 2):** Sebagai tutor, saya ingin melihat dashboard progress seluruh siswa di kelas saya, supaya saya bisa mengidentifikasi siswa yang tertinggal.
- **US-14 (Tier 2):** Sebagai tutor, saya ingin mencatat kehadiran siswa di setiap sesi live class, supaya datanya otomatis masuk ke laporan orang tua.
- **US-14a:** Sebagai tutor, saya ingin hanya melihat kursus & siswa yang relevan dengan saya (kursus yang saya ampu), supaya saya tidak perlu menyaring data institusi yang tidak berkaitan dengan saya.

### Admin
- **US-15:** Sebagai admin, saya ingin membuat akun siswa secara manual (Tier 1), supaya saya bisa mengontrol siapa saja yang punya akses sesuai pendaftaran offline yang sudah terverifikasi.
- **US-16 (Tier 2):** Sebagai admin, saya ingin siswa/orang tua bisa mendaftar & membayar sendiri secara online, supaya proses pendaftaran lebih efisien untuk institusi dengan volume pendaftaran tinggi.
- **US-17:** Sebagai admin, saya ingin mengelola kursus, modul, dan materi dari satu dashboard, supaya saya tidak bergantung ke banyak platform terpisah.
- **US-18:** Sebagai admin, saya ingin melihat dashboard ringkas (jumlah siswa, kursus, kelas berjalan), supaya saya bisa memantau kondisi operasional dengan cepat.
- **US-19 (Tier 2):** Sebagai admin, saya ingin melihat & memverifikasi status pembayaran otomatis, supaya saya tidak perlu rekonsiliasi manual bukti transfer.
- **US-20:** Sebagai admin, saya ingin membuat kategori kelas/tingkatan sesuai struktur institusi saya (misal per angkatan atau per level kemampuan), supaya materi bisa disusun sesuai jenjang siswa.
- **US-21:** Sebagai admin atau tutor, saya ingin memindahkan siswa dari satu tingkatan ke tingkatan lain, supaya siswa yang naik level otomatis mendapat akses ke materi yang sesuai.
- **US-22:** Sebagai admin/tutor, saya ingin menentukan apakah suatu kursus khusus untuk tingkatan tertentu (satu atau beberapa) atau terbuka untuk semua siswa, supaya materi umum (misal pengumuman atau materi dasar) tetap bisa diakses semua orang tanpa perlu diduplikasi per tingkatan.
- **US-23:** Sebagai admin, saya ingin menugaskan satu atau lebih tutor sebagai pengampu suatu kursus, supaya beberapa tutor bisa berbagi tanggung jawab mengajar kursus yang sama (co-teaching).

---

## 5. Functional Requirements

> **Prioritas:** P0 = wajib MVP, P1 = penting tapi bisa menyusul rilis awal, P2 = nice-to-have.
> **Tier:** T1 = termasuk paket Base MVP, T2 = termasuk paket Growth (fase lanjutan/upsell).

### 5.1 Autentikasi & Manajemen Akun

- **FR-1 (P0, T1):** Sistem harus mendukung login dengan role terpisah: siswa, tutor, admin.
  - Validasi: email harus unik & format valid, password minimal 8 karakter kombinasi huruf-angka.
  - Edge case: jika email sudah terdaftar, tampilkan pesan error spesifik.
- **FR-2 (P0, T1):** **Registrasi akun siswa dilakukan oleh admin** (admin-created accounts) — tidak ada halaman "Daftar" publik yang bisa diakses siswa secara mandiri di Tier 1.
  - Alur: admin input data siswa (nama, email/no HP) di dashboard admin → sistem generate akun dengan password sementara → kredensial dikirim manual oleh admin (WA/email) ke siswa → siswa wajib ganti password saat login pertama kali.
  - Edge case: jika admin input email yang sudah terdaftar, tampilkan error saat itu juga (bukan setelah submit form penuh).
- **FR-3 (P0, T2):** **Registrasi & enrollment siswa terbuka lewat alur pembayaran** — siswa/orang tua bisa mendaftar mandiri melalui landing page, memilih kursus, dan menyelesaikan pembayaran; akun otomatis aktif setelah pembayaran terverifikasi (lihat §5.7 untuk detail integrasi payment gateway).
  - Edge case: jika pembayaran pending/gagal, akun tetap dibuat tapi berstatus "belum aktif" — tidak bisa akses materi sampai pembayaran terverifikasi.
- **FR-4 (P1, T1):** Sistem harus mendukung reset password (khusus untuk akun yang sudah ada — bukan bagian dari alur registrasi mandiri).
- **FR-5 (P0, T1):** Sistem harus membatasi akses halaman berdasarkan role (middleware) — siswa tidak bisa akses dashboard tutor/admin dan sebaliknya.
  - Edge case: akses tidak sah harus redirect ke halaman "Unauthorized", bukan error 500.
- **FR-6 (P1, T1):** Sistem harus punya halaman pengaturan akun/profil dasar (ubah nama, foto profil, password).

### 5.1a Manajemen Kelas/Tingkatan (Class Level)

> **Catatan desain:** Meskipun secara nomor FR ditempatkan belakangan (FR-36–38), fitur ini bersifat **struktural** — menyentuh logika akses di hampir seluruh modul kursus & dashboard siswa. Wajib dibangun sejak Tier 1 meskipun UI-nya seminimal mungkin, karena menambahkannya belakangan (setelah modul kursus jadi) akan memaksa perombakan query akses di banyak tempat.

- **FR-36 (P0, T1):** Admin harus bisa membuat, mengedit, dan menghapus kategori kelas/tingkatan (misal: "Kelas A", "Tingkat Dasar", "Kelas 7 SMP") — nama & deskripsi bebas ditentukan admin sesuai struktur institusinya masing-masing.
  - Edge case: tingkatan yang masih punya siswa aktif tidak boleh dihapus langsung — tampilkan peringatan, minta admin pindahkan siswa dulu atau non-aktifkan (soft-delete) tingkatan tersebut.
- **FR-37 (P0, T1):** Setiap siswa harus memiliki satu tingkatan/kelas aktif. Saat akun siswa dibuat (FR-2 di Tier 1, atau FR-3 di Tier 2), siswa otomatis masuk ke tingkatan default (dapat dikonfigurasi admin, misal tingkatan paling awal). Admin atau tutor harus bisa memindahkan siswa ke tingkatan lain kapan saja.
  - Validasi: siswa tidak boleh berada di lebih dari satu tingkatan aktif dalam satu waktu.
- **FR-38 (P0, T1):** Satu kursus dapat dikaitkan ke **satu, beberapa, atau tanpa tingkatan spesifik**. Admin harus secara eksplisit menandai suatu kursus "berlaku untuk semua tingkatan" (bukan disimpulkan otomatis dari relasi yang kosong) — mencegah kursus tanpa tingkatan yang ditentukan secara tidak sengaja jadi terbuka ke semua siswa. Sistem hanya menampilkan ke siswa kursus yang terkait tingkatannya atau yang ditandai berlaku untuk semua tingkatan.
  - Edge case: saat kursus dipublish, sistem wajib memvalidasi minimal salah satu terpenuhi — kursus punya minimal 1 tingkatan terkait, **atau** ditandai "semua tingkatan". Kursus tidak boleh dipublish tanpa keduanya (mencegah kursus "tidak terlihat siapa pun" karena lupa diisi).

### 5.2 Manajemen Kursus & Materi

- **FR-7 (P0, T1):** Admin harus bisa membuat kursus dengan struktur modul → sub-materi (video/dokumen/kuis), dan menugaskan satu atau lebih tutor sebagai pengampu kursus tersebut (lihat FR-40). Tutor hanya dapat membuat/mengedit kursus yang dirinya menjadi salah satu pengampunya.
  - Edge case: kursus yang belum punya tutor pengampu tetap bisa dibuat/dikelola oleh admin, tapi tidak akan muncul di dashboard tutor mana pun sampai ditugaskan.
- **FR-40 (P0, T1):** Admin harus bisa menugaskan (assign) atau melepas (unassign) satu atau lebih tutor sebagai pengampu suatu kursus, kapan saja, tanpa memengaruhi data siswa/progress yang sudah ada di kursus tersebut.
- **FR-41 (P0, T1):** Halaman manajemen kursus Tutor (`/tutor/courses`) hanya menampilkan kursus yang ia ampu. Untuk melihat/mereview kursus lain di institusi, Tutor dapat menggunakan halaman **Eksplorasi Kursus** (`/tutor/explore`) secara *Read-Only*. Di dalam kursus yang diampu, Tutor Pembuat (`createdBy`) bertindak sebagai **Tutor Utama (Owner)** yang memiliki hak penuh termasuk pengaturan akses, publish, dan penambahan tutor pendamping. Tutor lain yang ditambahkan bertindak sebagai **Tutor Pendamping (Co-Tutor)** yang hanya berhak melakukan CRUD pada Modul & Materi.
- **FR-8 (P0, T1):** Sistem harus mendukung embed video YouTube (unlisted) sebagai materi.
  - Validasi: URL harus format YouTube valid.
- **FR-9 (P0, T1):** Sistem harus melacak status penyelesaian materi per siswa lewat **penandaan manual** — siswa menekan tombol "Tandai Selesai" setelah mempelajari suatu materi (video/dokumen).
  - Edge case: siswa dapat membatalkan tanda selesai (toggle) jika ingin mengulang materi tersebut dengan sengaja.
  - Catatan: pendekatan ini dipilih untuk kesederhanaan & kecepatan development di Tier 1. Data yang dihasilkan bersifat self-reported (bergantung kejujuran siswa), bukan verifikasi objektif dari durasi tonton — lihat FR-39 untuk versi otomatis di Tier 2.
- **FR-39 (P1, T2):** Sistem harus melacak progress tonton video secara **otomatis** berdasarkan durasi aktual yang ditonton siswa (via YouTube IFrame API), dan menandai materi "selesai" otomatis jika ≥90% durasi ditonton — menggantikan penandaan manual di FR-9 sebagai opsi yang lebih terverifikasi untuk institusi yang butuh data progress lebih akurat (misal untuk laporan ke orang tua).
  - Edge case: progress tersimpan otomatis secara berkala (auto-save), bukan hanya saat video selesai — mengantisipasi siswa menutup browser mendadak.
- **FR-10 (P1, T1):** Sistem harus mendukung upload dokumen materi (PDF, PPT) dengan preview langsung di browser tanpa perlu download.
  - Catatan implementasi: skema awal pakai Google Docs Viewer untuk preview PPT/PPTX (lihat TSD Course & Content Module §6.4). Jika ada klien yang butuh pendekatan lain (misal keberatan file dikirim ke pihak ketiga untuk preview), evaluasi library rendering khusus (`@cyntler/react-doc-viewer`, `pptx-viewer`, `pptx-renderer`, `pptx-glimpse`) sebagai custom quote — bukan bagian template standar.

### 5.3 Kuis
- **FR-11 (P0, T1):** Tutor harus bisa membuat kuis pilihan ganda dengan penilaian otomatis.
- **FR-12 (P0, T1):** Siswa harus bisa melihat riwayat percobaan kuis (skor & waktu) di dashboard mereka.
  - Edge case: keputusan bisnis default — skor final yang ditampilkan adalah **skor tertinggi** dari seluruh percobaan (dapat dikonfigurasi per klien jika diperlukan).
- **FR-13 (P1, T2):** Sistem harus mendukung kuis dengan timer, otomatis submit saat waktu habis, dan menampilkan pembahasan soal setelah selesai.

### 5.4 Dashboard Siswa
- **FR-14 (P0, T1):** Dashboard harus menampilkan ringkasan real-time: jumlah kursus enrolled, aktif, selesai.
- **FR-15 (P1, T1):** Dashboard harus menampilkan wishlist kursus yang belum diambil.
- **FR-16 (P1, T1):** Siswa harus bisa memberi rating & ulasan (review) pada kursus yang sudah diikuti; ulasan tampil di halaman detail kursus.
- **FR-17 (P2, T2):** Dashboard harus menampilkan leaderboard/badge sebagai elemen gamifikasi.

### 5.5 Portal Orang Tua *(T2)*
- **FR-18 (P0, T2):** Orang tua harus bisa melihat progress belajar & kehadiran anak per kursus (akun orang tua ditautkan ke satu atau lebih akun siswa).
- **FR-19 (P0, T2):** Orang tua harus bisa melihat status & riwayat pembayaran anak.
- **FR-20 (P1, T2):** Sistem harus mengirim laporan progress berkala otomatis via WA ke orang tua.

### 5.6 Live Class & Kehadiran *(T2)*
- **FR-21 (P1, T2):** Tutor/admin harus bisa membuat jadwal live class dengan link Zoom/Google Meet.
- **FR-22 (P1, T2):** Sistem harus mengirim notifikasi WA ke siswa sebelum kelas dimulai.
- **FR-23 (P1, T2):** Tutor harus bisa mencatat kehadiran siswa per sesi (hadir/izin/alpa).

### 5.7 Pembayaran & Tagihan *(T2)*
- **FR-24 (P0, T2):** Sistem harus terintegrasi payment gateway (Midtrans/Xendit) untuk pembayaran kursus/SPP, dengan auto-enroll setelah pembayaran terverifikasi.
  - Edge case: status order harus jelas ("Menunggu Pembayaran" bukan langsung "Gagal") dan siswa/orang tua bisa retry.
- **FR-25 (P1, T2):** Sistem harus mengirim reminder tagihan otomatis via WA sebelum jatuh tempo.
- **FR-26 (P0, T2):** Admin harus bisa melihat & memverifikasi status pembayaran seluruh siswa dari satu dashboard.

### 5.8 Sertifikat *(T2)*
- **FR-27 (P1, T2):** Sistem harus generate sertifikat PDF otomatis saat siswa menyelesaikan 100% materi kursus.

### 5.9 Q&A / Forum *(T2)*
- **FR-28 (P1, T2):** Siswa bisa bertanya per materi/kursus, tutor bisa menjawab; terlihat oleh siswa lain di kursus yang sama.

### 5.10 Dashboard Admin
- **FR-29 (P0, T1):** Admin harus punya dashboard ringkas: total siswa, jumlah kursus, kelas berjalan.
- **FR-30 (P0, T1):** Admin harus bisa CRUD kursus, modul, materi, dan user (siswa/tutor).
- **FR-31 (P0, T1):** Admin harus bisa membuat & mengelola akun siswa secara manual (lihat FR-2).
- **FR-32 (P1, T2):** Dashboard admin harus menampilkan revenue tracking & laporan bisnis ringkas.
- **FR-33 (P1, T2):** Dashboard tutor harus menampilkan analytics siswa (progress rendah, rata-rata nilai per kelas).

### 5.11 Landing Page & Blog
- **FR-34 (P0, T1):** Landing page harus menampilkan hero section, statistik institusi, listing kursus dengan filter kategori, dan testimoni — dengan branding (nama, logo, warna) yang mudah dikonfigurasi per klien (config-driven, bukan hardcoded).
- **FR-35 (P0, T1):** Sistem harus punya halaman blog/artikel dengan SEO metadata dasar per artikel (title, description, og-image).

---

## 6. Non-Functional Requirements

| Kategori | Requirement |
|---|---|
| **Performance** | Landing page harus mencapai skor Lighthouse Performance ≥ 90 (mobile), First Contentful Paint < 1.5 detik |
| **Performance** | Response time operasi standar < 500ms di p95 (di luar operasi berat seperti generate PDF) |
| **Scalability** | Sistem harus mampu menangani minimal 100–200 concurrent users per instance klien tanpa degradasi signifikan — wajar untuk skala bimbel kecil-menengah single-tenant |
| **Availability** | Uptime target 99% per instance klien (di luar maintenance terjadwal), realistis dengan Vercel + Supabase free/pro tier |
| **Security** | RLS Supabase wajib aktif di semua tabel berisi data personal; proteksi berbasis role (siswa/orang tua/tutor/admin) |
| **Security** | Antisipasi dasar XSS & CSRF; kredensial (API key payment gateway, WA gateway) tidak boleh hardcoded, wajib via environment variable |
| **Usability** | Semua halaman utama harus responsif penuh di smartphone (mobile-first) |
| **Data Integrity** | Status "selesai" materi (Tier 1, manual) harus tersimpan segera saat siswa menekan tombol, tanpa risiko hilang akibat refresh. Untuk Tier 2 (progress otomatis dari video), auto-save berkala wajib agar progress tidak hilang meski terjadi disconnect mendadak |
| **Portability/Replicability** | Branding (nama, logo, warna, kontak) harus dapat dikonfigurasi tanpa mengubah kode inti — mendukung model deploy-ulang-per-klien |
| **Maintainability** | Struktur folder & konvensi kode konsisten, didokumentasikan di README, agar proses kustomisasi & maintenance untuk tiap instance klien tetap cepat dilakukan |
| **Compliance** | Data pribadi siswa (termasuk yang di bawah umur) disimpan sesuai prinsip minimal data collection |

---

## 7. Scope

### 7.1 In Scope — Tier 1 (Base MVP, rilis pertama & paket dasar yang dijual)
- Autentikasi role-based, **registrasi akun siswa oleh admin** (bukan self-register) — FR-1, FR-2, FR-4, FR-5, FR-6
- **Manajemen kelas/tingkatan siswa** (dibangun sejak Tier 1 karena bersifat struktural) — FR-36, FR-37, FR-38
- Manajemen kursus & materi video (YouTube unlisted) + dokumen, dengan progress tracking **manual** (siswa menandai selesai) — FR-7 s/d FR-10, FR-40, FR-41 (kecuali FR-9 versi otomatis, lihat FR-39 di Tier 2)
- Kuis pilihan ganda dengan penilaian otomatis — FR-11, FR-12
- Dashboard siswa: ringkasan, wishlist, reviews — FR-14, FR-15, FR-16
- Dashboard admin: CRUD kursus/user, manajemen akun manual, ringkasan operasional — FR-29 s/d FR-31
- Landing page dengan branding config-driven — FR-34
- Blog/artikel dengan SEO dasar — FR-35

### 7.2 In Scope — Tier 2 (Growth, paket upsell/lanjutan)
- **Registrasi & enrollment mandiri lewat pembayaran** (menggantikan alur admin-only Tier 1) — FR-3
- **Progress tracking video otomatis** berdasarkan durasi tonton (menggantikan penandaan manual Tier 1 sebagai opsi lebih akurat) — FR-39
- Portal orang tua — FR-18, FR-19, FR-20
- Live class terjadwal & presensi — FR-21, FR-22, FR-23
- Payment gateway & tagihan otomatis — FR-24, FR-25, FR-26
- Sertifikat otomatis — FR-27
- Forum Q&A — FR-28
- Kuis dengan timer & pembahasan — FR-13
- Dashboard admin/tutor lanjutan (revenue, analytics) — FR-32, FR-33
- Leaderboard/gamifikasi — FR-17

### 7.3 Out of Scope (Tidak masuk Tier 1 maupun Tier 2 — potensi custom quote terpisah di masa depan)
- Multi-cabang dalam satu institusi
- White-label penuh dengan custom domain per cabang
- Single Sign-On (SSO) ke sistem internal klien
- API akses eksternal untuk integrasi ke sistem lain milik klien
- Aplikasi mobile native
- Multi-tenancy (satu sistem melayani banyak institusi sekaligus) — **secara sadar tidak dipakai**; setiap klien mendapat deployment & database terpisah sepenuhnya

### 7.4 Open Items
- Validasi fitur & harga dengan calon klien nyata pertama (pendekatan iteratif lewat proses sales, lihat §1.2)
- Kebijakan default skor kuis final (tertinggi vs terakhir) — sudah ditetapkan default di FR-12, tapi perlu dikonfirmasi apakah perlu dibuat configurable per klien
- Cakupan & durasi maintenance retainer pasca-serah-terima project (perlu didefinisikan di kontrak, bukan bagian teknis PRD ini)
- Kejelasan kepemilikan infrastruktur: apakah klien pakai akun Supabase/Vercel mereka sendiri, atau tetap dikelola oleh kamu dengan biaya hosting terpisah — ini perlu diputuskan per deal dan didokumentasikan di serah terima

---

*Dokumen ini adalah living document — diperbarui berdasarkan feedback dari proses sales/demo ke klien nyata, bukan hanya asumsi di atas kertas.*
