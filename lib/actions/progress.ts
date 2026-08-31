"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { ActionResult } from "@/types/action";
import { toggleProgressSchema } from "@/lib/validations/module";

export async function toggleLessonProgressAction(
    prevState: ActionResult | null,
    formData: FormData
): Promise<ActionResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        return { success: false, error: "Akses ditolak. Anda harus login." };
    }

    const rawData = {
        lessonId: formData.get("lessonId") as string,
        isCompleted: formData.get("isCompleted") === "true",
    };

    const validation = toggleProgressSchema.safeParse(rawData);
    if (!validation.success) {
        return { success: false, error: "Validasi gagal", fieldErrors: validation.error.flatten().fieldErrors };
    }

    const { lessonId, isCompleted } = validation.data;

    try {
        const studentProfile = await prisma.studentProfile.findUnique({
            where: { userId: user.id },
        });

        if (!studentProfile) {
            return { success: false, error: "Akses ditolak. Hanya siswa yang dapat menandai progress." };
        }

        const studentId = studentProfile.id;

        // Validasi: Pastikan lesson ini valid dan siswa sudah enroll di kursusnya
        const lessonRecord = await prisma.lesson.findUnique({
            where: { id: lessonId },
            include: { module: true },
        });

        if (!lessonRecord) {
            return { success: false, error: "Materi tidak ditemukan." };
        }

        const courseId = lessonRecord.module.courseId;

        const enrollment = await prisma.enrollment.findUnique({
            where: {
                studentId_courseId: {
                    studentId,
                    courseId,
                }
            }
        });

        if (!enrollment) {
            return { success: false, error: "Anda belum mendaftar di kursus ini, sehingga tidak dapat menandai materi selesai." };
        }

        // Upsert progress
        await prisma.lessonProgress.upsert({
            where: {
                studentId_lessonId: {
                    studentId,
                    lessonId,
                }
            },
            update: {
                isCompleted,
                completedAt: isCompleted ? new Date() : null,
            },
            create: {
                studentId,
                lessonId,
                isCompleted,
                completedAt: isCompleted ? new Date() : null,
            }
        });

        revalidatePath(`/student/courses/${courseId}`);
        return { success: true, message: isCompleted ? "Materi ditandai selesai" : "Penanda selesai dibatalkan" };
    } catch (error: any) {
        return { success: false, error: error.message || "Terjadi kesalahan" };
    }
}
