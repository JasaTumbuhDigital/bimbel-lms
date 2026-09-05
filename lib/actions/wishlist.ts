"use server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/data/auth";
import { revalidatePath } from "next/cache";
import { wishlistSchema } from "../validations/wishlist";

export async function toggleWishlistAction(courseId: string, actionPath: string = "/student/courses") {
    const user = await getAuthenticatedUser();

    if (!user || user.role !== "student" || !user.studentProfile) {
        return { success: false, error: "Akses ditolak. Anda harus login sebagai siswa." };
    }

    const studentId = user.studentProfile.id;

    const validatedFields = wishlistSchema.safeParse({ courseId });
    if (!validatedFields.success) {
        return { success: false, error: "ID Kursus tidak valid." };
    }

    try {
        const isEnrolled = await prisma.enrollment.findUnique({
            where: {
                studentId_courseId: { studentId, courseId }
            }
        });

        if (isEnrolled) {
            return { success: false, error: "Kursus ini sudah kamu ambil." };
        }

        const existingWishlist = await prisma.wishlist.findUnique({
            where: {
                studentId_courseId: { studentId, courseId }
            }
        });

        if (existingWishlist) {
            // Jika sudah ada, hapus dari wishlist
            await prisma.wishlist.delete({
                where: { id: existingWishlist.id }
            });
            revalidatePath(actionPath);
            return { success: true, message: "Dihapus dari wishlist", isAdded: false };
        } else {
            // Jika belum ada, tambahkan ke wishlist
            await prisma.wishlist.create({
                data: { studentId, courseId }
            });
            revalidatePath(actionPath);
            return { success: true, message: "Ditambahkan ke wishlist", isAdded: true };
        }
    } catch (error) {
        console.error("Gagal toggle wishlist:", error);
        return { success: false, error: "Terjadi kesalahan pada sistem." };
    }
}
