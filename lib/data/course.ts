import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "./auth";

/**
 * 1. Fetch Daftar Kursus (Sesuai Hak Akses & Role User)
 */
export async function getCourses() {
    const user = await getAuthenticatedUser();
    if (!user) return [];

    try {
        if (user.role === "admin") {
            return await prisma.course.findMany({
                where: { isArchived: false },
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
                ],
            },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                title: true,
                description: true,
                thumbnailUrl: true,
                enrollments: {
                    where: { studentId: user.studentProfile.id },
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
 * 1b. Fetch Semua Kursus (Khusus Eksplorasi Tutor)
 */
export async function getAllCoursesForPreview() {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== "tutor") return [];

    try {
        return await prisma.course.findMany({
            where: { isPublished: true, isArchived: false },
            orderBy: { createdAt: "desc" },
            include: {
                classLevels: { include: { classLevel: true } },
                tutors: { include: { tutorProfile: { include: { user: true } } } },
                _count: { select: { modules: true } },
            },
        });
    } catch (error) {
        console.error("Gagal mengambil daftar kursus preview:", error);
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

        if (!course || course.isArchived) return null;


        // Validasi Scoping Akses Siswa
        if (user.role === "student") {
            if (!course.isPublished) return null;
            const isEligibleLevel =
                course.visibleToAllLevels ||
                course.classLevels.some(
                    (cl) => cl.classLevelId === user.studentProfile?.classLevelId
                );
            if (!isEligibleLevel) return null;
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

        if (!course || course.isArchived) return null;

        // Validasi Scoping Akses Siswa
        if (user.role === "student") {
            if (!course.isPublished) return null;
            const isEligibleLevel =
                course.visibleToAllLevels ||
                course.classLevels.some(
                    (cl) => cl.classLevelId === user.studentProfile?.classLevelId
                );
            if (!isEligibleLevel) return null;
        }

        if (user.role === "tutor") {
            const isAssigned = course.tutors.some(t => t.tutorProfileId === user.tutorProfile?.id);
            if (!isAssigned && !course.isPublished) return null;
        }

        return course;
    } catch (error) {
        console.error("Gagal mengambil basic course info:", error);
        return null;
    }
}
