import Link from "next/link";
import { getCourses } from "@/lib/data/course";
import ArchiveCourseButton from "@/components/course/ArchiveCourseButton";
import UnarchiveCourseButton from "@/components/course/UnarchiveCourseButton";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/ui/skeletons";

export const metadata = {
    title: "Manajemen Kursus - Admin",
};

export default async function AdminCoursesPage(props: {
    searchParams: Promise<{ status?: string }>;
}) {
    const searchParams = await props.searchParams;
    const currentStatus = (searchParams.status as "active" | "archived" | "all") || "active";

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                <header className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div>
                        <Link
                            href="/admin"
                            className="text-xs text-blue-600 hover:underline mb-1 inline-block"
                        >
                            &larr; Kembali ke Dashboard Admin
                        </Link>
                        <h1 className="text-xl font-bold text-slate-900">Daftar Kursus (Admin)</h1>
                        <p className="text-xs text-slate-600">Kelola semua kursus dalam platform</p>
                    </div>
                    <Link
                        href="/admin/courses/new"
                        className="bg-blue-600 text-white text-sm px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                    >
                        + Buat Kursus
                    </Link>
                </header>

                {/* Tab Filter Status Kursus */}
                <div className="flex gap-2 border-b border-slate-200 pb-1">
                    <Link
                        href="/admin/courses?status=active"
                        className={`px-3 py-1.5 text-xs font-semibold rounded-t-md transition-colors ${currentStatus === "active"
                                ? "bg-white text-blue-600 border-b-2 border-blue-600 shadow-sm"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                            }`}
                    >
                        Aktif
                    </Link>
                    <Link
                        href="/admin/courses?status=archived"
                        className={`px-3 py-1.5 text-xs font-semibold rounded-t-md transition-colors ${currentStatus === "archived"
                                ? "bg-white text-blue-600 border-b-2 border-blue-600 shadow-sm"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                            }`}
                    >
                        Diarsipkan
                    </Link>
                    <Link
                        href="/admin/courses?status=all"
                        className={`px-3 py-1.5 text-xs font-semibold rounded-t-md transition-colors ${currentStatus === "all"
                                ? "bg-white text-blue-600 border-b-2 border-blue-600 shadow-sm"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                            }`}
                    >
                        Semua
                    </Link>
                </div>

                <Suspense key={currentStatus} fallback={<TableSkeleton />}>
                    <CourseTable status={currentStatus} />
                </Suspense>
            </div>
        </div>
    );
}

async function CourseTable({ status }: { status: "active" | "archived" | "all" }) {
    const courses = await getCourses({ status });

    return (
        <div className="overflow-x-auto bg-white border border-slate-200 rounded-lg shadow-sm">
            <table className="w-full text-left text-sm text-slate-800">
                <thead className="bg-slate-100 border-b border-slate-200 text-xs font-semibold uppercase text-slate-700">
                    <tr>
                        <th className="py-3 px-4">Judul</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Tingkatan</th>
                        <th className="py-3 px-4">Tutor Pengampu</th>
                        <th className="py-3 px-4 text-center">Siswa</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                    {courses.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="py-8 px-4 text-center text-slate-500">
                                Belum ada kursus pada filter ini.
                            </td>
                        </tr>
                    ) : (
                        courses.map((course) => (
                            <tr key={course.id} className="hover:bg-slate-50">
                                <td className="py-3 px-4">
                                    <div className="font-medium text-slate-900">{course.title}</div>
                                    <div className="text-xs text-slate-500">{course._count?.modules || 0} Modul</div>
                                </td>
                                <td className="py-3 px-4">
                                    {course.isArchived ? (
                                        <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded bg-slate-200 text-slate-700">
                                            Diarsipkan
                                        </span>
                                    ) : (
                                        <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded ${course.isPublished ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {course.isPublished ? 'Published' : 'Draft'}
                                        </span>
                                    )}
                                </td>
                                <td className="py-3 px-4 text-xs text-slate-600">
                                    {course.visibleToAllLevels ? "Semua Tingkatan" :
                                        course.classLevels.length > 0
                                            ? course.classLevels.map(cl => cl.classLevel.name).join(", ")
                                            : "-"}
                                </td>
                                <td className="py-3 px-4 text-xs text-slate-600">
                                    {course.tutors.length > 0
                                        ? course.tutors.map(t => t.tutorProfile.user.name).join(", ")
                                        : "-"}
                                </td>
                                <td className="py-3 px-4 text-xs font-medium text-slate-700 text-center">
                                    {(course._count as any)?.enrollments || 0}
                                </td>
                                <td className="py-3 px-4 flex justify-end gap-3 items-center">
                                    <Link
                                        href={`/admin/courses/${course.id}/edit`}
                                        className="text-blue-600 hover:text-blue-900 text-xs font-medium hover:underline"
                                    >
                                        Edit
                                    </Link>
                                    {course.isArchived ? (
                                        <UnarchiveCourseButton courseId={course.id} />
                                    ) : (
                                        <ArchiveCourseButton courseId={course.id} />
                                    )}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
