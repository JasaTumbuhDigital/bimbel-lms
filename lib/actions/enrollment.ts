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

/**
 * Admin/Tutor: Enroll satu atau beberapa siswa berdasarkan studentProfileId[]
 */
export async function adminEnrollStudentsAction(courseId: string, studentProfileIds: string[]) {
    const user = await getAuthenticatedUser();
    if (!user || (user.role !== "admin" && user.role !== "tutor")) {
        return { success: false, error: "Akses ditolak." };
    }
    if (!studentProfileIds || studentProfileIds.length === 0) {
        return { success: false, error: "Tidak ada siswa yang dipilih." };
    }

    try {
        // Pastikan tutor adalah author kursus
        if (user.role === "tutor") {
            const course = await prisma.course.findUnique({ where: { id: courseId }, select: { createdBy: true } });
            if (!course || course.createdBy !== user.id) {
                return { success: false, error: "Akses ditolak. Hanya author kursus yang dapat mendaftarkan siswa." };
            }
        }

        // createMany + skipDuplicates agar aman jika ada yang sudah terdaftar
        const result = await prisma.enrollment.createMany({
            data: studentProfileIds.map((studentId) => ({ studentId, courseId })),
            skipDuplicates: true,
        });

        revalidatePath(`/tutor/courses/${courseId}/edit`);
        revalidatePath(`/admin/courses/${courseId}/edit`);

        return {
            success: true,
            message: `${result.count} siswa berhasil didaftarkan ke kursus.`,
        };
    } catch (error) {
        console.error("Gagal enroll siswa:", error);
        return { success: false, error: "Terjadi kesalahan saat mendaftarkan siswa." };
    }
}

/**
 * Admin/Tutor: Enroll semua siswa dari satu atau lebih tingkatan kelas ke kursus
 */
export async function adminBulkEnrollByClassAction(courseId: string, classLevelIds: string[]) {
    const user = await getAuthenticatedUser();
    if (!user || (user.role !== "admin" && user.role !== "tutor")) {
        return { success: false, error: "Akses ditolak." };
    }
    if (!classLevelIds || classLevelIds.length === 0) {
        return { success: false, error: "Tidak ada kelas yang dipilih." };
    }

    try {
        if (user.role === "tutor") {
            const course = await prisma.course.findUnique({ where: { id: courseId }, select: { createdBy: true } });
            if (!course || course.createdBy !== user.id) {
                return { success: false, error: "Akses ditolak. Hanya author kursus yang dapat mendaftarkan siswa." };
            }
        }

        // Ambil semua studentProfile dari kelas yang dipilih
        const students = await prisma.studentProfile.findMany({
            where: { classLevelId: { in: classLevelIds } },
            select: { id: true },
        });

        if (students.length === 0) {
            return { success: false, error: "Tidak ada siswa di kelas yang dipilih." };
        }

        const result = await prisma.enrollment.createMany({
            data: students.map((s) => ({ studentId: s.id, courseId })),
            skipDuplicates: true,
        });

        revalidatePath(`/tutor/courses/${courseId}/edit`);
        revalidatePath(`/admin/courses/${courseId}/edit`);

        return {
            success: true,
            message: `${result.count} siswa dari kelas terpilih berhasil didaftarkan.`,
        };
    } catch (error) {
        console.error("Gagal bulk enroll by class:", error);
        return { success: false, error: "Terjadi kesalahan saat mendaftarkan siswa per kelas." };
    }
}

/**
 * Admin/Tutor: Hapus enrollment siswa dari kursus (progress tetap disimpan)
 */
export async function adminUnenrollStudentAction(courseId: string, studentProfileId: string) {
    const user = await getAuthenticatedUser();
    if (!user || (user.role !== "admin" && user.role !== "tutor")) {
        return { success: false, error: "Akses ditolak." };
    }

    try {
        if (user.role === "tutor") {
            const course = await prisma.course.findUnique({ where: { id: courseId }, select: { createdBy: true } });
            if (!course || course.createdBy !== user.id) {
                return { success: false, error: "Akses ditolak. Hanya author kursus yang dapat mengeluarkan siswa." };
            }
        }

        await prisma.enrollment.delete({
            where: {
                studentId_courseId: {
                    studentId: studentProfileId,
                    courseId,
                },
            },
        });

        revalidatePath(`/tutor/courses/${courseId}/edit`);
        revalidatePath(`/admin/courses/${courseId}/edit`);

        return { success: true, message: "Siswa berhasil dikeluarkan dari kursus." };
    } catch (error) {
        console.error("Gagal unenroll siswa:", error);
        return { success: false, error: "Terjadi kesalahan saat mengeluarkan siswa." };
    }
}
