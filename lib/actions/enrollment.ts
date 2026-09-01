"use server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/data/auth";
import { revalidatePath } from "next/cache";

export async function enrollCourseAction(courseId: string) {
    const user = await getAuthenticatedUser();
    
    if (!user || user.role !== "student" || !user.studentProfile) {
        return { success: false, error: "Akses ditolak. Anda harus login sebagai siswa." };
    }

    try {
        const studentId = user.studentProfile.id;

        // Cek apakah sudah enroll
        const existingEnrollment = await prisma.enrollment.findUnique({
            where: {
                studentId_courseId: {
                    studentId,
                    courseId
                }
            }
        });

        if (existingEnrollment) {
            return { success: true, message: "Anda sudah terdaftar di kursus ini." };
        }

        // Buat enrollment baru
        await prisma.enrollment.create({
            data: {
                studentId,
                courseId
            }
        });

        revalidatePath(`/student/courses`);
        revalidatePath(`/student/courses/${courseId}`);
        
        return { success: true, message: "Berhasil mendaftar kursus." };
    } catch (error) {
        console.error("Gagal mendaftar kursus:", error);
        return { success: false, error: "Terjadi kesalahan saat mencoba mendaftar kursus." };
    }
}
