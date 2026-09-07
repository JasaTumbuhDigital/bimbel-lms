"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { classLevelSchema } from "@/lib/validations/class-level";
import { getAuthenticatedUser, checkAdminPermission } from "@/lib/data/auth";
import { ActionResult } from "@/types/action";



/**
 * 1. Action Tambah Tingkatan Kelas Baru
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

    try {
        await prisma.$transaction(async (tx) => {
            if (isDefault) {
                await tx.classLevel.updateMany({
                    data: { isDefault: false },
                });
            }
            await tx.classLevel.create({
                data: {
                    name,
                    description,
                    isDefault,
                },
            });
        });

        revalidatePath("/admin/class-levels");
        return { success: true, message: `Tingkatan kelas "${name}" berhasil ditambahkan.` };
    } catch (error) {
        const dbError = error as { code?: string };
        if (dbError.code === "P2002") {
            return { success: false, error: `Tingkatan kelas dengan nama "${name}" sudah ada.` };
        }
        return { success: false, error: "Gagal menyimpan tingkatan kelas ke database." };
    }
}

/**
 * 2. Action Hapus Tingkatan Kelas (Admin Only)
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
    } catch {
        return { success: false, error: "Gagal menghapus tingkatan kelas dari database." };
    }
}

/**
 * 3. Action Pindahkan Siswa ke Tingkatan Kelas Lain (Admin & Tutor)
 */
export async function updateStudentClassLevelAction(
    studentProfileId: string,
    newClassLevelId: string
): Promise<ActionResult> {
    const user = await getAuthenticatedUser();

    if (!user || (user.role !== "admin" && user.role !== "tutor")) {
        return { success: false, error: "Akses ditolak. Hanya Admin dan Tutor yang bisa memindahkan kelas siswa." };
    }
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
    } catch {
        return {
            success: false,
            error: "Gagal memindahkan tingkatan kelas siswa.",
        };
    }
}
