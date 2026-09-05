"use server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/data/auth";
import { revalidatePath } from "next/cache";
import { reviewSchema } from "../validations/review";

export async function submitReviewAction(formData: FormData) {
    const user = await getAuthenticatedUser();

    if (!user || user.role !== "student" || !user.studentProfile) {
        return { success: false, error: "Akses ditolak. Anda harus login sebagai siswa." };
    }

    const studentId = user.studentProfile.id;
    const courseId = formData.get("courseId") as string;
    const rating = formData.get("rating");
    const comment = formData.get("comment") as string;

    const validatedFields = reviewSchema.safeParse({ courseId, rating, comment });
    if (!validatedFields.success) {
        return { success: false, error: "Data review tidak valid." };
    }

    try {
        // Hanya siswa yang sudah mengambil (enroll) kursus yang bisa memberikan ulasan (TSD D2)
        const isEnrolled = await prisma.enrollment.findUnique({
            where: { studentId_courseId: { studentId, courseId } }
        });

        if (!isEnrolled) {
            return { success: false, error: "Kamu harus mendaftar kursus ini terlebih dahulu untuk memberikan ulasan." };
        }

        // Gunakan UPSERT: Jika belum ada = buat baru, jika sudah ada = edit ulasan lama (TSD D3)
        await prisma.review.upsert({
            where: {
                studentId_courseId: { studentId, courseId }
            },
            update: {
                rating: validatedFields.data.rating,
                comment: validatedFields.data.comment,
            },
            create: {
                studentId,
                courseId,
                rating: validatedFields.data.rating,
                comment: validatedFields.data.comment,
            }
        });

        revalidatePath(`/student/courses/${courseId}`);
        return { success: true, message: "Ulasan berhasil disimpan." };
    } catch (error) {
        console.error("Gagal menyimpan ulasan:", error);
        return { success: false, error: "Terjadi kesalahan pada sistem." };
    }
}
