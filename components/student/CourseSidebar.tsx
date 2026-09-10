"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function CourseSidebar({ course, basePath = "/student/courses" }: { course: any, basePath?: string }) {
    const pathname = usePathname();

    return (
        <div className="w-80 shrink-0 border-r border-slate-200 bg-white overflow-y-auto hidden md:block shadow-sm">
            <div className="p-4 border-b border-slate-200 sticky top-0 bg-white z-10 shadow-sm">
                <Link href={`${basePath}/${course.id}`} className="text-xs text-blue-600 hover:underline mb-2 inline-block font-medium">
                    &larr; Kembali ke Detail Kursus
                </Link>
                <h2 className="font-bold text-slate-800 leading-snug">{course.title}</h2>
            </div>

            <div className="p-2 space-y-1">
                {course.modules.map((module: any, mIndex: number) => (
                    <div key={module.id} className="mb-5">
                        <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 rounded-md mx-2 mb-2">
                            Modul {mIndex + 1}: {module.title}
                        </div>
                        <div className="space-y-0.5 px-2">
                            {module.lessons.map((lesson: any, lIndex: number) => {
                                const lessonUrl = `${basePath}/${course.id}/learn/${lesson.id}`;
                                const isActive = pathname === lessonUrl;
                                const isDone = lesson.progress && lesson.progress.length > 0 && lesson.progress[0].isCompleted;

                                return (
                                    <Link
                                        key={lesson.id}
                                        href={lessonUrl}
                                        className={`flex items-start gap-3 px-3 py-2.5 rounded-lg transition-all ${isActive ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-100 border border-transparent'}`}
                                    >
                                        <div className="mt-0.5">
                                            {isDone ? (
                                                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                            ) : (
                                                <div className={`w-4 h-4 rounded-full border-2 ${isActive ? 'border-blue-500' : 'border-slate-300'}`}></div>
                                            )}
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

                            {/* TOMBOL KUIS DI SIDEBAR */}
                            {module.quiz && (() => {
                                const quizUrl = `${basePath}/${course.id}/quiz/${module.quiz.id}`;
                                const isActive = pathname === quizUrl;
                                const isPassed = module.quiz.progress && module.quiz.progress.length > 0 && module.quiz.progress[0].isPassed;

                                return (
                                    <Link
                                        href={quizUrl}
                                        className={`flex items-start gap-3 px-3 py-3 rounded-lg transition-all mt-2 ${
                                            isActive ? 'bg-purple-100 border border-purple-200 shadow-sm' : 'hover:bg-purple-50 border border-transparent bg-purple-50/50'
                                        }`}
                                    >
                                        <div className="mt-0.5 shrink-0">
                                            {isPassed ? (
                                                <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                            ) : (
                                                <div className={`w-4 h-4 rounded-full border-2 ${isActive ? 'border-purple-600' : 'border-purple-400'}`}></div>
                                            )}
                                        </div>
                                        <div>
                                            <h4 className={`text-sm ${isActive ? 'font-bold text-purple-900' : 'font-semibold text-purple-800'}`}>
                                                Evaluasi Kuis
                                            </h4>
                                            <p className={`text-[10px] uppercase mt-0.5 font-medium ${isActive ? 'text-purple-700' : 'text-purple-600'}`}>
                                                {module.quiz.title}
                                            </p>
                                        </div>
                                    </Link>
                                );
                            })()}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
