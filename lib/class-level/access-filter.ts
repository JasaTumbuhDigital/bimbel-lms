/**
 * Helper Query Filter Akses Kursus Berdasarkan Tingkatan Kelas Siswa (FR-38 & TSD §5.4)
 *
 * Fungsi ini menghasilkan objek klausa Prisma `where` yang memfilter rilis kursus:
 * 1. Kursus yang memiliki flag `visibleToAllLevels: true` (terbuka untuk semua tingkatan).
 * 2. ATAU Kursus yang terhubung khusus ke `classLevelId` milik siswa tersebut via pivot `courseClassLevels`.
 */
export function getAccessibleCourseFilter(studentClassLevelId: string) {
  return {
    isPublished: true,
    OR: [
      { visibleToAllLevels: true },
      {
        courseClassLevels: {
          some: {
            classLevelId: studentClassLevelId,
          },
        },
      },
    ],
  };
}
