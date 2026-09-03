import { notFound, redirect } from "next/navigation";
import { getCourseById } from "@/lib/data/course";
import { getQuizForStudent } from "@/lib/data/quiz";
import { getAuthenticatedUser } from "@/lib/data/auth";
import Link from "next/link";
import StudentQuizClient from "@/components/quiz/StudentQuizClient";

export const metadata = {
    title: "Kuis Modul - Student",
};

export default async function QuizPlayerPage(props: { params: Promise<{ id: string, quizId: string }> }) {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== "student") {
        redirect("/login");
    }

    const params = await props.params;
    const course = await getCourseById(params.id);
    const quizRes = await getQuizForStudent(params.quizId);

    if (!course || !quizRes.success || !quizRes.data) {
        notFound();
    }

    const quiz = quizRes.data;

    // Check enrollment
    const isEnrolled = course.enrollments && course.enrollments.length > 0;
    if (!isEnrolled) {
        redirect(`/student/courses/${course.id}`);
    }

    return (
        <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
            {/* Sidebar Kurikulum - MIRIP SEPERTI LEARN PAGE */}
            <div className="w-80 flex-shrink-0 border-r border-slate-200 bg-white overflow-y-auto hidden md:block shadow-sm">
                <div className="p-4 border-b border-slate-200 sticky top-0 bg-white z-10 shadow-sm">
                    <Link href={`/student/courses/${course.id}`} className="text-xs text-blue-600 hover:underline mb-2 inline-block font-medium">
                        &larr; Kembali ke Detail Kursus
                    </Link>
                    <h2 className="font-bold text-slate-800 leading-snug">{course.title}</h2>
                </div>

                <div className="p-2 space-y-1">
                    {course.modules.map((module, mIndex) => (
                        <div key={module.id} className="mb-5">
                            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 rounded-md mx-2 mb-2">
                                Modul {mIndex + 1}: {module.title}
                            </div>
                            <div className="space-y-0.5 px-2">
                                {module.lessons.map((lesson, lIndex) => {
                                    const isDone = (lesson as any).progress && (lesson as any).progress.length > 0 && (lesson as any).progress[0].isCompleted;

                                    return (
                                        <Link
                                            key={lesson.id}
                                            href={`/student/courses/${course.id}/learn/${lesson.id}`}
                                            className={`flex items-start gap-3 px-3 py-2.5 rounded-lg transition-all hover:bg-slate-100 border border-transparent`}
                                        >
                                            <div className="mt-0.5">
                                                {isDone ? (
                                                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                ) : (
                                                    <div className={`w-4 h-4 rounded-full border-2 border-slate-300`}></div>
                                                )}
                                            </div>
                                            <div>
                                                <h4 className={`text-sm text-slate-700 font-medium`}>
                                                    {mIndex + 1}.{lIndex + 1} {lesson.title}
                                                </h4>
                                                <p className="text-[10px] text-slate-500 uppercase mt-0.5">{lesson.contentType}</p>
                                            </div>
                                        </Link>
                                    );
                                })}

                                {/* TOMBOL KUIS DI SIDEBAR */}
                                {module.quiz && (
                                    <Link
                                        href={`/student/courses/${course.id}/quiz/${module.quiz.id}`}
                                        className={`flex items-start gap-3 px-3 py-3 rounded-lg transition-all mt-2 ${
                                            params.quizId === module.quiz.id ? 'bg-purple-100 border border-purple-200 shadow-sm' : 'hover:bg-purple-50 border border-transparent bg-purple-50/50'
                                        }`}
                                    >
                                        <div className="mt-0.5 shrink-0">
                                            {module.quiz.progress && module.quiz.progress.length > 0 && module.quiz.progress[0].isPassed ? (
                                                <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                            ) : (
                                                <div className={`w-4 h-4 rounded-full border-2 ${params.quizId === module.quiz.id ? 'border-purple-600' : 'border-purple-400'}`}></div>
                                            )}
                                        </div>
                                        <div>
                                            <h4 className={`text-sm ${params.quizId === module.quiz.id ? 'font-bold text-purple-900' : 'font-semibold text-purple-800'}`}>
                                                Evaluasi Kuis
                                            </h4>
                                            <p className={`text-[10px] uppercase mt-0.5 font-medium ${params.quizId === module.quiz.id ? 'text-purple-700' : 'text-purple-600'}`}>
                                                {module.quiz.title}
                                            </p>
                                        </div>
                                    </Link>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Area Player Konten (Kuis) */}
            <div className="flex-1 flex flex-col overflow-y-auto bg-slate-100/50">
                <div className="md:hidden p-4 bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                    <Link href={`/student/courses/${course.id}`} className="text-sm font-medium text-blue-600 flex items-center gap-2">
                        <span>&larr;</span> Kembali ke Detail Kursus
                    </Link>
                </div>

                <div className="p-4 md:p-8 max-w-4xl mx-auto w-full flex-1">
                    <StudentQuizClient quiz={quiz} courseId={course.id} />
                </div>
            </div>
        </div>
    );
}
