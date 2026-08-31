import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * Helper internal untuk mengecek user yang sedang login dan profil spesifiknya
 */
export async function getAuthenticatedUser() {
    const supabase = await createClient();
    const {
        data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) return null;

    const dbUser = await prisma.user.findUnique({
        where: { authId: authUser.id },
        include: {
            studentProfile: true,
            tutorProfile: true,
            adminProfile: true,
        },
    });

    if (!dbUser || !dbUser.isActive) return null;
    return dbUser;
}

/**
 * Helper internal untuk mengamankan bahwa pemanggil action adalah Admin
 */
export async function checkAdminPermission() {
    const dbUser = await getAuthenticatedUser();

    if (!dbUser || dbUser.role !== "admin") {
        return null;
    }

    return dbUser;
}

/**
 * Fetch Seluruh Daftar Siswa (Admin Only)
 */
export async function getStudents() {
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
    } catch (error) {
        return [];
    }
}
