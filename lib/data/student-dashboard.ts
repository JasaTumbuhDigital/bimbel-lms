import { prisma } from "@/lib/prisma";

export async function getStudentDashboardSummary(studentId: string) {
    // 1. Ambil semua kursus yang di-enroll oleh siswa ini beserta ID materinya
    const courses = await prisma.course.findMany({
        where: { 
            enrollments: { some: { studentId } },
            isPublished: true,
            isArchived: false
        },
        select: {
            id: true,
            title: true,
            thumbnailUrl: true,
            modules: {
                select: {
                    lessons: { select: { id: true } }
                }
            },
        },
    });

    // 2. Ambil semua lesson yang sudah ditandai selesai oleh siswa ini
    const completedLessons = await prisma.lessonProgress.findMany({
        where: { studentId, isCompleted: true },
        select: { lessonId: true },
    });

    // Gunakan Set agar pencarian ID lebih cepat
    const completedIds = new Set(completedLessons.map((p) => p.lessonId));

    // 3. Hitung progress masing-masing kursus
    const perCourse = courses.map((c) => {
        const lessonIds = c.modules.flatMap((m) => m.lessons.map((l) => l.id));
        const total = lessonIds.length;
        const completed = lessonIds.filter((id) => completedIds.has(id)).length;

        // Selesai = Semua materi beres. Kursus kosong (0 materi) tidak dianggap selesai.
        const isSelesai = total > 0 && completed === total;
        const progressPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
            courseId: c.id,
            title: c.title,
            thumbnailUrl: c.thumbnailUrl,
            total,
            completed,
            isSelesai,
            progressPercentage
        };
    });

    // 4. Susun ringkasan statistik (Enrolled, Selesai, Aktif)
    const summary = {
        enrolled: perCourse.length,
        selesai: perCourse.filter((c) => c.isSelesai).length,
        aktif: perCourse.length - perCourse.filter((c) => c.isSelesai).length,
        perCourse,
    };

    return summary;
}
