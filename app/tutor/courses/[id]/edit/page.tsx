import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCourseById, getStudentsForEnrollmentTab } from "@/lib/data/course";
import CourseBuilder from "@/components/course/CourseBuilder";
import { CourseBuilderSkeleton } from "@/components/ui/skeletons";
import { getAuthenticatedUser } from "@/lib/data/auth";
import { getClassLevelsForSelect } from "@/lib/data/class-level";
import { getTutorsForSelect } from "@/lib/data/user";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
    return { title: "Kelola Kursus - Tutor" };
}

async function TutorEditCourseContent({ courseId }: { courseId: string }) {
    const course = await getCourseById(courseId);
    const user = await getAuthenticatedUser();

    if (!course || !user) {
        notFound();
    }

    const isOwner = course.createdBy === user.id;

    let availableClassLevels: any[] = [];
    let availableTutors: any[] = [];
    let enrollmentData = null;

    if (isOwner) {
        [availableClassLevels, availableTutors, enrollmentData] = await Promise.all([
            getClassLevelsForSelect(),
            getTutorsForSelect(),
            getStudentsForEnrollmentTab(courseId),
        ]);
    }

    return (
        <CourseBuilder
            course={course}
            role="tutor"
            isOwner={isOwner}
            availableClassLevels={availableClassLevels}
            availableTutors={availableTutors}
            enrollmentData={enrollmentData}
        />
    );
}

export default async function TutorEditCoursePage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                <header className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div>
                        <Link
                            href={`/tutor/courses/${params.id}`}
                            className="text-xs text-blue-600 hover:underline mb-1 inline-block"
                        >
                            &larr; Lihat Tampilan Kursus
                        </Link>
                        <h1 className="text-xl font-bold text-slate-900">Course Builder (Tutor)</h1>
                        <p className="text-xs text-slate-600">Edit modul dan materi kursus</p>
                    </div>
                    <Link
                        href={`/tutor/courses/${params.id}`}
                        className="text-xs bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                        <span>&larr;</span> Kembali ke Detail Kursus
                    </Link>
                </header>

                <Suspense fallback={<CourseBuilderSkeleton />}>
                    <TutorEditCourseContent courseId={params.id} />
                </Suspense>
            </div>
        </div>
    );
}
