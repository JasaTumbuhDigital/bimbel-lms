"use server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/data/auth";
import { revalidatePath } from "next/cache";

export async function markLessonCompleteAction(lessonId: string, courseId: string) {
    const user = await getAuthenticatedUser();
    
    if (!user || user.role !== "student" || !user.studentProfile) {
        return { success: false, error: "Akses ditolak." };
    }

    try {
        const studentId = user.studentProfile.id;

        // Upsert record progress
        await prisma.lessonProgress.upsert({
            where: {
                studentId_lessonId: {
                    studentId,
                    lessonId
                }
            },
            update: {
                isCompleted: true,
                completedAt: new Date()
            },
            create: {
                studentId,
                lessonId,
                isCompleted: true,
                completedAt: new Date()
            }
        });

        revalidatePath(`/student/courses/${courseId}/learn/${lessonId}`);
        revalidatePath(`/student/courses/${courseId}`);
        
        return { success: true, message: "Materi ditandai selesai." };
    } catch (error) {
        console.error("Gagal menandai materi:", error);
        return { success: false, error: "Gagal menyimpan progress materi." };
    }
}
