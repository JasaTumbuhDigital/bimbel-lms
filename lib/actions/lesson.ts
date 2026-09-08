"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/data/auth";
import { ActionResult } from "@/types/action";
import {
    createLessonSchema,
    updateLessonSchema,
    reorderSchema
} from "@/lib/validations/lesson"
import { deleteFileFromStorage } from "@/lib/supabase-storage-server";

import { verifyCourseAccess } from "@/lib/data/course-access";

export async function createLessonAction(
    prevState: ActionResult | null,
    formData: FormData
): Promise<ActionResult> {
    const user = await getAuthenticatedUser();
    const userId = user?.id;
    if (!userId) return { success: false, error: "Akses ditolak." };

    const rawData = {
        moduleId: formData.get("moduleId") as string,
        title: formData.get("title") as string,
        contentType: formData.get("contentType") as string,
        videoUrl: (formData.get("videoUrl") as string) || undefined,
        documentUrl: (formData.get("documentUrl") as string) || undefined,
    };

    const validation = createLessonSchema.safeParse(rawData);
    if (!validation.success) {
        return { success: false, error: "Validasi gagal", fieldErrors: validation.error.flatten().fieldErrors };
    }

    const data = validation.data;

    try {
        const moduleRecord = await prisma.module.findUnique({ where: { id: data.moduleId } });
        if (!moduleRecord) return { success: false, error: "Modul tidak ditemukan." };

        const { success } = await verifyCourseAccess(moduleRecord.courseId, false);
        if (!success) return { success: false, error: "Anda tidak berhak mengubah kursus ini." };

        const lastLesson = await prisma.lesson.findFirst({
            where: { moduleId: data.moduleId },
            orderBy: { sortOrder: "desc" }
        });
        const sortOrder = lastLesson ? lastLesson.sortOrder + 1 : 0;

        const newLesson = await prisma.lesson.create({
            data: {
                moduleId: data.moduleId,
                title: data.title,
                contentType: data.contentType,
                videoUrl: data.videoUrl,
                documentUrl: data.documentUrl,
                sortOrder
            }
        });

        revalidatePath(`/admin/courses/${moduleRecord.courseId}/edit`);
        revalidatePath(`/tutor/courses/${moduleRecord.courseId}/edit`);
        return { success: true, message: "Materi berhasil ditambahkan", data: newLesson };
    } catch (error) {
        return { success: false, error: String(error) || "Terjadi kesalahan" };
    }
}

export async function updateLessonAction(
    prevState: ActionResult | null,
    formData: FormData
): Promise<ActionResult> {
    const user = await getAuthenticatedUser();
    const userId = user?.id;
    if (!userId) return { success: false, error: "Akses ditolak." };

    const rawData = {
        id: formData.get("id") as string,
        title: formData.get("title") as string,
        contentType: formData.get("contentType") as string,
        videoUrl: formData.has("videoUrl") ? (formData.get("videoUrl") as string) : undefined,
        documentUrl: formData.has("documentUrl") ? (formData.get("documentUrl") as string) : undefined,
    };

    const validation = updateLessonSchema.safeParse(rawData);
    if (!validation.success) {
        return { success: false, error: "Validasi gagal", fieldErrors: validation.error.flatten().fieldErrors };
    }

    const { id, ...updateData } = validation.data;

    try {
        const lessonRecord = await prisma.lesson.findUnique({
            where: { id },
            include: { module: true }
        });
        if (!lessonRecord) return { success: false, error: "Materi tidak ditemukan." };

        const { success } = await verifyCourseAccess(lessonRecord.module.courseId, false);
        if (!success) return { success: false, error: "Anda tidak berhak mengubah kursus ini." };

        await prisma.lesson.update({
            where: { id },
            data: updateData
        });

        // Bersihkan file lama di storage jika ada penggantian file atau ubah tipe jadi video
        if (lessonRecord.contentType === "document" && lessonRecord.documentUrl) {
            const isChangingFile = updateData.contentType === "video" || (updateData.documentUrl && updateData.documentUrl !== lessonRecord.documentUrl);
            if (isChangingFile) {
                await deleteFileFromStorage(lessonRecord.documentUrl);
            }
        }

        revalidatePath(`/admin/courses/${lessonRecord.module.courseId}/edit`);
        revalidatePath(`/tutor/courses/${lessonRecord.module.courseId}/edit`);
        return { success: true, message: "Materi berhasil diubah" };
    } catch (error) {
        return { success: false, error: String(error) || "Terjadi kesalahan" };
    }
}

export async function deleteLessonAction(
    lessonId: string
): Promise<ActionResult> {
    const user = await getAuthenticatedUser();
    const userId = user?.id;
    if (!userId) return { success: false, error: "Akses ditolak." };

    try {
        const lessonRecord = await prisma.lesson.findUnique({
            where: { id: lessonId },
            include: { module: true }
        });
        if (!lessonRecord) return { success: false, error: "Materi tidak ditemukan." };

        const { success } = await verifyCourseAccess(lessonRecord.module.courseId, false);
        if (!success) return { success: false, error: "Anda tidak berhak mengubah kursus ini." };

        await prisma.lesson.delete({ where: { id: lessonId } });

        // Bersihkan file di storage jika materi yang dihapus berupa dokumen
        if (lessonRecord.contentType === "document" && lessonRecord.documentUrl) {
            await deleteFileFromStorage(lessonRecord.documentUrl);
        }

        revalidatePath(`/admin/courses/${lessonRecord.module.courseId}/edit`);
        revalidatePath(`/tutor/courses/${lessonRecord.module.courseId}/edit`);
        return { success: true, message: "Materi berhasil dihapus" };
    } catch (error) {
        return { success: false, error: String(error) || "Terjadi kesalahan" };
    }
}

export async function reorderLessonsAction(
    moduleId: string,
    orderedLessonIds: string[]
): Promise<ActionResult> {
    const rawData = {
        parentId: moduleId,
        orderedIds: orderedLessonIds
    };
    const validation = reorderSchema.safeParse(rawData);
    if (!validation.success) {
        return { success: false, error: "Format data urutan tidak valid." };
    }

    const user = await getAuthenticatedUser();
    const userId = user?.id;
    if (!userId) return { success: false, error: "Akses ditolak." };

    try {
        const moduleRecord = await prisma.module.findUnique({ where: { id: moduleId } });
        if (!moduleRecord) return { success: false, error: "Modul tidak ditemukan." };

        const { success } = await verifyCourseAccess(moduleRecord.courseId, false);
        if (!success) return { success: false, error: "Anda tidak berhak mengubah kursus ini." };

        await prisma.$transaction(
            orderedLessonIds.map((id, index) =>
                prisma.lesson.update({
                    where: { id },
                    data: { sortOrder: index }
                })
            )
        );

        revalidatePath(`/admin/courses/${moduleRecord.courseId}/edit`);
        revalidatePath(`/tutor/courses/${moduleRecord.courseId}/edit`);
        return { success: true, message: "Urutan materi berhasil diubah" };
    } catch (error) {
        return { success: false, error: String(error) || "Terjadi kesalahan" };
    }
}