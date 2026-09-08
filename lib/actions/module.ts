"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/data/auth";
import { ActionResult } from "@/types/action";
import {
    createModuleSchema,
    updateModuleSchema,
    reorderSchema,
} from "@/lib/validations/module";

import { verifyCourseAccess } from "@/lib/data/course-access";

export async function createModuleAction(
    prevState: ActionResult | null,
    formData: FormData
): Promise<ActionResult> {
    const user = await getAuthenticatedUser();
    const userId = user?.id;
    if (!userId) return { success: false, error: "Akses ditolak." };

    const rawData = {
        courseId: formData.get("courseId") as string,
        title: formData.get("title") as string,
    };

    const validation = createModuleSchema.safeParse(rawData);
    if (!validation.success) {
        return { success: false, error: "Validasi gagal", fieldErrors: validation.error.flatten().fieldErrors };
    }

    const { courseId, title } = validation.data;

    const { success } = await verifyCourseAccess(courseId, false);
    if (!success) return { success: false, error: "Anda tidak berhak mengubah kursus ini." };

    try {
        const lastModule = await prisma.module.findFirst({
            where: { courseId },
            orderBy: { sortOrder: "desc" }
        });
        const sortOrder = lastModule ? lastModule.sortOrder + 1 : 0;

        const newModule = await prisma.module.create({
            data: { courseId, title, sortOrder }
        });

        revalidatePath(`/admin/courses/${courseId}/edit`);
        revalidatePath(`/tutor/courses/${courseId}/edit`);
        return { success: true, message: "Modul berhasil dibuat", data: newModule };
    } catch (error) {
        return { success: false, error: String(error) || "Terjadi kesalahan" };
    }
}

export async function updateModuleAction(
    prevState: ActionResult | null,
    formData: FormData
): Promise<ActionResult> {
    const user = await getAuthenticatedUser();
    const userId = user?.id;
    if (!userId) return { success: false, error: "Akses ditolak." };

    const rawData = {
        id: formData.get("id") as string,
        title: formData.get("title") as string,
    };

    const validation = updateModuleSchema.safeParse(rawData);
    if (!validation.success) {
        return { success: false, error: "Validasi gagal", fieldErrors: validation.error.flatten().fieldErrors };
    }

    const { id, title } = validation.data;

    try {
        const moduleRecord = await prisma.module.findUnique({ where: { id } });
        if (!moduleRecord) return { success: false, error: "Modul tidak ditemukan." };

        const { success } = await verifyCourseAccess(moduleRecord.courseId, false);
        if (!success) return { success: false, error: "Anda tidak berhak mengubah kursus ini." };

        await prisma.module.update({
            where: { id },
            data: { ...(title && { title }) }
        });

        revalidatePath(`/admin/courses/${moduleRecord.courseId}/edit`);
        revalidatePath(`/tutor/courses/${moduleRecord.courseId}/edit`);
        return { success: true, message: "Modul berhasil diubah" };
    } catch (error) {
        return { success: false, error: String(error) || "Terjadi kesalahan" };
    }
}

export async function deleteModuleAction(
    moduleId: string
): Promise<ActionResult> {
    const user = await getAuthenticatedUser();
    const userId = user?.id;
    if (!userId) return { success: false, error: "Akses ditolak." };

    try {
        const moduleRecord = await prisma.module.findUnique({ where: { id: moduleId } });
        if (!moduleRecord) return { success: false, error: "Modul tidak ditemukan." };

        const { success } = await verifyCourseAccess(moduleRecord.courseId, false);
        if (!success) return { success: false, error: "Anda tidak berhak mengubah kursus ini." };

        await prisma.module.delete({ where: { id: moduleId } });

        revalidatePath(`/admin/courses/${moduleRecord.courseId}/edit`);
        revalidatePath(`/tutor/courses/${moduleRecord.courseId}/edit`);
        return { success: true, message: "Modul berhasil dihapus" };
    } catch (error) {
        return { success: false, error: String(error) || "Terjadi kesalahan" };
    }
}

export async function reorderModulesAction(
    courseId: string,
    orderedModuleIds: string[]
): Promise<ActionResult> {
    const rawData = {
        parentId: courseId,
        orderedIds: orderedModuleIds
    };
    const validation = reorderSchema.safeParse(rawData);
    if (!validation.success) {
        return { success: false, error: "Format data urutan tidak valid." };
    }

    const user = await getAuthenticatedUser();
    const userId = user?.id;
    if (!userId) return { success: false, error: "Akses ditolak." };

    const { success } = await verifyCourseAccess(courseId, false);
    if (!success) return { success: false, error: "Anda tidak berhak mengubah kursus ini." };

    try {
        // Lakukan batch update secara transaksional
        await prisma.$transaction(
            orderedModuleIds.map((id, index) =>
                prisma.module.update({
                    where: { id },
                    data: { sortOrder: index }
                })
            )
        );

        revalidatePath(`/admin/courses/${courseId}/edit`);
        revalidatePath(`/tutor/courses/${courseId}/edit`);
        return { success: true, message: "Urutan modul berhasil diubah" };
    } catch (error) {
        return { success: false, error: String(error) || "Terjadi kesalahan" };
    }
}

