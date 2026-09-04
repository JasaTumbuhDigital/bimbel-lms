import Link from "next/link";
import { getAllCoursesForPreview } from "@/lib/data/course";
import { getAuthenticatedUser } from "@/lib/data/auth";
import { getPublicUrl } from "@/lib/supabase-storage";
import { redirect } from "next/navigation";
import Image from "next/image";

export const metadata = {
    title: "Eksplorasi Kursus - Tutor",
};

export default async function TutorExplorePage() {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== "tutor") {
        redirect("/login");
    }

    const courses = await getAllCoursesForPreview();


    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                <header className="border-b border-slate-200 pb-4">
                    <Link
                        href="/tutor"
                        className="text-xs text-blue-600 hover:underline mb-1 inline-block"
                    >
                        &larr; Kembali ke Dashboard Tutor
                    </Link>
                    <h1 className="text-2xl font-bold text-slate-900">Eksplorasi Kursus (Preview)</h1>
                    <p className="text-sm text-slate-600 mt-1">
                        Jelajahi seluruh kursus publik di institusi ini. Anda dapat melihat materi sebagai *Read-Only*.
                    </p>
                </header>

                {courses.length === 0 ? (
                    <div className="bg-white p-8 rounded-lg border border-slate-200 text-center">
                        <p className="text-slate-500">
                            Belum ada kursus publik yang tersedia.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courses.map((course, index) => {
                            const isMyCourse = course.tutors.some(t => t.tutorProfileId === user.tutorProfile?.id);

                            const fullImageUrl = getPublicUrl(course.thumbnailUrl || null);

                            return (
                                <Link
                                    href={`/tutor/explore/${course.id}`}
                                    key={course.id}
                                    className="group flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow relative"
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

                                        {/* Badge My Course */}
                                        {isMyCourse && (
                                            <div className="absolute top-3 right-3 bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm uppercase tracking-wide">
                                                Kursus Anda
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="p-5 flex flex-col flex-grow">
                                        <h3 className="font-bold text-slate-800 text-lg mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                                            {course.title}
                                        </h3>
                                        <p className="text-sm text-slate-600 line-clamp-2 flex-grow mb-4">
                                            {course.description || "Tidak ada deskripsi."}
                                        </p>

                                        <div className="flex items-center justify-between text-xs text-slate-500 mt-auto pt-4 border-t border-slate-100">
                                            <span className="flex items-center gap-1">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                                </svg>
                                                {((course as any)._count)?.modules || 0} Modul
                                            </span>
                                            <span className="font-medium text-blue-600">
                                                Preview Detail &rarr;
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
