import { z } from "zod";

// 1. Skema Validasi Admin Membuat Akun (Semua Role)
export const createUserAccountSchema = z.discriminatedUnion("role", [
    z.object({
        role: z.literal("student"),
        name: z.string().min(2, "Nama minimal 2 karakter").max(100),
        email: z.string().email("Format email tidak valid"),
        phone: z.string().min(9).max(15).optional(),
        classLevelId: z.string().min(1, "Tingkatan kelas wajib dipilih"),
        password: z.string().min(6, "Password awal minimal 6 karakter").optional(),
    }),
    z.object({
        role: z.literal("tutor"),
        name: z.string().min(2, "Nama minimal 2 karakter").max(100),
        email: z.string().email("Format email tidak valid"),
        phone: z.string().min(9).max(15).optional(),
        bio: z.string().max(500).optional(),
        password: z.string().min(6, "Password awal minimal 6 karakter").optional(),
    }),
    z.object({
        role: z.literal("admin"),
        name: z.string().min(2, "Nama minimal 2 karakter").max(100),
        email: z.string().email("Format email tidak valid"),
        phone: z.string().min(9).max(15).optional(),
        password: z.string().min(6, "Password awal minimal 6 karakter").optional(),
    }),
]);

// 2. Skema Validasi Update Profil
export const updateProfileSchema = z.object({
    name: z.string().min(2, "Nama minimal 2 karakter").max(100),
    phone: z.string().optional(),
});

// 3. Skema Validasi Update Akun User oleh Admin
export const updateUserAccountSchema = z.object({
    userId: z.string().uuid("User ID tidak valid"),
    name: z.string().min(2, "Nama minimal 2 karakter").max(100).optional(),
    phone: z.string().min(9).max(15).optional(),
    email: z.string().email("Format email tidak valid").optional(),
    bio: z.string().max(500).optional(), // hanya relevan kalau target adalah Tutor
});
