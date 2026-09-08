import { notFound, redirect } from "next/navigation";
import { getCourseById } from "@/lib/data/course";
import { getAuthenticatedUser } from "@/lib/data/auth";
import { getPublicUrl } from "@/lib/supabase-storage";
import Link from "next/link";
import MarkAsDoneButton from "@/components/course/MarkAsDoneButton";
import DocumentViewer from "@/components/course/DocumentViewer";
import { Suspense } from "react";
import { LessonSkeleton } from "@/components/ui/skeletons";

export const metadata = {
    title: "Pemutar Materi - Student",
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

export default function CoursePlayerPage(props: { params: Promise<{ id: string, lessonId: string }> }) {
    return (
        <Suspense fallback={<LessonSkeleton />}>
            <CoursePlayerContent params={props.params} />
        </Suspense>
    );
}

async function CoursePlayerContent({ params }: { params: Promise<{ id: string, lessonId: string }> }) {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== "student") {
        redirect("/login");
    }

    const resolvedParams = await params;
    const course = await getCourseById(resolvedParams.id);

    if (!course) {
        notFound();
    }

    const isEnrolled = course.enrollments && course.enrollments.length > 0;
    if (!isEnrolled) {
        redirect(`/student/courses/${course.id}`);
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
            if (l.id === resolvedParams.lessonId) {
                currentLesson = l;
                currentModuleIndex = i;
                currentLessonIndex = j;
            }
        }
    }

    if (!currentLesson) {
        notFound();
    }

    const flatIndex = allLessons.findIndex(l => l.id === resolvedParams.lessonId);
    const prevLesson = flatIndex > 0 ? allLessons[flatIndex - 1] : null;
    
    const currentModule = course.modules[currentModuleIndex];
    const isLastLessonInModule = currentLessonIndex === currentModule.lessons.length - 1;
    const moduleQuiz = currentModule?.quiz ?? null;
    
    let nextLessonUrl = null;
    let hasQuizNext = false;
    let nextLesson = null;

    if (isLastLessonInModule && moduleQuiz) {
        // Jika ini lesson terakhir di modul dan ada kuis, maka selanjutnya adalah kuis
        nextLessonUrl = `/student/courses/${course.id}/quiz/${moduleQuiz.id}`;
        hasQuizNext = true;
    } else {
        // Lanjut ke lesson berikutnya di flat array (di modul yang sama, atau awal modul berikutnya)
        nextLesson = flatIndex < allLessons.length - 1 ? allLessons[flatIndex + 1] : null;
        if (nextLesson) {
            nextLessonUrl = `/student/courses/${course.id}/learn/${nextLesson.id}`;
        }
    }

    const isCompleted = currentLesson.progress && currentLesson.progress.length > 0 && currentLesson.progress[0].isCompleted;



    let documentPublicUrl = "";
    if (currentLesson.contentType === "document" && currentLesson.documentUrl) {
        documentPublicUrl = getPublicUrl(currentLesson.documentUrl) || "";
    }

    return (
        <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50 w-full">
            {/* Topbar Mobile (Optional if sidebar hidden) */}
            <div className="md:hidden p-4 bg-white border-b border-slate-200">
                <Link href={`/student/courses/${course.id}`} className="text-sm font-medium text-blue-600">
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

                    <div className="flex-shrink-0">
                        <MarkAsDoneButton
                            lessonId={currentLesson.id}
                            courseId={course.id}
                            isCompleted={isCompleted}
                            nextLessonUrl={nextLessonUrl}
                        />
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
                            href={`/student/courses/${course.id}/learn/${prevLesson.id}`}
                            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm"
                        >
                            <span>&larr;</span> Sebelumnya
                        </Link>
                    ) : (
                        <div></div>
                    )}

                    {nextLesson || hasQuizNext ? (
                        <Link
                            href={nextLessonUrl!}
                            className={`flex items-center gap-2 text-sm font-medium transition-colors bg-white px-4 py-2 rounded-lg border shadow-sm ${
                                hasQuizNext ? 'text-purple-600 hover:text-purple-700 border-purple-200 hover:bg-purple-50' : 'text-slate-600 hover:text-blue-600 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            {hasQuizNext ? 'Kerjakan Kuis' : 'Selanjutnya'} <span>&rarr;</span>
                        </Link>
                    ) : (
                        <div className="text-sm font-medium text-green-600 flex items-center gap-2 bg-green-50 px-4 py-2 rounded-lg border border-green-200">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            Materi Selesai
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
