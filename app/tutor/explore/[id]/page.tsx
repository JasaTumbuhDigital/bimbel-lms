import { notFound, redirect } from "next/navigation";
import { getCourseById } from "@/lib/data/course";
import { getAuthenticatedUser } from "@/lib/data/auth";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { institutionConfig } from "@/config/institution";

export const metadata = {
    title: "Detail Kursus Eksplorasi - Tutor",
};

export default async function TutorExploreCourseDetailPage(props: { params: Promise<{ id: string }> }) {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== "tutor") {
        redirect("/login");
    }

    const params = await props.params;
    const course = await getCourseById(params.id);

    if (!course) {
        notFound();
    }

    // Hitung statistik pelajaran
    let firstLessonId: string | null = null;
    let totalLessons = 0;

    course.modules.forEach((module) => {
        totalLessons += module.lessons.length;
        if (!firstLessonId && module.lessons.length > 0) {
            firstLessonId = module.lessons[0].id;
        }
    });

    const supabase = await createClient();
    const STORAGE_BUCKET = institutionConfig.shortName.toLowerCase();
    const fullImageUrl = course.thumbnailUrl 
        ? supabase.storage.from(STORAGE_BUCKET).getPublicUrl(course.thumbnailUrl).data.publicUrl
        : null;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
            {/* Header / Hero Section */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-5xl mx-auto px-6 py-8 md:py-12 flex flex-col md:flex-row gap-8 items-center md:items-start">
                    
                    {/* Thumbnail */}
                    <div className="w-full md:w-1/3 aspect-video relative rounded-xl overflow-hidden shadow-sm bg-slate-100 flex-shrink-0">
                        {fullImageUrl ? (
                            <Image 
                                src={fullImageUrl}
                                alt={course.title}
                                fill
                                className="object-cover"
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
                        <Link href="/tutor/explore" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
                            &larr; Kembali ke Eksplorasi Kursus
                        </Link>
                        <h1 className="text-3xl font-bold text-slate-900">{course.title}</h1>
                        <p className="text-slate-600 leading-relaxed text-sm md:text-base">
                            {course.description || "Tidak ada deskripsi kursus yang tersedia."}
                        </p>
                        
                        <div className="pt-4 flex flex-col sm:flex-row items-center gap-4">
                            <Link 
                                href={firstLessonId ? `/tutor/explore/${course.id}/learn/${firstLessonId}` : "#"}
                                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg shadow-md hover:shadow-lg transition-all text-center"
                            >
                                {firstLessonId ? "Mulai Eksplorasi" : "Belum Ada Materi"}
                            </Link>
                            
                            <div className="text-sm text-slate-500 font-medium bg-slate-100 px-4 py-2 rounded-lg">
                                {course.modules.length} Modul &bull; {totalLessons} Materi
                            </div>
                        </div>
                    </div>
                </div>
            </div>

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
                                            return (
                                            <div key={lesson.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-blue-100 text-blue-700`}>
                                                        {`${index + 1}.${lIndex + 1}`}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-medium text-slate-700">{lesson.title}</h4>
                                                        <p className="text-[11px] text-slate-500 uppercase mt-0.5 tracking-wider">{lesson.contentType}</p>
                                                    </div>
                                                </div>
                                                <div>
                                                    <Link 
                                                        href={`/tutor/explore/${course.id}/learn/${lesson.id}`}
                                                        className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                                    >
                                                        Buka
                                                    </Link>
                                                </div>
                                            </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
