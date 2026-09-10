import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getMyCoursesForTutor, getOtherCoursesForTutor } from "@/lib/data/course";
import { getAuthenticatedUser } from "@/lib/data/auth";
import { getPublicUrl } from "@/lib/supabase-storage";
import { Suspense } from "react";
import { CardGridSkeleton } from "@/components/ui/skeletons";

export const metadata = {
    title: "Manajemen & Eksplorasi Kursus - Tutor",
};

export default async function TutorCoursesPage(props: {
    searchParams: Promise<{ tab?: string }>;
}) {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== "tutor") {
        redirect("/login");
    }

    const searchParams = await props.searchParams;
    const currentTab = searchParams.tab === "others" ? "others" : "mine";

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                <header className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 gap-4">
                    <div>
                        <Link
                            href="/tutor"
                            className="text-xs text-blue-600 hover:underline mb-1 inline-block"
                        >
                            &larr; Kembali ke Dashboard Tutor
                        </Link>
                        <h1 className="text-xl md:text-2xl font-bold text-slate-900">Kursus</h1>
                        <p className="text-xs text-slate-600 mt-0.5">
                            Kelola kursus yang Anda ampu atau jelajahi materi kursus lainnya.
                        </p>
                    </div>
                    <Link
                        href="/tutor/courses/new"
                        className="self-start sm:self-auto bg-blue-600 text-white text-xs md:text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        + Buat Kursus
                    </Link>
                </header>

                {/* Tab Navigasi: Kursus Saya vs Kursus Lain */}
                <div className="flex gap-2 border-b border-slate-200 pb-1">
                    <Link
                        href="/tutor/courses?tab=mine"
                        className={`px-4 py-2 text-xs font-semibold rounded-t-md transition-colors ${currentTab === "mine"
                            ? "bg-white text-blue-600 border-b-2 border-blue-600 shadow-sm"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                            }`}
                    >
                        Kursus Saya
                    </Link>
                    <Link
                        href="/tutor/courses?tab=others"
                        className={`px-4 py-2 text-xs font-semibold rounded-t-md transition-colors ${currentTab === "others"
                            ? "bg-white text-blue-600 border-b-2 border-blue-600 shadow-sm"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                            }`}
                    >
                        Kursus Lain (Eksplorasi)
                    </Link>
                </div>

                {/* Konten Grid Kartu dengan Suspense & Skeleton */}
                <Suspense key={currentTab} fallback={<CardGridSkeleton />}>
                    <TutorCourseGrid
                        tab={currentTab}
                        tutorProfileId={user.tutorProfile?.id}
                        userId={user.id}
                    />
                </Suspense>
            </div>
        </div>
    );
}

async function TutorCourseGrid({
    tab,
    tutorProfileId,
    userId,
}: {
    tab: "mine" | "others";
    tutorProfileId?: string;
    userId?: string;
}) {
    if (!tutorProfileId) {
        return (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500 text-sm">
                Profil tutor Anda belum terdaftar.
            </div>
        );
    }

    const courses =
        tab === "mine"
            ? await getMyCoursesForTutor(tutorProfileId, userId)
            : await getOtherCoursesForTutor(tutorProfileId);

    if (courses.length === 0) {
        return (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-3">
                <p className="text-slate-500 text-sm">
                    {tab === "mine"
                        ? "Anda belum memiliki kursus yang diampu."
                        : "Belum ada kursus lain yang tersedia."}
                </p>
                {tab === "mine" && (
                    <Link
                        href="/tutor/courses/new"
                        className="inline-block text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                        + Buat Kursus Pertama Anda
                    </Link>
                )}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course, index) => {
                const fullImageUrl = getPublicUrl(course.thumbnailUrl || null);
                const isMyCourse = tab === "mine";
                const isAuthor = course.createdBy === userId;

                return (
                    <div
                        key={course.id}
                        className="group flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all"
                    >
                        {/* Thumbnail */}
                        <div className="relative w-full aspect-video bg-slate-100 border-b border-slate-100">
                            {fullImageUrl ? (
                                <Image
                                    src={fullImageUrl}
                                    alt={course.title}
                                    fill
                                    priority={index < 3}
                                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                                    unoptimized
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                            )}

                            {/* Badge Status & Peran */}
                            <div className="absolute top-3 right-3 flex items-center gap-1.5 flex-wrap justify-end">
                                {isMyCourse ? (
                                    <>
                                        <span
                                            className={`text-[10px] font-bold px-2 py-0.5 rounded shadow-sm uppercase ${isAuthor
                                                ? "bg-purple-600 text-white"
                                                : "bg-sky-600 text-white"
                                                }`}
                                        >
                                            {isAuthor ? "Author" : "Co-Author"}
                                        </span>
                                        <span
                                            className={`text-[10px] font-bold px-2 py-0.5 rounded shadow-sm uppercase ${course.isPublished ? "bg-green-600 text-white" : "bg-yellow-500 text-white"
                                                }`}
                                        >
                                            {course.isPublished ? "Published" : "Draft"}
                                        </span>
                                    </>
                                ) : (
                                    <span className="bg-slate-800/80 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm uppercase">
                                        Eksplorasi
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Konten Kartu */}
                        <div className="p-5 flex flex-col grow">
                            <h3 className="font-bold text-slate-900 text-base mb-1.5 line-clamp-2">
                                {course.title}
                            </h3>
                            <p className="text-xs text-slate-600 line-clamp-2 mb-4">
                                {course.description || "Tidak ada deskripsi kursus."}
                            </p>

                            <div className="text-[11px] text-slate-500 font-medium mb-4 space-y-1">
                                <div>
                                    Tingkatan:{" "}
                                    {course.visibleToAllLevels
                                        ? "Semua Tingkatan"
                                        : course.classLevels.length > 0
                                            ? course.classLevels.map((cl) => cl.classLevel.name).join(", ")
                                            : "-"}
                                </div>
                                <div>
                                    {course._count?.modules || 0} Modul &bull;{" "}
                                    {(course._count as any)?.enrollments || 0} Siswa
                                </div>
                            </div>

                            {/* Tombol Aksi */}
                            <div className="pt-3 border-t border-slate-100 mt-auto flex items-center justify-between gap-2">
                                <Link
                                    href={`/tutor/courses/${course.id}`}
                                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                    Lihat Detail &rarr;
                                </Link>

                                {isMyCourse && (
                                    <Link
                                        href={`/tutor/courses/${course.id}/edit`}
                                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-2.5 py-1.5 rounded transition-colors"
                                    >
                                        Edit Kursus
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
