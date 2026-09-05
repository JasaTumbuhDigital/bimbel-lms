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

// Untuk halaman Admin: mengambil semua ulasan dari semua kursus, diurutkan terbaru
export async function getAllReviewsForAdmin() {
    return prisma.review.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            course: {
                select: { id: true, title: true }
            },
            student: {
                include: {
                    user: { select: { name: true } }
                }
            }
        }
    });
}

// Untuk halaman Tutor: mengambil semua ulasan dari kursus yang dia ampu
export async function getReviewsForTutorCourse(courseId: string) {
    return prisma.review.findMany({
        where: { courseId },
        orderBy: { createdAt: 'desc' },
        include: {
            student: {
                include: {
                    user: { select: { name: true, avatarUrl: true } }
                }
            }
        }
    });
}
