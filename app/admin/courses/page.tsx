import Link from "next/link";
import { getCourses } from "@/lib/data/course";
import ArchiveCourseButton from "@/components/course/ArchiveCourseButton";
import UnarchiveCourseButton from "@/components/course/UnarchiveCourseButton";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/ui/skeletons";
import { getAllReviewsForAdmin } from "@/lib/data/review";
import { DeleteReviewButton } from "@/components/admin/delete-review-button";
import { Star } from "lucide-react";
import ReviewCourseFilter from "@/components/admin/ReviewCourseFilter";

export const metadata = {
    title: "Manajemen Kursus - Admin",
};

export default async function AdminCoursesPage(props: {
    searchParams: Promise<{ status?: string; courseId?: string }>;
}) {
    const searchParams = await props.searchParams;
    const currentStatus = (searchParams.status as "active" | "archived" | "reviews") || "active";
    const courseIdFilter = searchParams.courseId || "";

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
                        <h1 className="text-xl font-bold text-slate-900">Manajemen Kursus & Ulasan</h1>
                        <p className="text-xs text-slate-600">Kelola semua kursus dan ulasan dalam platform</p>
                    </div>
                    {currentStatus !== "reviews" && (
                        <Link
                            href="/admin/courses/new"
                            className="bg-blue-600 text-white text-sm px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                        >
                            + Buat Kursus
                        </Link>
                    )}
                </header>

                {/* Tab Filter Status Kursus */}
                <div className="flex gap-2 border-b border-slate-200 pb-1 items-center justify-between">
                    <div className="flex gap-2">
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
                            href="/admin/courses?status=reviews"
                            className={`px-3 py-1.5 text-xs font-semibold rounded-t-md transition-colors ${currentStatus === "reviews"
                                    ? "bg-white text-blue-600 border-b-2 border-blue-600 shadow-sm"
                                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                                }`}
                        >
                            Ulasan Siswa
                        </Link>
                    </div>
                </div>

                <Suspense key={`${currentStatus}-${courseIdFilter}`} fallback={<TableSkeleton />}>
                    {currentStatus === "reviews" ? (
                        <ReviewsView courseId={courseIdFilter} />
                    ) : (
                        <CourseTable status={currentStatus as any} />
                    )}
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

async function ReviewsView({ courseId }: { courseId: string }) {
    // Ambil daftar semua kursus (aktif & arsip) untuk filter select option
    const courses = await getCourses({ status: "all" });
    const reviews = await getAllReviewsForAdmin(courseId);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <p className="text-sm text-slate-600 font-medium">
                    Menampilkan {reviews.length} ulasan
                </p>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Filter:</span>
                    <ReviewCourseFilter
                        courses={courses.map(c => ({ id: c.id, title: c.title }))}
                        currentCourseId={courseId}
                    />
                </div>
            </div>

            {reviews.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-500 shadow-sm">
                    Belum ada ulasan yang masuk pada filter ini.
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                            <tr>
                                <th className="text-left px-5 py-3 font-medium">Siswa</th>
                                <th className="text-left px-5 py-3 font-medium">Kursus</th>
                                <th className="text-center px-5 py-3 font-medium">Rating</th>
                                <th className="text-left px-5 py-3 font-medium">Komentar</th>
                                <th className="text-left px-5 py-3 font-medium">Tanggal</th>
                                <th className="px-5 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {reviews.map((review) => (
                                <tr key={review.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-5 py-4 font-medium text-slate-800 whitespace-nowrap">
                                        {review.student.user.name}
                                    </td>
                                    <td className="px-5 py-4">
                                        <Link
                                            href={`/admin/courses/${review.course.id}/edit`}
                                            className="text-blue-600 hover:underline line-clamp-1 max-w-50 block"
                                            title={review.course.title}
                                        >
                                            {review.course.title}
                                        </Link>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center justify-center gap-0.5">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                    key={star}
                                                    className={`w-3.5 h-3.5 ${star <= review.rating
                                                            ? "fill-yellow-400 text-yellow-400"
                                                            : "text-slate-200"
                                                        }`}
                                                />
                                            ))}
                                            <span className="ml-1 text-xs text-slate-500">({review.rating})</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-slate-600 max-w-xs">
                                        <p className="line-clamp-2">{review.comment || <span className="italic text-slate-400">—</span>}</p>
                                    </td>
                                    <td className="px-5 py-4 text-slate-400 whitespace-nowrap text-xs">
                                        {new Date(review.createdAt).toLocaleDateString("id-ID", {
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric",
                                        })}
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <DeleteReviewButton reviewId={review.id} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
