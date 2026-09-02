import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/data/auth";
import type { Course, CourseTutor } from "@prisma/client";
import type { User, StudentProfile, TutorProfile, AdminProfile } from "@prisma/client";

type AuthenticatedUser = User & {
    studentProfile: StudentProfile | null;
    tutorProfile: TutorProfile | null;
    adminProfile: AdminProfile | null;
};

type CourseWithTutors = Course & { tutors: CourseTutor[] };

type CourseAccessResult =
    | { success: false; error: string; user?: never; course?: never }
    | { success: true; user: AuthenticatedUser; course: CourseWithTutors };

/**
 * Helper: Validasi Akses Tutor terhadap Kursus
 * Jika requiresOwner = true, hanya Admin & Tutor Utama (createdBy) yang lolos.
 * Jika requiresOwner = false, Admin, Tutor Utama, dan Co-Tutor lolos.
 */
export async function verifyCourseAccess(courseId: string, requiresOwner = false): Promise<CourseAccessResult> {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Tidak terautentikasi" };
    if (user.role !== "admin" && user.role !== "tutor") return { success: false, error: "Akses ditolak" };

    const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: { tutors: true }
    });

    if (!course) return { success: false, error: "Kursus tidak ditemukan" };

    if (user.role === "admin") {
        return { success: true, user, course };
    }



    if (requiresOwner) {
        if (course.createdBy !== user.id) {
            return { success: false, error: "Akses ditolak. Hanya Tutor Utama (Pembuat) yang diizinkan." };
        }
        return { success: true, user, course };
    }

    const isAssigned = course.tutors.some(t => t.tutorProfileId === user.tutorProfile?.id);
    if (!isAssigned && course.createdBy !== user.id) {
         return { success: false, error: "Akses ditolak. Anda tidak di-assign ke kursus ini." };
    }

    return { success: true, user, course };
}
