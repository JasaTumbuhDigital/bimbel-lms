"use server"

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { prisma } from "@/lib/prisma";
import { loginSchema, changePasswordSchema, createStudentSchema } from "@/lib/validations/auth";

export type ActionResult<T = unknown> = {
    success: boolean;
    message?: string;
    error?: string;
    fieldErrors?: Record<string, string[]>;
    data?: T;
};

/**
 * 1. Action Login Pengguna (Admin, Tutor, Siswa)
 */
export async function loginAction(
    prevState: ActionResult | null,
    formData: FormData
): Promise<ActionResult<{ redirectTo: string; mustChangePassword?: boolean }>> {
    const rawData = {
        email: formData.get("email") as string,
        password: formData.get("password") as string,
    };
    // Validasi Input Zod
    const validation = loginSchema.safeParse(rawData);
    if (!validation.success) {
        return {
            success: false,
            error: "Input tidak valid",
            fieldErrors: validation.error.flatten().fieldErrors,
        };
    }
    const { email, password } = validation.data;
    const supabase = await createClient();
    // Autentikasi dengan Supabase Auth
    const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
            email,
            password,
        });
    if (authError || !authData.user) {
        return {
            success: false,
            error: "Email atau password salah",
        };
    }
    // Ambil profil pengguna dari database Prisma
    const user = await prisma.user.findUnique({
        where: { authId: authData.user.id },
        include: {
            studentProfile: true,
        },
    });
    if (!user || !user.isActive) {
        await supabase.auth.signOut();
        return {
            success: false,
            error: "Akun tidak ditemukan atau telah dinonaktifkan",
        };
    }
    // Cek flag wajib ganti password untuk Siswa
    if (user.role === "student" && user.studentProfile?.mustChangePassword) {
        return {
            success: true,
            message: "Login berhasil. Anda wajib memperbarui password.",
            data: {
                redirectTo: "/change-password",
                mustChangePassword: true,
            },
        };
    }
    // Tentukan rute tujuan berdasarkan Role
    let targetRoute = "/student";
    if (user.role === "admin") targetRoute = "/admin";
    else if (user.role === "tutor") targetRoute = "/tutor";
    return {
        success: true,
        data: {
            redirectTo: targetRoute,
            mustChangePassword: false,
        },
    };
}


/**
 * 2. Action Ganti Password Pengguna (Login Awal)
 */
export async function changePasswordAction(
    prevState: ActionResult | null,
    formData: FormData
): Promise<ActionResult<{ redirectTo: string }>> {
    const rawData = {
        newPassword: formData.get("newPassword") as string,
        confirmPassword: formData.get("confirmPassword") as string,
    };

    const validation = changePasswordSchema.safeParse(rawData);
    if (!validation.success) {
        return {
            success: false,
            error: "Validasi password gagal",
            fieldErrors: validation.error.flatten().fieldErrors,
        };
    }

    const supabase = await createClient();
    const {
        data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
        return {
            success: false,
            error: "Sesi tidak ditemukan, silakan login kembali",
        };
    }
    // Update password di Supabase Auth
    const { error: updateAuthError } = await supabase.auth.updateUser({
        password: validation.data.newPassword,
    });
    if (updateAuthError) {
        return {
            success: false,
            error: `Gagal memperbarui password: ${updateAuthError.message}`,
        };
    }
    // Update flag mustChangePassword menjadi false di Prisma DB
    const user = await prisma.user.findUnique({
        where: { authId: authUser.id },
    });
    if (user) {
        await prisma.studentProfile.update({
            where: { userId: user.id },
            data: { mustChangePassword: false },
        });
    }
    return {
        success: true,
        message: "Password berhasil diperbarui!",
        data: { redirectTo: "/student" },
    };
}

/**
 * 3. Action Logout
 */
export async function logoutAction() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login")
}

/**
 * 4. Action Registrasi Siswa Baru (Admin Portal)
 */
export async function createStudentAction(
    prevState: ActionResult | null,
    formData: FormData
): Promise<ActionResult> {
    const rawData = {
        name: formData.get("name") as string,
        email: formData.get("email") as string,
        phone: (formData.get("phone") as string) || undefined,
        classLevelId: formData.get("classLevelId") as string,
        password: formData.get("password") as string,
    };
    const validation = createStudentSchema.safeParse(rawData);
    if (!validation.success) {
        return {
            success: false,
            error: "Validasi data siswa gagal",
            fieldErrors: validation.error.flatten().fieldErrors,
        };
    }
    const { name, email, phone, classLevelId, password } = validation.data;
    const adminSupabase = createAdminClient();
    // 1. Buat User di Supabase Auth tanpa perlu verifikasi email
    const { data: authData, error: createAuthError } =
        await adminSupabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        });
    if (createAuthError || !authData.user) {
        return {
            success: false,
            error: `Gagal membuat akun auth: ${createAuthError?.message || "Unknown error"}`,
        };
    }
    // 2. Simpan User dan StudentProfile ke Database Prisma
    try {
        await prisma.user.create({
            data: {
                authId: authData.user.id,
                name,
                email,
                phone,
                role: "student",
                studentProfile: {
                    create: {
                        classLevelId,
                        mustChangePassword: true,
                    },
                },
            },
        });
        return {
            success: true,
            message: `Akun siswa ${name} berhasil dibuat!`,
        };
    } catch (dbError) {
        // Rollback: Hapus akun di Supabase Auth jika simpan DB gagal
        await adminSupabase.auth.admin.deleteUser(authData.user.id);
        return {
            success: false,
            error: "Gagal menyimpan data siswa ke database",
        };
    }
}
