import { prisma } from "@/lib/prisma";

/**
 * Fetch Seluruh Daftar Tingkatan Kelas (beserta jumlah siswa)
 */
export async function getClassLevels() {
    try {
        const classLevels = await prisma.classLevel.findMany({
            orderBy: { createdAt: "asc" },
            include: {
                _count: {
                    select: { studentProfiles: true },
                },
            },
        });
        return classLevels;
    } catch (error) {
        return [];
    }
}
