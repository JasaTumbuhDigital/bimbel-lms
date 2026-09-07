"use server";

import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import {
    loginSchema,
    changePasswordSchema,
} from "@/lib/validations/auth";
import { getAuthenticatedUser } from "@/lib/data/auth";
import { redirect } from "next/navigation";
import { ActionResult } from "@/types/action";

/**
 * 1. Action Login Pengguna (Semua Role)
 */
export async function loginAction(
    prevState: ActionResult | null,
    formData: FormData
): Promise<ActionResult<{ redirectTo: string; mustChangePassword?: boolean }>> {
    const rawData = {
        email: formData.get("email") as string,
        password: formData.get("password") as string,
    };

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

    if (user.mustChangePassword) {
        return {
            success: true,
            message: "Login berhasil. Anda wajib memperbarui password",
            data: {
                redirectTo: "/change-password",
                mustChangePassword: true
            }
        }
    }

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

    const { newPassword } = validation.data;

    const user = await getAuthenticatedUser();
    if (!user) {
        return { success: false, error: "Sesi tidak ditemukan. Silakan login kembali." };
    }

    const supabase = await createClient();

    const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
    });
    if (updateError) {
        return { success: false, error: `Gagal mengupdate password: ${updateError.message}` };
    }

    await prisma.user.update({
        where: { id: user.id },
        data: { mustChangePassword: false },
    });

    return {
        success: true,
        message: "Password berhasil diperbarui!",
        data: { redirectTo: `/${user.role}` }, // Bisa dinamis sesuai role!
    };
}

/**
 * 3. Action Logout
 */
export async function logoutAction() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
}
