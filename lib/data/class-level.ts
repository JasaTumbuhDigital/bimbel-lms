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
    } catch {
        return [];
    }
}

/**
 * Fetch Tingkatan Kelas untuk Dropdown
 */
export async function getClassLevelsForSelect() {
    try {
        return await prisma.classLevel.findMany({
            select: { id: true, name: true },
            orderBy: { name: "asc" }
        });
    } catch {
        return [];
    }
}