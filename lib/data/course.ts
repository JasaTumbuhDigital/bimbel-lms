import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "./auth";

/**
 * 1. Fetch Daftar Kursus (Sesuai Hak Akses & Role User)
 * Mendukung filter status 'active', 'archived', atau 'all' khusus Admin
 */
export async function getCourses(options?: { status?: "active" | "archived" | "all" }) {
    const user = await getAuthenticatedUser();
    if (!user) return [];

    try {
        if (user.role === "admin") {
            const status = options?.status || "active";
            const whereClause =
                status === "archived" ? { isArchived: true } :
                    status === "all" ? {} :
                        { isArchived: false };

            return await prisma.course.findMany({
                where: whereClause,
                orderBy: { createdAt: "desc" },
                include: {
                    classLevels: { include: { classLevel: true } },
                    tutors: { include: { tutorProfile: { include: { user: true } } } },
                    _count: { select: { modules: true, enrollments: true } },
                },
            });
        }

        if (user.role === "tutor") {
            if (!user.tutorProfile) return [];
            return await prisma.course.findMany({
                where: {
                    isArchived: false,
                    tutors: { some: { tutorProfileId: user.tutorProfile.id } }
                },
                orderBy: { createdAt: "desc" },
                include: {
                    classLevels: { include: { classLevel: true } },
                    tutors: { include: { tutorProfile: { include: { user: true } } } },
                    _count: { select: { modules: true, enrollments: true } },
                },
            });
        }

        return [];
    } catch (error) {
        console.error("Gagal mengambil daftar kursus:", error);
        return [];
    }
}

/**
 * 1a. Fetch Daftar Kursus (Khusus Student)
 * Menggunakan select spesifik untuk performa maksimal
 */
export async function getStudentCourses() {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== "student" || !user.studentProfile) return [];

    try {
        const studentClassLevelId = user.studentProfile.classLevelId;
        const studentId = user.studentProfile.id;

        return await prisma.course.findMany({
            where: {
                isPublished: true,
                isArchived: false,
                OR: [
                    { visibleToAllLevels: true },
                    {
                        classLevels: {
                            some: { classLevelId: studentClassLevelId },
                        },
                    },
                    {
                        enrollments: {
                            some: { studentId },
                        },
                    },
                ],
            },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                title: true,
                description: true,
                thumbnailUrl: true,
                enrollments: {
                    where: { studentId },
                    select: { id: true },
                },
                _count: { select: { modules: true } },
            },
        });

        return [];
    } catch (error) {
        console.error("Gagal mengambil daftar kursus:", error);
        return [];
    }
}

/**
 * 2. Fetch Detail 1 Kursus Beserta Modul & Lesson
 */
export async function getCourseById(courseId: string) {
    const user = await getAuthenticatedUser();
    if (!user) return null;

    try {
        const isStudent = user.role === "student" && !!user.studentProfile;
        const studentId = user.studentProfile?.id;

        const course = await prisma.course.findUnique({
            where: { id: courseId },
            include: {
                classLevels: { include: { classLevel: true } },
                tutors: { include: { tutorProfile: { include: { user: true } } } },
                modules: {
                    orderBy: { sortOrder: "asc" },
                    include: {
                        lessons: {
                            orderBy: { sortOrder: "asc" },
                            include: isStudent && studentId ? {
                                progress: {
                                    where: { studentId },
                                },
                            } : undefined,
                        },
                        quiz: {
                            include: {
                                questions: {
                                    orderBy: { sortOrder: "asc" },
                                    include: { options: true }
                                },
                                ...(isStudent && studentId ? {
                                    progress: {
                                        where: { studentId },
                                    }
                                } : {})
                            }
                        }
                    },
                },
                enrollments: isStudent && studentId ? {
                    where: { studentId },
                } : undefined,
            },
        });

        if (!course) return null;
        if (course.isArchived && user.role !== "admin") return null;

        // Validasi Scoping Akses Siswa
        if (user.role === "student") {
            if (!course.isPublished) return null;
            const isEnrolled = !!(course.enrollments && course.enrollments.length > 0);
            const isEligibleLevel =
                course.visibleToAllLevels ||
                course.classLevels.some(
                    (cl) => cl.classLevelId === user.studentProfile?.classLevelId
                );
            // Siswa yang sudah terdaftar (enrolled) tetap berhak mengakses kursus walaupun tingkatan kelas diubah
            if (!isEnrolled && !isEligibleLevel) return null;
        }

        if (user.role === "tutor") {
            const isAssigned = course.tutors.some(t => t.tutorProfileId === user.tutorProfile?.id);
            if (!isAssigned && !course.isPublished) return null;
        }

        return course;
    } catch (error) {
        console.error("Gagal mengambil detail kursus:", error);
        return null;
    }
}

/**
 * 3. Fetch Basic Course Info (Hanya tabel course dan status enroll, tanpa relasi berat)
 * Digunakan untuk merender bagian header dengan cepat
 */
