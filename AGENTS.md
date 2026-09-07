<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project Guidelines & Architecture Ground Truth

You are an expert full-stack developer building **LMS Bimbel Template** using Next.js (App Router), Supabase, Prisma, and Tailwind CSS.

## Konteks
Seluruh dokumen perencanaan ada di folder @directory:docs — PRD.md, SDD.md,
Implementation-Plan.md, dan TSD per fitur (TSD-Auth-Account-Management.md,
TSD-Auth-ClassLevel.md, TSD-Course-Content.md, TSD-Quiz.md,
TSD-Student-Dashboard.md, TSD-Admin-Dashboard.md, plus TSD-Exam-Standalone-DRAFT.md
yang statusnya ditunda, abaikan dulu). Implementation-Plan.md adalah roadmap
fase-nya, TSD per fitur berisi spek teknis siap-coding tiap modul.

PENTING: dokumen-dokumen itu adalah hasil perencanaan, bukan laporan progres
kode. Jangan asumsikan sesuatu sudah terimplementasi hanya karena TSD-nya
sudah selesai ditulis — cek langsung isi codebase (folder app/, prisma/,
package.json, dst) untuk tahu benar-benar sudah sampai mana secara kode.

## Tech Stack
- Runtime: Bun (dikelola via mise)
- Next.js (App Router) + TypeScript
- Prisma + Supabase (Postgres, Auth, Storage, RLS)
- Tailwind + shadcn/ui, React Hook Form + Zod

## Aku masih baru di Next.js/React
Jadi cara kerja yang aku mau:
1. Jangan langsung generate banyak file/modul sekaligus. Kerjakan satu
   langkah kecil dalam satu waktu.
2. Untuk tiap langkah: kasih tahu file apa yang perlu dibuat/diubah, isinya
   apa, dan KENAPA (apa fungsinya, gimana cara kerjanya) — tapi aku yang
   ketik/terapkan sendiri, bukan kamu yang langsung nulis ke file. Anggap
   kamu mentor yang nuntun aku, bukan yang ngerjain semua.
3. Sebelum lanjut ke langkah berikutnya, tunggu konfirmasi dariku kalau
   langkah sebelumnya sudah aku terapkan.
4. Kalau ada bagian TSD yang menurutmu ambigu atau butuh keputusan
   (misal ada beberapa cara implementasi), tanya dulu, jangan menebak.

## Best Practice
Sebelum bikin kode apa pun (Prisma schema, Supabase RLS/client, komponen
React/Next), cek dulu skill yang sudah kutambahkan (skill prisma, skill
supabase, skill react) dan dokumentasi Next.js bawaan di node_modules —
ikuti pola/konvensi yang mereka anjurkan, jangan asal dari ingatan umum.

## Prioritas
Untuk sekarang, utamakan FUNGSIONALITAS jalan dengan benar dulu sesuai
spek TSD (validasi, RLS, alur data). UI boleh minimal/polos — jangan buang
waktu ke styling/detail visual yang belum perlu di tahap ini.

## Mulai dari mana
Tolong pelajari dulu semua dokumen di docs/, lalu cek state codebase
aktual sekarang (project sudah di-init atau masih kosong?). Setelah itu,
laporkan ke aku: sejauh mana progres kode aktual dibanding roadmap
Implementation-Plan.md, dan apa langkah kecil pertama yang paling masuk
akal untuk mulai (biasanya Fase 0/Fase 1 kalau project masih kosong).
Jangan mulai coding dulu sebelum aku konfirmasi urutannya.