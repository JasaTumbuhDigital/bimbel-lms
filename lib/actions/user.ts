"use server"

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/utils/supabase/admin";
import {
    createUserAccountSchema,
    updateProfileSchema,
    updateUserAccountSchema
} from "@/lib/validations/user";
import { getAuthenticatedUser, checkAdminPermission } from "@/lib/data/auth";
import { UserRole } from "@prisma/client";
import { ActionResult } from "@/types/action";

/**
 * 1. Action Registrasi Akun Baru (Generik untuk Siswa, Tutor, Admin)
 */
export async function createUserAccountAction(
    prevState: ActionResult | null,
    formData: FormData
): Promise<ActionResult> {
    const admin = await checkAdminPermission();
    if (!admin) return { success: false, error: "Akses ditolak. Hanya Admin yang diizinkan." };

    const role = formData.get("role") as string;

    // Siapkan data mentah
    const rawData: any = {
        role,
        name: formData.get("name") as string,
        email: formData.get("email") as string,
        phone: (formData.get("phone") as string) || undefined,
        password: (formData.get("password") as string) || process.env.DEFAULT_PASSWORD || "Password123",
    };

    if (role === "student") {
        rawData.classLevelId = formData.get("classLevelId") as string;
    } else if (role === "tutor") {
        rawData.bio = formData.get("bio") as string;
    }

    // Validasi dengan Zod
    const validation = createUserAccountSchema.safeParse(rawData);
    if (!validation.success) {
        return {
            success: false,
            error: "Validasi data pengguna gagal",
            fieldErrors: validation.error.flatten().fieldErrors,
        };
    }

    const validData = validation.data;
    const adminSupabase = createAdminClient();

    // 1. Buat user di Supabase Auth
    const { data: authData, error: createAuthError } =
        await adminSupabase.auth.admin.createUser({
            email: validData.email,
            password: validData.password || process.env.DEFAULT_PASSWORD || "Password123",
            email_confirm: true,
        });

    if (createAuthError || !authData.user) {
        return {
            success: false,
            error: `Gagal membuat akun auth: ${createAuthError?.message || "Unknown error"}`,
        };
    }

    try {
        // 2. Siapkan relasi profile berdasarkan role
        const profileData: any = {};
        if (validData.role === "student") {
            profileData.studentProfile = { create: { classLevelId: validData.classLevelId } };
        } else if (validData.role === "tutor") {
            profileData.tutorProfile = { create: { bio: validData.bio } };
        } else if (validData.role === "admin") {
            profileData.adminProfile = { create: {} };
        }

        // 3. Simpan ke database Prisma (users dan profile terkait) sekaligus
        await prisma.user.create({
            data: {
                authId: authData.user.id,
                name: validData.name,
                email: validData.email,
                phone: validData.phone,
                role: validData.role as UserRole,
                mustChangePassword: true,
                ...profileData,
            },
        });

        revalidatePath("/admin/users");

        return {
            success: true,
            message: `Akun ${validData.role} (${validData.name}) berhasil dibuat!`,
        };
    } catch {
        // Rollback: Hapus user dari Supabase Auth jika gagal simpan di database kita
        await adminSupabase.auth.admin.deleteUser(authData.user.id);
        return {
            success: false,
            error: "Gagal menyimpan data pengguna ke database",
        };
    }
}

/**
 * 2. Action Reset Password Pengguna oleh Admin
 */
export async function resetUserPasswordAction(
    userId: string,
    authId: string
): Promise<ActionResult> {
    const admin = await checkAdminPermission();
    if (!admin) return { success: false, error: "Akses ditolak. Hanya Admin yang diizinkan." };
    try {
        const adminSupabase = createAdminClient();

        const newPassword = process.env.DEFAULT_PASSWORD || "Password123";

        const { error: resetAuthError } =
            await adminSupabase.auth.admin.updateUserById(authId, {
                password: newPassword,
            });

        if (resetAuthError) {
            return {
                success: false,
                error: `Gagal mereset password di Auth: ${resetAuthError.message}`,
            };
        }

        await prisma.user.update({
            where: { id: userId },
            data: { mustChangePassword: true },
        });

        revalidatePath("/admin/users");

        return {
            success: true,
            message: `Password berhasil direset menjadi: ${newPassword}. Pengguna wajib mengganti password saat login berikutnya.`,
        };
    } catch {
        return {
            success: false,
            error: "Gagal mereset password pengguna.",
        };
    }
}