export async function getCourseBasicInfo(courseId: string) {
    const user = await getAuthenticatedUser();
    if (!user) return null;

    try {
        const isStudent = user.role === "student" && !!user.studentProfile;
        const studentId = user.studentProfile?.id;

        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: {
                id: true,
                title: true,
                description: true,
                thumbnailUrl: true,
                isPublished: true,
                isArchived: true,
                visibleToAllLevels: true,
                createdBy: true,
                classLevels: { select: { classLevelId: true } },
                tutors: { select: { tutorProfileId: true } },
                enrollments: isStudent && studentId ? {
                    where: { studentId },
                    select: { id: true }
                } : undefined,
                _count: {
                    select: { modules: true }
                }
            }
        });

        if (!course) return null;
        if (course.isArchived && user.role !== "admin") return null;

        // Validasi Scoping Akses Siswa
        if (user.role === "student") {
            if (!course.isPublished) return null;
            const isEnrolled = !!(course.enrollments && course.enrollments.length > 0);
            const isEligibleLevel =
                course.visibleToAllLevels ||
                course.classLevels.some(
                    (cl) => cl.classLevelId === user.studentProfile?.classLevelId
                );
            // Siswa yang sudah terdaftar (enrolled) tetap berhak mengakses kursus walaupun tingkatan kelas diubah
            if (!isEnrolled && !isEligibleLevel) return null;
        }

        if (user.role === "tutor") {
            const isAssigned = course.tutors.some(t => t.tutorProfileId === user.tutorProfile?.id);
            if (!isAssigned && !course.isPublished) return null;
        }

        // Ambil info nama pembuat kursus (createdBy adalah user.id)
        let creator: { id: string; name: string; role: string } | null = null;
        if (course.createdBy) {
            creator = await prisma.user.findUnique({
                where: { id: course.createdBy },
                select: {
                    id: true,
                    name: true,
                    role: true,
                },
            });
        }

        return {
            ...course,
            creator,
        };
    } catch (error) {
        console.error("Gagal mengambil basic course info:", error);
        return null;
    }
}

/**
 * 4. Fetch Kursus Milik Tutor Tertentu (Tab "Kursus Saya")
 */
export async function getMyCoursesForTutor(tutorProfileId: string, userId?: string) {
    try {
        const courses = await prisma.course.findMany({
            where: {
                isArchived: false,
                tutors: { some: { tutorProfileId } },
            },
            orderBy: { createdAt: "desc" },
            include: {
                classLevels: { include: { classLevel: true } },
                tutors: { include: { tutorProfile: { include: { user: true } } } },
                _count: { select: { modules: true, enrollments: true } },
            },
        });

        // Urutkan: Author (createdBy === userId) di depan, disusul Co-Author
        if (userId) {
            return courses.sort((a, b) => {
                const aIsAuthor = a.createdBy === userId ? 1 : 0;
                const bIsAuthor = b.createdBy === userId ? 1 : 0;
                if (aIsAuthor !== bIsAuthor) {
                    return bIsAuthor - aIsAuthor; // Author (1) sebelum Co-Author (0)
                }
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
        }

        return courses;
    } catch (error) {
        console.error("Gagal mengambil kursus tutor:", error);
        return [];
    }
}

/**
 * 5. Fetch Kursus Lain yang Tersedia (Tab "Kursus Lain" untuk Tutor)
 */
export async function getOtherCoursesForTutor(tutorProfileId: string) {
    try {
        return await prisma.course.findMany({
            where: {
                isArchived: false,
                isPublished: true,
                tutors: { none: { tutorProfileId } },
            },
            orderBy: { createdAt: "desc" },
            include: {
                classLevels: { include: { classLevel: true } },
                tutors: { include: { tutorProfile: { include: { user: true } } } },
                _count: { select: { modules: true, enrollments: true } },
            },
        });
    } catch (error) {
        console.error("Gagal mengambil kursus lain untuk tutor:", error);
        return [];
    }
}

/**
 * 6. Fetch Daftar Siswa yang Ter-enroll pada Kursus Beserta Progres Belajarnya
 * Menghitung progres akurat: (materi selesai + kuis lulus) / (total materi + kuis)
 */
export async function getEnrolledStudentsForCourse(courseId: string) {
    const user = await getAuthenticatedUser();
    if (!user || (user.role !== "admin" && user.role !== "tutor")) return [];

    try {
        // Ambil info modul kursus untuk mendapatkan semua ID materi & kuis
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: {
                modules: {
                    select: {
                        lessons: { select: { id: true } },
                        quiz: { select: { id: true } },
                    },
                },
            },
        });

        if (!course) return [];

        const lessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
        const quizIds = course.modules.flatMap((m) => (m.quiz ? [m.quiz.id] : []));
        const totalItems = lessonIds.length + quizIds.length;

        // Ambil seluruh enrollment kursus beserta data siswa dan progresnya
        const enrollments = await prisma.enrollment.findMany({
            where: { courseId },
            orderBy: { enrolledAt: "desc" },
            include: {
                student: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true, avatarUrl: true },
                        },
                        classLevel: {
                            select: { id: true, name: true },
                        },
                        lessonProgresses: {
                            where: {
                                lessonId: { in: lessonIds },
                                isCompleted: true,
                            },
                            select: { lessonId: true },
                        },
                        quizProgresses: {
                            where: {
                                quizId: { in: quizIds },
                                isPassed: true,
                            },
                            select: { quizId: true },
                        },
                    },
                },
            },
        });

        return enrollments.map((enrollment) => {
            const completedLessons = enrollment.student.lessonProgresses.length;
            const passedQuizzes = enrollment.student.quizProgresses.length;
            const completedItems = completedLessons + passedQuizzes;
            const progressPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

            return {
                enrollmentId: enrollment.id,
                enrolledAt: enrollment.enrolledAt,
                studentId: enrollment.student.id,
                name: enrollment.student.user.name,
                email: enrollment.student.user.email,
                avatarUrl: enrollment.student.user.avatarUrl,
                classLevelName: enrollment.student.classLevel.name,
                totalItems,
                completedItems,
                progressPercentage,
                isCompleted: totalItems > 0 && completedItems === totalItems,
            };
        });
    } catch (error) {
        console.error("Gagal mengambil data siswa enrolled:", error);
        return [];
    }
}
