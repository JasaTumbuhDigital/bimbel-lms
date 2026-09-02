import { notFound, redirect } from "next/navigation";
import { getCourseById } from "@/lib/data/course";
import { getAuthenticatedUser } from "@/lib/data/auth";
import { getPublicUrl } from "@/lib/supabase-storage";
import Link from "next/link";

export const metadata = {
    title: "Preview Materi Eksplorasi - Tutor",
};

// Helper untuk YouTube Embed
function getYouTubeEmbedUrl(url: string) {
    if (!url) return "";
    let videoId = "";
    if (url.includes("v=")) {
        videoId = url.split("v=")[1].split("&")[0];
    } else if (url.includes("youtu.be/")) {
        videoId = url.split("youtu.be/")[1].split("?")[0];
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
}

export default async function TutorExploreCoursePlayerPage(props: { params: Promise<{ id: string, lessonId: string }> }) {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== "tutor") {
        redirect("/login");
    }

    const params = await props.params;
    const course = await getCourseById(params.id);

    if (!course) {
        notFound();
    }

    // Cari current lesson dan urutan semua lesson
    let currentLesson: any = null;
    let currentModuleIndex = -1;
    let currentLessonIndex = -1;
    const allLessons: any[] = [];

    for (let i = 0; i < course.modules.length; i++) {
        const m = course.modules[i];
        for (let j = 0; j < m.lessons.length; j++) {
            const l = m.lessons[j];
            allLessons.push(l);
            if (l.id === params.lessonId) {
                currentLesson = l;
                currentModuleIndex = i;
                currentLessonIndex = j;
            }
        }
    }

    if (!currentLesson) {
        notFound();
    }

    const flatIndex = allLessons.findIndex(l => l.id === params.lessonId);
    const prevLesson = flatIndex > 0 ? allLessons[flatIndex - 1] : null;
    const nextLesson = flatIndex < allLessons.length - 1 ? allLessons[flatIndex + 1] : null;



    let documentEmbedUrl = "";
    if (currentLesson.contentType === "document" && currentLesson.documentUrl) {
        const fullUrl = getPublicUrl(currentLesson.documentUrl) || "";
        documentEmbedUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fullUrl)}&embedded=true`;
    }

    return (
        <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">

            {/* Sidebar Kurikulum */}
            <div className="w-80 flex-shrink-0 border-r border-slate-200 bg-white overflow-y-auto hidden md:block">
                <div className="p-4 border-b border-slate-200 sticky top-0 bg-white z-10">
                    <Link href={`/tutor/explore/${course.id}`} className="text-xs text-blue-600 hover:underline mb-2 inline-block">
                        &larr; Kembali ke Detail
                    </Link>
                    <h2 className="font-bold text-slate-800 leading-snug">{course.title}</h2>
                    <div className="mt-1 text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded inline-block">
                        Read-Only Preview
                    </div>
                </div>

                <div className="p-2 space-y-1">
                    {course.modules.map((module, mIndex) => (
                        <div key={module.id} className="mb-4">
                            <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                                Modul {mIndex + 1}: {module.title}
                            </div>
                            <div className="space-y-0.5">
                                {module.lessons.map((lesson, lIndex) => {
                                    const isActive = lesson.id === params.lessonId;

                                    return (
                                        <Link
                                            key={lesson.id}
                                            href={`/tutor/explore/${course.id}/learn/${lesson.id}`}
                                            className={`flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50 border border-transparent'}`}
                                        >
                                            <div className="mt-0.5">
                                                <div className={`w-4 h-4 rounded-full border-2 ${isActive ? 'border-blue-500' : 'border-slate-300'}`}></div>
                                            </div>
                                            <div>
                                                <h4 className={`text-sm ${isActive ? 'font-semibold text-blue-900' : 'text-slate-700 font-medium'}`}>
                                                    {mIndex + 1}.{lIndex + 1} {lesson.title}
                                                </h4>
                                                <p className="text-[10px] text-slate-500 uppercase mt-0.5">{lesson.contentType}</p>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Area Player Konten */}
            <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50">

                {/* Topbar Mobile (Optional if sidebar hidden) */}
                <div className="md:hidden p-4 bg-white border-b border-slate-200">
                    <Link href={`/tutor/explore/${course.id}`} className="text-sm font-medium text-blue-600">
                        &larr; {course.title}
                    </Link>
                </div>

                <div className="p-4 md:p-8 max-w-5xl mx-auto w-full flex-1 flex flex-col">

                    {/* Header Materi */}
                    <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Modul {currentModuleIndex + 1} &bull; Materi {currentLessonIndex + 1}
                            </span>
                            <h1 className="text-2xl font-bold text-slate-900 mt-1">{currentLesson.title}</h1>
                        </div>
                    </div>

                    {/* Konten Embed */}
                    <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col min-h-[500px]">
                        {currentLesson.contentType === "video" && currentLesson.videoUrl && (
                            <iframe
                                src={getYouTubeEmbedUrl(currentLesson.videoUrl)}
                                className="w-full h-full min-h-[500px] border-0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            ></iframe>
                        )}

                        {currentLesson.contentType === "document" && documentEmbedUrl && (
                            <iframe
                                src={documentEmbedUrl}
                                className="w-full h-full min-h-[600px] border-0"
                            ></iframe>
                        )}

                        {!currentLesson.videoUrl && !currentLesson.documentUrl && (
                            <div className="flex-1 flex items-center justify-center text-slate-500 p-8 text-center">
                                Tautan konten tidak tersedia atau belum dikonfigurasi.
                            </div>
                        )}
                    </div>

                    {/* Navigasi Prev/Next */}
                    <div className="mt-6 flex items-center justify-between">
                        {prevLesson ? (
                            <Link
                                href={`/tutor/explore/${course.id}/learn/${prevLesson.id}`}
                                className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm"
                            >
                                <span>&larr;</span> Sebelumnya
                            </Link>
                        ) : (
                            <div></div>
                        )}

                        {nextLesson ? (
                            <Link
                                href={`/tutor/explore/${course.id}/learn/${nextLesson.id}`}
                                className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm"
                            >
                                Selanjutnya <span>&rarr;</span>
                            </Link>
                        ) : (
                            <div></div>
                        )}
                    </div>

                </div>
            </div>

        </div>
    );
}
