import { notFound, redirect } from "next/navigation";
import { getCourseById } from "@/lib/data/course";
import { getAuthenticatedUser } from "@/lib/data/auth";
import { getPublicUrl } from "@/lib/supabase-storage";
import Link from "next/link";
import DocumentViewer from "@/components/course/DocumentViewer";
import { Suspense } from "react";
import { LessonSkeleton } from "@/components/ui/skeletons";

export const metadata = {
    title: "Preview Materi - Tutor",
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

export default function TutorCoursePlayerPage(props: {
    params: Promise<{ id: string; lessonId: string }>;
}) {
    return (
        <Suspense fallback={<LessonSkeleton />}>
            <TutorCoursePlayerContent params={props.params} />
        </Suspense>
    );
}

async function TutorCoursePlayerContent({
    params,
}: {
    params: Promise<{ id: string; lessonId: string }>;
}) {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== "tutor") {
        redirect("/login");
    }

    const { id, lessonId } = await params;
    const course = await getCourseById(id);

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
            if (l.id === lessonId) {
                currentLesson = l;
                currentModuleIndex = i;
                currentLessonIndex = j;
            }
        }
    }

    if (!currentLesson) {
        notFound();
    }

    const flatIndex = allLessons.findIndex((l) => l.id === lessonId);
    const prevLesson = flatIndex > 0 ? allLessons[flatIndex - 1] : null;
    const nextLesson = flatIndex < allLessons.length - 1 ? allLessons[flatIndex + 1] : null;

    let documentPublicUrl = "";
    if (currentLesson.contentType === "document" && currentLesson.documentUrl) {
        documentPublicUrl = getPublicUrl(currentLesson.documentUrl) || "";
    }

    return (
        <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50 w-full">
            {/* Topbar Mobile */}
            <div className="md:hidden p-4 bg-white border-b border-slate-200">
                <Link href={`/tutor/courses/${course.id}`} className="text-sm font-medium text-blue-600">
                    &larr; {course.title}
                </Link>
            </div>

            <div className="p-4 md:p-8 max-w-7xl mx-auto w-full flex-1 flex flex-col">
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
                <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col min-h-125">
                    {currentLesson.contentType === "video" && currentLesson.videoUrl && (
                        <iframe
                            src={getYouTubeEmbedUrl(currentLesson.videoUrl)}
                            className="w-full h-full min-h-125 border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        ></iframe>
                    )}

                    {currentLesson.contentType === "document" && documentPublicUrl && (
                        <DocumentViewer url={documentPublicUrl} />
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
                            href={`/tutor/courses/${course.id}/learn/${prevLesson.id}`}
                            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm"
                        >
                            <span>&larr;</span> Sebelumnya
                        </Link>
                    ) : (
                        <div></div>
                    )}

                    {nextLesson ? (
                        <Link
                            href={`/tutor/courses/${course.id}/learn/${nextLesson.id}`}
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
    );
}
