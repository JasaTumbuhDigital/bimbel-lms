import { notFound, redirect } from "next/navigation";
import { getCourseBasicInfo, getCourseById } from "@/lib/data/course";
import { getAuthenticatedUser } from "@/lib/data/auth";
import { getPublicUrl } from "@/lib/supabase-storage";
import Image from "next/image";
import Link from "next/link";
import EnrollButton from "@/components/course/EnrollButton";
import { WishlistButton } from "@/components/student/wishlist-button";
import { CourseReviewSection } from "@/components/student/course-review-section";
import { getCourseReviewsData, getStudentReviewForCourse } from "@/lib/data/review";
import { prisma } from "@/lib/prisma";
import { Suspense } from "react";
import { CurriculumSkeleton } from "@/components/ui/skeletons";

export const metadata = {
    title: "Detail Kursus - Student",
};

export default async function StudentCourseDetailPage(props: { params: Promise<{ id: string }> }) {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== "student") {
        redirect("/login");
    }

    const { id } = await props.params;
    const courseBasic = await getCourseBasicInfo(id);

    if (!courseBasic) {
        notFound();
    }

    const isEnrolled = courseBasic.enrollments && courseBasic.enrollments.length > 0;

    // --- Data Wishlist & Reviews yang ringan ---
    const studentId = user.studentProfile?.id;
    let isWishlisted = false;
    let studentReview = null;

    if (studentId) {
        const existingWishlist = await prisma.wishlist.findUnique({
            where: { studentId_courseId: { studentId, courseId: courseBasic.id } }
        });
        isWishlisted = !!existingWishlist;

        if (isEnrolled) {
            studentReview = await getStudentReviewForCourse(courseBasic.id);
        }
    }

    const fullImageUrl = getPublicUrl(courseBasic.thumbnailUrl || null);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
            {/* Header / Hero Section - Load Instan */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-5xl mx-auto px-6 py-8 md:py-12 flex flex-col md:flex-row gap-8 items-center md:items-start">

                    {/* Thumbnail */}
                    <div className="w-full md:w-1/3 aspect-video relative rounded-xl overflow-hidden shadow-sm bg-slate-100 flex-shrink-0">
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

                    {/* Course Info */}
                    <div className="flex-1 space-y-4">
                        <Link href="/student/courses" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
                            &larr; Kembali ke Daftar Kursus
                        </Link>
                        <h1 className="text-3xl font-bold text-slate-900">{courseBasic.title}</h1>
                        <p className="text-slate-600 leading-relaxed text-sm md:text-base">
                            {courseBasic.description || "Tidak ada deskripsi kursus yang tersedia."}
                        </p>

                        <div className="text-xs text-slate-500 font-medium">
                            Dibuat oleh:{" "}
                            <span className="text-slate-700 font-semibold">
                                {courseBasic.creator?.name || "Tutor Bimbel"}
                            </span>
                        </div>

                        <div className="pt-4 flex flex-col sm:flex-row items-center gap-4">
                            {!isEnrolled ? (
                                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                    <EnrollButton courseId={courseBasic.id} />
                                    <WishlistButton courseId={courseBasic.id} initialIsWishlisted={isWishlisted} />
                                </div>
                            ) : null}

                            <div className="text-sm text-slate-500 font-medium bg-slate-100 px-4 py-2 rounded-lg">
                                {courseBasic._count.modules} Modul
                            </div>
                        </div>

                        {/* Progress Bar Skeleton while loading full curriculum */}
                        <Suspense fallback={<div className="pt-4 mt-4 border-t border-slate-100 h-16 animate-pulse bg-slate-50 rounded"></div>}>
                            <CourseProgress courseId={courseBasic.id} isEnrolled={isEnrolled} />
                        </Suspense>
                    </div>
                </div>
            </div>

            {/* Kurikulum & Review - Suspended */}
            <Suspense fallback={<CurriculumSkeleton />}>
                <CourseCurriculum courseId={courseBasic.id} isEnrolled={isEnrolled} studentReview={studentReview} />
            </Suspense>
        </div>
    );
}

// --- Komponen-Komponen Async yang Suspended ---