/**
 * 3. Action Update Profil Pengguna (Nama & No HP)
 */
export async function updateProfileAction(
    prevState: ActionResult | null,
    formData: FormData
): Promise<ActionResult> {
    const rawData = {
        name: formData.get("name") as string,
        phone: (formData.get("phone") as string) || undefined,
    };
    const validation = updateProfileSchema.safeParse(rawData);
    if (!validation.success) {
        return {
            success: false,
            error: "Data profil tidak valid",
            fieldErrors: validation.error.flatten().fieldErrors,
        };
    }
    const { name, phone } = validation.data;

    // Gunakan helper bawaan untuk mengambil sesi
    const user = await getAuthenticatedUser();
    if (!user) {
        return { success: false, error: "Sesi tidak valid. Silakan login ulang." };
    }
    try {
        await prisma.user.update({
            where: { id: user.id }, // Langsung ambil ID database dari helper
            data: { name, phone },
        });
        // Revalidate halaman settings sesuai dengan role user yang sedang login
        revalidatePath(`/${user.role}/settings`);
        return {
            success: true,
            message: "Profil berhasil diperbarui!",
        };
    } catch {
        return {
            success: false,
            error: "Gagal memperbarui profil di database.",
        };
    }
}

/**
 * 4. Action Update Akun User oleh Admin (nama, email, phone, bio)
 */
export async function updateUserAccountAction(
    prevState: ActionResult | null,
    formData: FormData
): Promise<ActionResult> {
    const admin = await checkAdminPermission();
    if (!admin) return { success: false, error: "Akses ditolak. Hanya Admin yang diizinkan." };

    const rawData = {
        userId: formData.get("userId") as string,
        name: (formData.get("name") as string) || undefined,
        phone: (formData.get("phone") as string) || undefined,
        email: (formData.get("email") as string) || undefined,
        bio: (formData.get("bio") as string) || undefined,
    };

    const validation = updateUserAccountSchema.safeParse(rawData);
    if (!validation.success) {
        return {
            success: false,
            error: "Data tidak valid",
            fieldErrors: validation.error.flatten().fieldErrors,
        };
    }

    const { userId, name, phone, email, bio } = validation.data;

    try {
        // Ambil user target beserta authId-nya
        const targetUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, authId: true, email: true, role: true },
        });

        if (!targetUser) return { success: false, error: "User tidak ditemukan." };

        // Jika email diubah: update Supabase Auth DULU, baru Prisma
        // (kalau Supabase gagal, kita tidak lanjut ke Prisma — data tetap konsisten)
        if (email && email !== targetUser.email) {
            const adminSupabase = createAdminClient();
            const { error: authEmailError } = await adminSupabase.auth.admin.updateUserById(
                targetUser.authId,
                { email, email_confirm: true }
            );
            if (authEmailError) {
                return { success: false, error: `Gagal mengubah email di Auth: ${authEmailError.message}` };
            }
        }

        // Update data di tabel User
        await prisma.user.update({
            where: { id: userId },
            data: {
                ...(name ? { name } : {}),
                ...(phone ? { phone } : {}),
                ...(email ? { email } : {}),
                // Jika targetnya Tutor, update bio di TutorProfile sekaligus
                ...(bio && targetUser.role === "tutor"
                    ? { tutorProfile: { update: { bio } } }
                    : {}),
            },
        });

        revalidatePath("/admin/users");
        return { success: true, message: "Data pengguna berhasil diperbarui." };
    } catch {
        return { success: false, error: "Gagal memperbarui data pengguna." };
    }
}


/**
 * 5. Action Nonaktifkan / Aktifkan Akun User oleh Admin
 */
export async function toggleUserActiveAction(
    userId: string,
    isActive: boolean
): Promise<ActionResult> {
    const admin = await checkAdminPermission();
    if (!admin) return { success: false, error: "Akses ditolak. Hanya Admin yang diizinkan." };

    // Guard E4: Admin tidak boleh nonaktifkan akunnya sendiri
    if (userId === admin.id) {
        return { success: false, error: "Anda tidak dapat menonaktifkan akun Anda sendiri." };
    }

    try {
        await prisma.user.update({
            where: { id: userId },
            data: { isActive },
        });

        revalidatePath("/admin/users");
        return {
            success: true,
            message: isActive ? "Akun berhasil diaktifkan." : "Akun berhasil dinonaktifkan.",
        };
    } catch {
        return { success: false, error: "Gagal mengubah status akun." };
    }
}

