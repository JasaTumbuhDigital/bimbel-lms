import { prisma } from "@/lib/prisma";

/**
 * Mengambil daftar modul beserta materi di dalamnya untuk keperluan manajemen kursus.
 * Fungsi ini digunakan di halaman admin dan tutor untuk menampilkan dan menyusun modul.
 */
export async function getModulesByCourseId(courseId: string) {
    return prisma.module.findMany({
        where: { courseId },
        orderBy: { sortOrder: "asc" },
        include: {
            lessons: {
                orderBy: { sortOrder: "asc" },
            },
        },
    });
}