async function CourseProgress({ courseId, isEnrolled }: { courseId: string, isEnrolled: boolean }) {
    if (!isEnrolled) return null;

    // Kita butuh getCourseById untuk menghitung progress materi & kuis
    const course = await getCourseById(courseId);
    if (!course) return null;

    let firstLessonId: string | null = null;
    let totalItems = 0;
    let completedItems = 0;

    course.modules.forEach((module) => {
        // 1. Hitung materi (lessons)
        totalItems += module.lessons.length;
        if (!firstLessonId && module.lessons.length > 0) {
            firstLessonId = module.lessons[0].id;
        }
        module.lessons.forEach((lesson) => {
            if ((lesson as any).progress && (lesson as any).progress.length > 0 && (lesson as any).progress[0].isCompleted) {
                completedItems++;
            }
        });

        // 2. Hitung kuis modul jika ada
        if (module.quiz) {
            totalItems += 1;
            if (module.quiz.progress && module.quiz.progress.length > 0 && module.quiz.progress[0].isPassed) {
                completedItems++;
            }
        }
    });

    const progressPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    const isCourseCompleted = totalItems > 0 && completedItems === totalItems;

    return (
        <>
            <div className="pt-4 mt-4 border-t border-slate-100">
                <Link
                    href={firstLessonId ? `/student/courses/${course.id}/learn/${firstLessonId}` : "#"}
                    className="inline-block w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg shadow-md hover:shadow-lg transition-all text-center mb-4"
                >
                    {firstLessonId ? "Lanjutkan Belajar" : "Belum Ada Materi"}
                </Link>

                <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700">Progres Belajar</span>
                    <span className="text-slate-500">{completedItems} / {totalItems} Materi & Kuis ({progressPercentage}%)</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                        className={`h-2 rounded-full ${isCourseCompleted ? 'bg-green-500' : 'bg-blue-600'}`}
                        style={{ width: `${progressPercentage}%` }}
                    ></div>
                </div>
                {isCourseCompleted && (
                    <p className="text-sm text-green-600 font-medium mt-2 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Selamat! Anda telah menyelesaikan seluruh materi dan kuis di kursus ini.
                    </p>
                )}
            </div>
        </>
    );
}

async function CourseCurriculum({ courseId, isEnrolled, studentReview }: { courseId: string, isEnrolled: boolean, studentReview: any }) {
    const course = await getCourseById(courseId);
    if (!course) return null;

    const { reviews } = await getCourseReviewsData(course.id);

    return (
        <>
            {/* Kurikulum / Daftar Modul */}
            <div className="max-w-3xl mx-auto px-6 py-12">
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Kurikulum Kursus</h2>

                {course.modules.length === 0 ? (
                    <div className="p-8 text-center bg-white border border-slate-200 rounded-xl text-slate-500">
                        Belum ada modul materi di kursus ini.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {course.modules.map((module, index) => (
                            <div key={module.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                {/* Module Header */}
                                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                                    <h3 className="font-semibold text-slate-800">
                                        Modul {index + 1}: {module.title}
                                    </h3>
                                </div>

                                {/* Lessons List */}
                                <div className="divide-y divide-slate-100">
                                    {module.lessons.length === 0 ? (
                                        <p className="px-6 py-4 text-sm text-slate-500 italic">Belum ada materi di modul ini.</p>
                                    ) : (
                                        module.lessons.map((lesson, lIndex) => {
                                            const isDone = (lesson as any).progress && (lesson as any).progress.length > 0 && (lesson as any).progress[0].isCompleted;
                                            return (
                                                <div key={lesson.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isDone ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                            {isDone ? (
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                                            ) : (
                                                                `${index + 1}.${lIndex + 1}`
                                                            )}
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-medium text-slate-700">{lesson.title}</h4>
                                                            <p className="text-[11px] text-slate-500 uppercase mt-0.5 tracking-wider">{lesson.contentType}</p>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        {isEnrolled ? (
                                                            <Link
                                                                href={`/student/courses/${course.id}/learn/${lesson.id}`}
                                                                className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                                            >
                                                                Buka
                                                            </Link>
                                                        ) : (
                                                            <span className="text-sm font-medium text-slate-400">Terkunci</span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                    {/* QUIZ DI COURSE DETAIL */}
                                    {module.quiz && (
                                        <div className="flex items-center justify-between px-6 py-4 bg-purple-50 hover:bg-purple-100/50 transition-colors border-t border-purple-100">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-purple-100 text-purple-700">
                                                    {module.quiz.progress && module.quiz.progress.length > 0 && module.quiz.progress[0].isPassed ? (
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                                    ) : (
                                                        "Q"
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-medium text-purple-900">Evaluasi: {module.quiz.title}</h4>
                                                    <p className="text-[11px] text-purple-600 uppercase mt-0.5 tracking-wider">Kuis Modul</p>
                                                </div>
                                            </div>
                                            <div>
                                                {isEnrolled ? (
                                                    <Link
                                                        href={`/student/courses/${course.id}/quiz/${module.quiz.id}`}
                                                        className="text-sm font-medium text-purple-700 hover:text-purple-900 hover:underline"
                                                    >
                                                        Mulai Kuis
                                                    </Link>
                                                ) : (
                                                    <span className="text-sm font-medium text-purple-400">Terkunci</span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Bagian Ulasan (Review) */}
            <div className="max-w-3xl mx-auto px-6 pb-12">
                <CourseReviewSection
                    courseId={course.id}
                    isEnrolled={isEnrolled}
                    studentReview={studentReview}
                    reviews={reviews as any}
                />
            </div>
        </>
    );
}
