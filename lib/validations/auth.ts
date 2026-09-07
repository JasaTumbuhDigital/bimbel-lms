import { z } from "zod";

// 1. Skema Validasi Form Login
export const loginSchema = z.object({
    email: z
        .string()
        .min(1, "Email wajib diisi")
        .email("Format email tidak valid"),
    password: z
        .string()
        .min(1, "Password wajib diisi")
        .min(6, "Password minimal 6 karakter"),
});

// 2. Skema Validasi Form Ganti Password Pertama Kali
export const changePasswordSchema = z
    .object({
        newPassword: z
            .string()
            .min(8, "Password baru minimal 8 karakter")
            .regex(/[A-Z]/, "Password baru harus mengandung minimal 1 huruf besar")
            .regex(/[a-z]/, "Password baru harus mengandung minimal 1 huruf kecil")
            .regex(/[0-9]/, "Password baru harus mengandung minimal 1 angka"),
        confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi"),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: "Konfirmasi password tidak cocok dengan password baru",
        path: ["confirmPassword"],
    });
