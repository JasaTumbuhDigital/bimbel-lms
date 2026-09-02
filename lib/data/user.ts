import { prisma } from "@/lib/prisma";
import { checkAdminPermission } from "@/lib/data/auth";

/**
 * Fetch Seluruh Daftar Siswa (Admin Only)
 */
export async function getStudents() {
    const admin = await checkAdminPermission();
    if (!admin) return [];

    try {
        const students = await prisma.user.findMany({
            where: { role: "student" },
            orderBy: { createdAt: "desc" },
            include: {
                studentProfile: {
                    include: {
                        classLevel: true,
                    },
                },
            },
        });
        return students;
    } catch {
        return [];
    }
}

/**
 * Fetch Tutor profiles for dropdowns/selection (Admin & Tutor)
 */
export async function getTutorsForSelect() {
    try {
        return await prisma.tutorProfile.findMany({
            select: {
                id: true,
                user: { select: { id: true, name: true } }
            },
            orderBy: { user: { name: "asc" } }
        });
    } catch {
        return [];
    }
}
