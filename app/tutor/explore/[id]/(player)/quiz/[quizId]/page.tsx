import { getCourseById } from "@/lib/data/course";
import { getAuthenticatedUser } from "@/lib/data/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata = {
    title: "Preview Kuis - Tutor",
};

export default async function TutorExploreQuizPage(props: { params: Promise<{ id: string, quizId: string }> }) {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== "tutor") {
        redirect("/login");
    }

    const params = await props.params;
    const course = await getCourseById(params.id);

    if (!course) {
        notFound();
    }

    const quiz = await prisma.quiz.findUnique({
        where: { id: params.quizId },
        include: { module: true },
    });

    if (!quiz) {
        notFound();
    }

    return (
        <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50 w-full">
            <div className="md:hidden p-4 bg-white border-b border-slate-200">
                <Link href={`/tutor/explore/${course.id}`} className="text-sm font-medium text-blue-600">
                    &larr; {course.title}
                </Link>
            </div>

            <div className="p-4 md:p-8 max-w-7xl mx-auto w-full flex-1 flex flex-col items-center justify-center">
                <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm max-w-lg w-full text-center">
                    <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                    </div>
                    
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">{quiz.title}</h1>
                    <p className="text-slate-500 mb-8">
                        Fitur pengerjaan dan pratinjau soal kuis belum tersedia pada mode Eksplorasi Kursus. Kuis ini memiliki nilai kelulusan <span className="font-semibold text-slate-700">{quiz.passingScorePercent}%</span>.
                    </p>

                    <Link
                        href={`/tutor/explore/${course.id}`}
                        className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                    >
                        Kembali ke Detail Kursus
                    </Link>
                </div>
            </div>
        </div>
    );
}
