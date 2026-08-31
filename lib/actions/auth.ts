"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { prisma } from "@/lib/prisma";
import {
    loginSchema,
    changePasswordSchema,
    createStudentSchema,
} from "@/lib/validations/auth";
import { redirect } from "next/navigation";

export type ActionResult<T = unknown> = {
    success: boolean;
    message?: string;
    error?: string;
    fieldErrors?: Record<string, string[]>;
    data?: T;
};

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
    const supabase = await createClient();

    const {
        data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
        return {
            success: false,
            error: "Sesi tidak ditemukan. Silakan login kembali.",
        };
    }

    const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
    });

    if (updateError) {
        return {
            success: false,
            error: `Gagal mengupdate password: ${updateError.message}`,
        };
    }

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
    redirect("/login");
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
        password: (formData.get("password") as string) || "Password123",
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

        revalidatePath("/admin/students");
        return {
            success: true,
            message: `Akun siswa ${name} berhasil dibuat!`,
        };
    } catch (dbError) {
        await adminSupabase.auth.admin.deleteUser(authData.user.id);
        return {
            success: false,
            error: "Gagal menyimpan data siswa ke database",
        };
    }
}

/**
 * 5. Fetch Seluruh Daftar Siswa (Admin Only)
 */
export async function getStudents() {
    try {
        const students = await prisma.user.findMany({
            where: { role: "student" },
            orderBy: { createdAt: "desc" },
            include: {
                studentProfile: {
                    include: {
                        classLevel: true,
                    },
                },
            },
        });
        return students;
    } catch (error) {
        return [];
    }
}

/**
 * 6. Action Pindahkan Siswa ke Tingkatan Kelas Lain
 */
export async function updateStudentClassLevelAction(
    studentProfileId: string,
    newClassLevelId: string
): Promise<ActionResult> {
    try {
        await prisma.studentProfile.update({
            where: { id: studentProfileId },
            data: { classLevelId: newClassLevelId },
        });

        revalidatePath("/admin/students");
        revalidatePath("/admin/class-levels");

        return {
            success: true,
            message: "Tingkatan kelas siswa berhasil diperbarui.",
        };
    } catch (error) {
        return {
            success: false,
            error: "Gagal memindahkan tingkatan kelas siswa.",
        };
    }
}

/**
 * 7. Action Reset Password Siswa oleh Admin
 */
export async function resetStudentPasswordAction(
    userId: string,
    authId: string
): Promise<ActionResult> {
    try {
        const adminSupabase = createAdminClient();

        // Reset password akun auth ke default Password123
        const { error: resetAuthError } =
            await adminSupabase.auth.admin.updateUserById(authId, {
                password: "Password123",
            });

        if (resetAuthError) {
            return {
                success: false,
                error: `Gagal mereset password di Auth: ${resetAuthError.message}`,
            };
        }

        // Set flag mustChangePassword menjadi true kembali
        await prisma.studentProfile.update({
            where: { userId },
            data: { mustChangePassword: true },
        });

        revalidatePath("/admin/students");

        return {
            success: true,
            message: "Password siswa berhasil direset ke 'Password123'. Siswa wajib mengganti password saat login berikutnya.",
        };
    } catch (error) {
        return {
            success: false,
            error: "Gagal mereset password siswa.",
        };
    }
}
