import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "./auth";

export async function getQuizForStudent(quizId: string) {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== "student" || !user.studentProfile) {
        return { success: false, error: "Akses ditolak." };
    }

    const studentId = user.studentProfile.id;

    try {
        const quiz = await prisma.quiz.findUnique({
            where: { id: quizId },
            include: {
                module: {
                    include: {
                        course: {
                            include: {
                                enrollments: {
                                    where: { studentId }
                                }
                            }
                        }
                    }
                },
                questions: {
                    orderBy: { sortOrder: "asc" },
                    select: {
                        id: true,
                        questionText: true,
                        // Hanya ambil id dan teks opsi, JANGAN AMBIL isCorrect!
                        options: {
                            select: {
                                id: true,
                                optionText: true
                            }
                        }
                    }
                },
                progress: {
                    where: { studentId }
                }
            }
        });

        if (!quiz) return { success: false, error: "Kuis tidak ditemukan." };

        // Validasi: Siswa wajib ter-enroll di kursus ini
        const isEnrolled = quiz.module.course.enrollments.length > 0;
        if (!isEnrolled) {
            return { success: false, error: "Anda belum terdaftar pada kursus ini." };
        }

        // Cek kesiapan kuis: minimal ada 1 soal dan setiap soal punya minimal 2 opsi
        const isReady = quiz.questions.length > 0 &&
            quiz.questions.every(q => q.options.length >= 2);

        if (!isReady) {
            return { success: false, error: "Kuis ini belum siap atau belum memiliki soal yang cukup." };
        }

        return {
            success: true,
            data: {
                id: quiz.id,
                title: quiz.title,
                passingScorePercent: quiz.passingScorePercent,
                moduleId: quiz.moduleId,
                courseId: quiz.module.courseId,
                questions: quiz.questions,
                userProgress: quiz.progress[0] || null
            }
        };
    } catch (error) {
        console.error("Gagal mengambil data kuis:", error);
        return { success: false, error: "Terjadi kesalahan server." };
    }
}
