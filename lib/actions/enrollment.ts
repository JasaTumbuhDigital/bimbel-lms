"use server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/data/auth";
import { revalidatePath } from "next/cache";

export async function enrollCourseAction(courseId: string) {
    const user = await getAuthenticatedUser();

    if (!user || user.role !== "student" || !user.studentProfile) {
        return { success: false, error: "Akses ditolak. Anda harus login sebagai siswa." };
    }

    const studentId = user.studentProfile.id;
    const studentClassLevelId = user.studentProfile.classLevelId;

    try {
        // Fetch kursus untuk cek kelayakan
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            include: { classLevels: true },
        });

        if (!course || !course.isPublished || course.isArchived) {
            return { success: false, error: "Kursus tidak ditemukan atau belum dipublikasikan." };
        }

        // 1. Cek apakah sudah ter-enroll sebelumnya (jika sudah terdaftar, izinkan/sukseskan tanpa memblokir tingkatan kelas)
        const existing = await prisma.enrollment.findUnique({
            where: {
                studentId_courseId: {
                    studentId,
                    courseId,
                },
            },
        });

        if (existing) {
            return { success: true, message: "Kamu sudah terdaftar di kursus ini." };
        }

        // 2. Cek kelayakan tingkatan kelas untuk enrollment baru
        const isEligible =
            course.visibleToAllLevels ||
            course.classLevels.some((cl) => cl.classLevelId === studentClassLevelId);

        if (!isEligible) {
            return {
                success: false,
                error: "Maaf, kursus ini tidak dapat didaftar oleh tingkatan kelas kamu.",
            };
        }

        await prisma.$transaction([
            prisma.enrollment.create({
                data: {
                    studentId,
                    courseId,
                },
            }),
            prisma.wishlist.deleteMany({
                where: {
                    studentId,
                    courseId,
                },
            }),
        ]);

        revalidatePath(`/student/courses`);
        revalidatePath(`/student/courses/${courseId}`);

        return { success: true, message: "Berhasil mendaftar ke kursus ini!" };
    } catch (error) {
        console.error("Gagal mendaftar kursus:", error);
        return { success: false, error: "Terjadi kesalahan saat mencoba mendaftar kursus." };
    }
}
