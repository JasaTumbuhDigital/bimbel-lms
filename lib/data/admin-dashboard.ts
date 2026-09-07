import { prisma } from "@/lib/prisma";
import { checkAdminPermission } from "./auth";

/**
 * Fetch ringkasan data untuk Dashboard Admin
 */
export async function getAdminDashboardSummary() {
    const admin = await checkAdminPermission();
    if (!admin) return { totalSiswa: 0, totalTutor: 0, totalKursus: 0, kelasBerjalan: 0 };

    try {
        const [totalSiswa, totalTutor, totalKursus, kelasBerjalan] = await Promise.all([
            // 1. Total siswa aktif
            prisma.user.count({
                where: { role: "student", isActive: true }
            }),
            // 2. Total tutor aktif
            prisma.user.count({
                where: { role: "tutor", isActive: true }
            }),
            // 3. Total kursus yang terdaftar
            prisma.course.count({
                where: { isPublished: true, isArchived: false }
            }),
            // 4. Jumlah tingkatan kelas yang memiliki minimal 1 siswa aktif (Kelas Berjalan)
            prisma.classLevel.count({
                where: {
                    studentProfiles: {
                        some: { user: { isActive: true } }
                    }
                },
            }),
        ]);

        return { totalSiswa, totalTutor, totalKursus, kelasBerjalan };
    } catch (error) {
        console.error("Gagal mengambil summary dashboard:", error);
        return { totalSiswa: 0, totalTutor: 0, totalKursus: 0, kelasBerjalan: 0 };
    }
}

