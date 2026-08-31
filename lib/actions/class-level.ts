"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { classLevelSchema } from "@/lib/validations/class-level";

export type ActionResult<T = unknown> = {
    success: boolean;
    message?: string;
    error?: string;
    fieldErrors?: Record<string, string[]>;
    data?: T;
};

/**
 * Helper internal untuk mengamankan bahwa pemanggil action adalah Admin
 */
async function checkAdminPermission() {
    const supabase = await createClient();
    const {
        data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) return null;

    const dbUser = await prisma.user.findUnique({
        where: { authId: authUser.id },
    });

    if (!dbUser || !dbUser.isActive || dbUser.role !== "admin") {
        return null;
    }

    return dbUser;
}

/**
 * 1. Fetch Seluruh Daftar Tingkatan Kelas (beserta jumlah siswa)
 */
export async function getClassLevels() {
    try {
        const classLevels = await prisma.classLevel.findMany({
            orderBy: { createdAt: "asc" },
            include: {
                _count: {
                    select: { studentProfiles: true },
                },
            },
        });
        return classLevels;
    } catch (error) {
        return [];
    }
}

/**
 * 2. Action Tambah Tingkatan Kelas Baru
 */
export async function createClassLevelAction(
    prevState: ActionResult | null,
    formData: FormData
): Promise<ActionResult> {
    const admin = await checkAdminPermission();
    if (!admin) {
        return { success: false, error: "Akses ditolak. Hanya Admin yang diizinkan." };
    }

    const rawData = {
        name: formData.get("name") as string,
        description: (formData.get("description") as string) || undefined,
        isDefault: formData.get("isDefault") === "true",
    };

    const validation = classLevelSchema.safeParse(rawData);
    if (!validation.success) {
        return {
            success: false,
            error: "Validasi data kelas gagal",
            fieldErrors: validation.error.flatten().fieldErrors,
        };
    }

    const { name, description, isDefault } = validation.data;

    // Cek keunikan nama kelas
    const existing = await prisma.classLevel.findUnique({
        where: { name },
    });

    if (existing) {
        return { success: false, error: `Tingkatan kelas dengan nama "${name}" sudah ada.` };
    }

    try {
        // Jika isDefault true, matikan status isDefault pada kelas lain
        if (isDefault) {
            await prisma.classLevel.updateMany({
                data: { isDefault: false },
            });
        }

        await prisma.classLevel.create({
            data: {
                name,
                description,
                isDefault,
            },
        });

        revalidatePath("/admin/class-levels");
        return { success: true, message: `Tingkatan kelas "${name}" berhasil ditambahkan.` };
    } catch (error) {
        return { success: false, error: "Gagal menyimpan tingkatan kelas ke database." };
    }
}

/**
 * 3. Action Hapus Tingkatan Kelas (Admin Only)
 */
export async function deleteClassLevelAction(id: string): Promise<ActionResult> {
    const admin = await checkAdminPermission();
    if (!admin) {
        return { success: false, error: "Akses ditolak. Hanya Admin yang diizinkan." };
    }

    // Cek apakah masih ada siswa yang terdaftar di kelas ini
    const studentCount = await prisma.studentProfile.count({
        where: { classLevelId: id },
    });

    if (studentCount > 0) {
        return {
            success: false,
            error: `Gagal menghapus. Masih terdapat ${studentCount} siswa aktif di tingkatan kelas ini.`,
        };
    }

    try {
        await prisma.classLevel.delete({
            where: { id },
        });

        revalidatePath("/admin/class-levels");
        return { success: true, message: "Tingkatan kelas berhasil dihapus." };
    } catch (error) {
        return { success: false, error: "Gagal menghapus tingkatan kelas dari database." };
    }
}
