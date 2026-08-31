import Link from "next/link";
import { getCourses } from "@/lib/data/course";
import { getAuthenticatedUser } from "@/lib/data/auth";
import { prisma } from "@/lib/prisma";

export const metadata = {
    title: "Eksplorasi Kursus - Tutor",
};

export default async function TutorCoursesPage() {
    const courses = await getCourses();
    const user = await getAuthenticatedUser();
    const userId = user?.id;
    
    let tutorProfileId: string | null = null;
    if (userId) {
        const profile = await prisma.tutorProfile.findUnique({ where: { userId } });
        if (profile) tutorProfileId = profile.id;
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                <header className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div>
                        <Link
                            href="/tutor"
                            className="text-xs text-blue-600 hover:underline mb-1 inline-block"
                        >
                            &larr; Kembali ke Dashboard Tutor
                        </Link>
                        <h1 className="text-xl font-bold text-slate-900">Eksplorasi Kursus</h1>
                        <p className="text-xs text-slate-600">Anda dapat melihat semua kursus, tetapi hanya dapat mengedit kursus yang Anda ampu.</p>
                    </div>
                    <Link 
                        href="/tutor/courses/new" 
                        className="bg-blue-600 text-white text-sm px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                    >
                        + Buat Kursus
                    </Link>
                </header>

                <div className="overflow-x-auto bg-white border border-slate-200 rounded-lg shadow-sm">
                    <table className="w-full text-left text-sm text-slate-800">
                        <thead className="bg-slate-100 border-b border-slate-200 text-xs font-semibold uppercase text-slate-700">
                            <tr>
                                <th className="py-3 px-4">Judul</th>
                                <th className="py-3 px-4">Status</th>
                                <th className="py-3 px-4">Tingkatan</th>
                                <th className="py-3 px-4">Tutor Pengampu</th>
                                <th className="py-3 px-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {courses.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-8 px-4 text-center text-slate-500">
                                        Belum ada kursus yang tersedia.
                                    </td>
                                </tr>
                            ) : (
                                courses.map((course) => {
                                    const isMyCourse = tutorProfileId && course.tutors.some(t => t.tutorProfileId === tutorProfileId);
                                    
                                    return (
                                        <tr key={course.id} className="hover:bg-slate-50">
                                            <td className="py-3 px-4">
                                                <div className="font-medium text-slate-900">{course.title}</div>
                                                <div className="text-xs text-slate-500">{course._count?.modules || 0} Modul</div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded ${course.isPublished ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                    {course.isPublished ? 'Published' : 'Draft'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-xs text-slate-600">
                                                {course.visibleToAllLevels ? "Semua Tingkatan" : 
                                                    course.classLevels.length > 0 
                                                    ? course.classLevels.map(cl => cl.classLevel.name).join(", ") 
                                                    : "-"}
                                            </td>
                                            <td className="py-3 px-4 text-xs text-slate-600">
                                                {course.tutors.length > 0 
                                                    ? course.tutors.map(t => (
                                                        <span key={t.id} className={t.tutorProfileId === tutorProfileId ? "font-bold text-blue-600" : ""}>
                                                            {t.tutorProfile.user.name}
                                                        </span>
                                                      )).reduce((prev, curr) => [prev, ", ", curr] as any)
                                                    : "-"}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                {isMyCourse ? (
                                                    <Link 
                                                        href={`/tutor/courses/${course.id}/edit`} 
                                                        className="text-blue-600 hover:text-blue-900 text-xs font-medium hover:underline"
                                                    >
                                                        Kelola Kursus
                                                    </Link>
                                                ) : (
                                                    <Link 
                                                        href={`/tutor/courses/${course.id}`} 
                                                        className="text-slate-600 hover:text-slate-900 text-xs font-medium hover:underline"
                                                    >
                                                        Lihat Detail
                                                    </Link>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
