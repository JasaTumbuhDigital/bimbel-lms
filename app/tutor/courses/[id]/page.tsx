import { notFound, redirect } from "next/navigation";
import { getCourseBasicInfo, getCourseById, getEnrolledStudentsForCourse } from "@/lib/data/course";
import { getAuthenticatedUser } from "@/lib/data/auth";
import { getPublicUrl } from "@/lib/supabase-storage";
import { getReviewsForTutorCourse } from "@/lib/data/review";
import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { Suspense } from "react";
import { CurriculumSkeleton, TableSkeleton } from "@/components/ui/skeletons";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const course = await getCourseBasicInfo(id);
    return {
        title: course ? `${course.title} - Detail Kursus Tutor` : "Detail Kursus - Tutor",
    };
}

export default async function TutorCourseDetailPage(props: { params: Promise<{ id: string }> }) {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== "tutor") {
        redirect("/login");
    }

    const { id } = await props.params;
    // Query cepat untuk header
    const courseBasic = await getCourseBasicInfo(id);

    if (!courseBasic) {
        notFound();
    }

    const hasEditAccess = user.tutorProfile
        ? courseBasic.tutors.some((t) => t.tutorProfileId === user.tutorProfile?.id)
        : false;

    const isAuthor = courseBasic.createdBy === user.id;

    const fullImageUrl = getPublicUrl(courseBasic.thumbnailUrl || null);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
            {/* Header / Hero Section (Render Instan) */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-5xl mx-auto px-6 py-8 md:py-12 flex flex-col md:flex-row gap-8 items-center md:items-start">
                    {/* Thumbnail */}
                    <div className="w-full md:w-1/3 aspect-video relative rounded-xl overflow-hidden shadow-sm bg-slate-100 shrink-0">
                        {fullImageUrl ? (
                            <Image
                                src={fullImageUrl}
                                alt={courseBasic.title}
                                fill
                                className="object-cover"
                                priority
                                unoptimized
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                        )}
                    </div>

                    {/* Info Kursus */}
                    <div className="flex-1 space-y-4">
                        <Link href="/tutor/courses" className="text-xs text-blue-600 hover:underline mb-1 inline-block font-medium">
                            &larr; Kembali ke Daftar Kursus
                        </Link>

                        <div className="flex items-center gap-2 flex-wrap">
                            {hasEditAccess ? (
                                <span
                                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded shadow-sm uppercase ${isAuthor
                                        ? "bg-purple-600 text-white"
                                        : "bg-sky-600 text-white"
                                        }`}
                                >
                                    {isAuthor ? "Author" : "Co-Author"}
                                </span>
                            ) : (
                                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded shadow-sm uppercase bg-slate-800/80 text-white">
                                    Eksplorasi
                                </span>
                            )}
                            <span
                                className={`text-[10px] font-bold px-2.5 py-0.5 rounded shadow-sm uppercase ${courseBasic.isPublished
                                    ? "bg-green-600 text-white"
                                    : "bg-yellow-500 text-white"
                                    }`}
                            >
                                {courseBasic.isPublished ? "Published" : "Draft"}
                            </span>
                        </div>

                        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{courseBasic.title}</h1>
                        <p className="text-slate-600 leading-relaxed text-sm">
                            {courseBasic.description || "Tidak ada deskripsi kursus yang tersedia."}
                        </p>

                        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                            <span>{courseBasic._count.modules} Modul</span>
                            <span>•</span>
                            <span>
                                Dibuat oleh:{" "}
                                <span className="text-slate-700 font-semibold">
                                    {courseBasic.creator?.name || "Tutor Bimbel"}
                                </span>
                            </span>
                        </div>

                        {/* Tombol Aksi */}
                        <div className="pt-3 flex flex-wrap items-center gap-3">
                            {hasEditAccess && (
                                <Link
                                    href={`/tutor/courses/${courseBasic.id}/edit`}
                                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 px-5 rounded-lg shadow-sm transition-colors"
                                >
                                    Kelola Kursus (Builder)
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Konten Suspended */}
            <div className="max-w-5xl mx-auto px-6 pt-10 space-y-12">
                {/* 1. Kurikulum (Suspended) */}
                <Suspense fallback={<CurriculumSkeleton />}>
                    <TutorCurriculumSection courseId={courseBasic.id} />
                </Suspense>

                {/* 2. Siswa Enrolled (Suspended, jika tutor punya akses) */}
                {hasEditAccess && (
                    <Suspense fallback={<TableSkeleton />}>
                        <EnrolledStudentsSection courseId={courseBasic.id} />
                    </Suspense>
                )}

                {/* 3. Ulasan Siswa (Suspended) */}
                <Suspense fallback={<div className="h-32 bg-white rounded-xl border border-slate-200 animate-pulse"></div>}>
                    <CourseReviewsSection courseId={courseBasic.id} />
                </Suspense>
            </div>
        </div>
    );
}

// --- Sub-Komponen Async yang di-Suspended ---

async function TutorCurriculumSection({ courseId }: { courseId: string }) {
    const course = await getCourseById(courseId);
    if (!course) return null;

    let firstLessonId: string | null = null;
    let totalLessons = 0;
    let totalQuizzes = 0;

    course.modules.forEach((module) => {
        totalLessons += module.lessons.length;
        if (module.quiz) totalQuizzes++;
        if (!firstLessonId && module.lessons.length > 0) {
            firstLessonId = module.lessons[0].id;
        }
    });

    return (
        <section>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Kurikulum Kursus</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        {totalLessons} Materi &bull; {totalQuizzes} Kuis
                    </p>
                </div>

                <Link
                    href={firstLessonId ? `/tutor/courses/${course.id}/learn/${firstLessonId}` : "#"}
                    className={`text-sm font-semibold py-2 px-4 rounded-lg border transition-colors ${firstLessonId
                        ? "bg-white border-slate-300 hover:bg-slate-100 text-slate-700 shadow-sm"
                        : "border-slate-200 text-slate-400 cursor-not-allowed"
                        }`}
                >
                    {firstLessonId ? "Mulai Eksplorasi Materi" : "Belum Ada Materi"}
                </Link>
            </div>

            {course.modules.length === 0 ? (
                <div className="p-8 text-center bg-white border border-slate-200 rounded-xl text-slate-500 text-sm">
                    Belum ada modul materi di kursus ini.
                </div>
            ) : (
                <div className="space-y-4">
                    {course.modules.map((module, index) => (
                        <div key={module.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="bg-slate-50 px-6 py-3.5 border-b border-slate-200 flex items-center justify-between">
                                <h3 className="font-semibold text-slate-800 text-sm">
                                    Modul {index + 1}: {module.title}
                                </h3>
                                <span className="text-xs text-slate-500">
                                    {module.lessons.length} Materi {module.quiz ? "• 1 Kuis" : ""}
                                </span>
                            </div>

                            <div className="divide-y divide-slate-100">
                                {module.lessons.map((lesson, lIndex) => (
                                    <div key={lesson.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-blue-100 text-blue-700">
                                                {index + 1}.{lIndex + 1}
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-medium text-slate-800">{lesson.title}</h4>
                                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">{lesson.contentType}</p>
                                            </div>
                                        </div>
                                        <Link
                                            href={`/tutor/courses/${course.id}/learn/${lesson.id}`}
                                            className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                        >
                                            Buka Preview &rarr;
                                        </Link>
                                    </div>
                                ))}

                                {module.quiz && (
                                    <div className="flex items-center justify-between px-6 py-3.5 bg-purple-50/60 hover:bg-purple-50 transition-colors border-t border-purple-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-purple-100 text-purple-700">
                                                Q
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-medium text-purple-900">Evaluasi: {module.quiz.title}</h4>
                                                <p className="text-[10px] text-purple-600 uppercase tracking-wider">
                                                    Kuis Modul &bull; Passing Score: {module.quiz.passingScorePercent}%
                                                </p>
                                            </div>
                                        </div>
                                        <Link
                                            href={`/tutor/courses/${course.id}/quiz/${module.quiz.id}`}
                                            className="text-xs font-medium text-purple-700 hover:text-purple-900 hover:underline"
                                        >
                                            Lihat Kuis &rarr;
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

async function EnrolledStudentsSection({ courseId }: { courseId: string }) {
    const enrolledStudents = await getEnrolledStudentsForCourse(courseId);

    return (
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">Siswa Terdaftar</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Daftar siswa yang mengikuti kursus ini beserta progres materi & kuis
                    </p>
                </div>
                <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full">
                    {enrolledStudents.length} Siswa
                </span>
            </div>

            {enrolledStudents.length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-slate-400 italic">
                    Belum ada siswa yang mendaftar di kursus ini.
                </p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-800">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-600">
                            <tr>
                                <th className="py-3 px-6">Siswa</th>
                                <th className="py-3 px-4">Tingkatan</th>
                                <th className="py-3 px-4">Tanggal Daftar</th>
                                <th className="py-3 px-6">Progres Belajar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {enrolledStudents.map((student) => (
                                <tr key={student.enrollmentId} className="hover:bg-slate-50">
                                    <td className="py-3.5 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 text-xs font-bold overflow-hidden shrink-0">
                                                {student.avatarUrl ? (
                                                    <img src={student.avatarUrl} alt={student.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    student.name.charAt(0).toUpperCase()
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-900 text-sm">{student.name}</div>
                                                <div className="text-xs text-slate-500">{student.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3.5 px-4 text-xs text-slate-600 font-medium">
                                        {student.classLevelName}
                                    </td>
                                    <td className="py-3.5 px-4 text-xs text-slate-500">
                                        {new Date(student.enrolledAt).toLocaleDateString("id-ID", {
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric",
                                        })}
                                    </td>
                                    <td className="py-3.5 px-6 min-w-45">
                                        <div className="flex items-center justify-between text-xs mb-1">
                                            <span className="font-semibold text-slate-700">{student.progressPercentage}%</span>
                                            <span className="text-slate-500">
                                                {student.completedItems} / {student.totalItems} Selesai
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-200 rounded-full h-1.5">
                                            <div
                                                className={`h-1.5 rounded-full ${student.isCompleted ? "bg-green-500" : "bg-blue-600"}`}
                                                style={{ width: `${student.progressPercentage}%` }}
                                            ></div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

async function CourseReviewsSection({ courseId }: { courseId: string }) {
    const reviews = await getReviewsForTutorCourse(courseId);
    const averageRating =
        reviews.length > 0
            ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
            : null;

    return (
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">Ulasan Siswa</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Ulasan dan rating dari siswa yang telah mengikuti kursus ini
                    </p>
                </div>
                {averageRating && (
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span>{averageRating}</span>
                        <span className="font-normal text-slate-400">({reviews.length} ulasan)</span>
                    </div>
                )}
            </div>

            {reviews.length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-slate-400 italic">
                    Belum ada ulasan untuk kursus ini.
                </p>
            ) : (
                <div className="divide-y divide-slate-100">
                    {reviews.map((review) => (
                        <div key={review.id} className="px-6 py-4 flex items-start gap-4">
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold shrink-0 overflow-hidden">
                                {review.student.user.avatarUrl ? (
                                    <img src={review.student.user.avatarUrl} alt={review.student.user.name} className="w-full h-full object-cover" />
                                ) : (
                                    review.student.user.name.charAt(0).toUpperCase()
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium text-slate-800">{review.student.user.name}</span>
                                    <div className="flex items-center gap-0.5">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <Star
                                                key={star}
                                                className={`w-3 h-3 ${star <= review.rating
                                                    ? "fill-yellow-400 text-yellow-400"
                                                    : "fill-slate-100 text-slate-200"
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                                {review.comment && (
                                    <p className="text-xs text-slate-600 leading-relaxed mt-1">{review.comment}</p>
                                )}
                            </div>
                            <span className="text-[11px] text-slate-400 whitespace-nowrap">
                                {new Date(review.createdAt).toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                })}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
