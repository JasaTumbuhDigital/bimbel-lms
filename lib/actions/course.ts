"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { courseSchema } from "@/lib/validations/course";
import { getAuthenticatedUser } from "@/lib/data/auth";
import { ActionResult } from "@/types/action";
import { deleteFileFromStorage } from "@/lib/supabase-storage";

/**
 * 1. Action Tambah Kursus Baru (Admin & Tutor)
 */
export async function createCourseAction(
    prevState: ActionResult | null,
    formData: FormData
): Promise<ActionResult> {
    const user = await getAuthenticatedUser();
    if (!user || (user.role !== "admin" && user.role !== "tutor")) {
        return { success: false, error: "Akses ditolak. Hanya Admin atau Tutor yang diizinkan." };
    }

    const rawClassLevelIds = formData.getAll("classLevelIds") as string[];
    const rawTutorProfileIds = formData.getAll("tutorProfileIds") as string[];

    const rawData = {
        title: formData.get("title") as string,
        description: (formData.get("description") as string) || undefined,
        thumbnailUrl: (formData.get("thumbnailUrl") as string) || undefined,
        visibleToAllLevels: formData.get("visibleToAllLevels") === "true",
        classLevelIds: rawClassLevelIds,
        tutorProfileIds: rawTutorProfileIds,
    };

    const validation = courseSchema.safeParse(rawData);
    if (!validation.success) {
        return {
            success: false,
            error: "Validasi data kursus gagal",
            fieldErrors: validation.error.flatten().fieldErrors,
        };
    }

    const { title, description, thumbnailUrl, visibleToAllLevels, classLevelIds, tutorProfileIds } = validation.data;

    try {
        const newCourse = await prisma.course.create({
            data: {
                title,
                description,
                thumbnailUrl,
                visibleToAllLevels,
                createdBy: user.id,
                classLevels: {
                    create: classLevelIds.map((id) => ({ classLevelId: id })),
                },
                tutors: {
                    create: tutorProfileIds.map((id) => ({ tutorProfileId: id })),
                },
            },
        });

        revalidatePath("/admin/courses");
        revalidatePath("/tutor/courses");
        return { success: true, message: `Kursus "${title}" berhasil dibuat.`, data: newCourse };
    } catch (error) {
        console.error("Error createCourseAction:", error);
        return { success: false, error: "Gagal menyimpan kursus ke database." };
    }
}

/**
 * 2. Action Siswa Enroll Kursus Eksplisit
 * - Dilengkapi validasi kelayakan kursus & tingkatan kelas siswa
 */
export async function enrollInCourseAction(courseId: string): Promise<ActionResult> {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== "student" || !user.studentProfile) {
        return { success: false, error: "Hanya siswa aktif yang dapat mendaftar kursus." };
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

        // Cek kelayakan tingkatan kelas
        const isEligible =
            course.visibleToAllLevels ||
            course.classLevels.some((cl) => cl.classLevelId === studentClassLevelId);

        if (!isEligible) {
            return {
                success: false,
                error: "Maaf, kursus ini tidak dapat didaftar oleh tingkatan kelas kamu.",
            };
        }

        // Cek apakah sudah ter-enroll sebelumnya
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

        await prisma.enrollment.create({
            data: {
                studentId,
                courseId,
            },
        });

        revalidatePath(`/courses/${courseId}`);
        revalidatePath("/dashboard");
        return { success: true, message: "Berhasil mendaftar ke kursus ini!" };
    } catch (error) {
        console.error("Error enrollInCourseAction:", error);
        return { success: false, error: "Gagal memproses pendaftaran kursus." };
    }
}

/**
 * 3. Action Arsip Kursus (Soft Delete)
 */
export async function archiveCourseAction(courseId: string): Promise<ActionResult> {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== "admin") {
        return { success: false, error: "Akses ditolak. Hanya Admin yang dapat menghapus kursus." };
    }

    try {
        const course = await prisma.course.findUnique({ where: { id: courseId } });
        if (!course) return { success: false, error: "Kursus tidak ditemukan." };

        await prisma.course.update({
            where: { id: courseId },
            data: { isArchived: true },
        });

        revalidatePath("/admin/courses");
        return { success: true, message: "Kursus berhasil diarsipkan." };
    } catch (error) {
        console.error("Error archiveCourseAction:", error);
        return { success: false, error: "Gagal mengarsipkan kursus." };
    }
}

/**
 * 4. Action Update Informasi Kursus (Admin & Tutor)
 */
export async function updateCourseAction(
    courseId: string,
    prevState: ActionResult | null,
    formData: FormData
): Promise<ActionResult> {
    const user = await getAuthenticatedUser();
    if (!user || (user.role !== "admin" && user.role !== "tutor")) {
        return { success: false, error: "Akses ditolak." };
    }

    const title = formData.get("title") as string;
    const description = (formData.get("description") as string) || undefined;
    const thumbnailUrl = (formData.get("thumbnailUrl") as string) || undefined;
    const updateData = { title, description, thumbnailUrl };

    if (!title) {
        return { success: false, error: "Judul kursus wajib diisi." };
    }

    try {
        const existingCourse = await prisma.course.findUnique({
            where: { id: courseId },
            select: { thumbnailUrl: true }
        });

        await prisma.course.update({
            where: { id: courseId },
            data: updateData
        });

        if (thumbnailUrl && existingCourse?.thumbnailUrl && existingCourse.thumbnailUrl !== thumbnailUrl) {
            await deleteFileFromStorage(existingCourse.thumbnailUrl);
        }

        revalidatePath(`/admin/courses/${courseId}/edit`);
        revalidatePath(`/tutor/courses/${courseId}/edit`);
        return { success: true, message: "Informasi kursus berhasil diperbarui." };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Gagal memperbarui kursus." };
    }
}

/**
 * 5. Action Update Akses Kursus (Admin Only)
 */
export async function updateCourseAccessAction(
    courseId: string,
    prevState: ActionResult | null,
    formData: FormData
): Promise<ActionResult> {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== "admin") {
        return { success: false, error: "Akses ditolak. Hanya Admin yang dapat mengatur akses kursus." };
    }

    const rawClassLevelIds = formData.getAll("classLevelIds") as string[];
    const rawTutorProfileIds = formData.getAll("tutorProfileIds") as string[];
    const visibleToAllLevels = formData.get("visibleToAllLevels") === "true";
    const isPublished = formData.get("isPublished") === "true";

    try {
        await prisma.$transaction(async (tx) => {
            // Update tabel courses
            await tx.course.update({
                where: { id: courseId },
                data: {
                    visibleToAllLevels,
                    isPublished
                }
            });

            // Re-sync class levels
            await tx.courseClassLevel.deleteMany({ where: { courseId } });
            if (!visibleToAllLevels && rawClassLevelIds.length > 0) {
                await tx.courseClassLevel.createMany({
                    data: rawClassLevelIds.map(id => ({
                        courseId,
                        classLevelId: id
                    }))
                });
            }

            // Re-sync tutors
            await tx.courseTutor.deleteMany({ where: { courseId } });
            if (rawTutorProfileIds.length > 0) {
                await tx.courseTutor.createMany({
                    data: rawTutorProfileIds.map(id => ({
                        courseId,
                        tutorProfileId: id
                    }))
                });
            }
        });

        revalidatePath(`/admin/courses/${courseId}/edit`);
        return { success: true, message: "Pengaturan akses berhasil diperbarui." };
    } catch (error) {
        console.error("Failed to update course access:", error);
        return { success: false, error: "Gagal memperbarui pengaturan akses." };
    }
}
