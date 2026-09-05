import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "./auth";

// Untuk menampilkan daftar ulasan di halaman detail kursus (Publik bagi yang bisa akses kursus)
export async function getCourseReviewsData(courseId: string) {
    const reviews = await prisma.review.findMany({
        where: { courseId },
        include: {
            student: {
                include: { user: { select: { name: true, avatarUrl: true } } }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    const averageRating = reviews.length > 0
        ? reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length
        : 0;

    return {
        reviews,
        totalReviews: reviews.length,
        averageRating: parseFloat(averageRating.toFixed(1))
    };
}

// Untuk mengambil ulasan milik siswa (jika dia sudah pernah submit ulasan) agar form edit terisi otomatis
export async function getStudentReviewForCourse(courseId: string) {
    const user = await getAuthenticatedUser();

    if (!user || user.role !== "student" || !user.studentProfile) {
        return null;
    }

    const review = await prisma.review.findUnique({
        where: {
            studentId_courseId: {
                studentId: user.studentProfile.id,
                courseId,
            }
        }
    });

    return review;
}
