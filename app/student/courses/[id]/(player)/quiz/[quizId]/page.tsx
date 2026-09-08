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

    // Find next lesson or quiz URL after this quiz
    let nextLessonUrl: string | null = null;
    let foundCurrentQuiz = false;
    
    for (const module of course.modules) {
        if (foundCurrentQuiz) {
            if (module.lessons.length > 0) {
                nextLessonUrl = `/student/courses/${course.id}/learn/${module.lessons[0].id}`;
                break;
            } else if (module.quiz) {
                nextLessonUrl = `/student/courses/${course.id}/quiz/${module.quiz.id}`;
                break;
            }
        }
        if (module.quiz?.id === params.quizId) {
            foundCurrentQuiz = true;
        }
    }

    return (
        <div className="flex-1 flex flex-col overflow-y-auto bg-slate-100/50 w-full">
            <div className="md:hidden p-4 bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                <Link href={`/student/courses/${course.id}`} className="text-sm font-medium text-blue-600 flex items-center gap-2">
                    <span>&larr;</span> Kembali ke Detail Kursus
                </Link>
            </div>

            <div className="p-4 md:p-8 max-w-7xl mx-auto w-full flex-1">
                <StudentQuizClient quiz={quiz} courseId={course.id} nextLessonUrl={nextLessonUrl} />
            </div>
        </div>
    );
}
