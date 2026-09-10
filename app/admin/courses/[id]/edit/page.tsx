import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getCourseById, getStudentsForEnrollmentTab } from "@/lib/data/course";
import { getClassLevelsForSelect } from "@/lib/data/class-level";
import { getTutorsForSelect } from "@/lib/data/user";
import CourseBuilder from "@/components/course/CourseBuilder";
import { CourseBuilderSkeleton } from "@/components/ui/skeletons";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
    return { title: "Edit Kursus - Admin" };
}

async function AdminEditCourseContent({ courseId }: { courseId: string }) {
    // Fetch data secara paralel (Course, Tingkatan Kelas, Tutor, dan data Enrollment)
    const [course, classLevels, tutors, enrollmentData] = await Promise.all([
        getCourseById(courseId),
        getClassLevelsForSelect(),
        getTutorsForSelect(),
        getStudentsForEnrollmentTab(courseId),
    ]);

    if (!course) {
        notFound();
    }

    return (
        <CourseBuilder
            course={course}
            role="admin"
            availableClassLevels={classLevels}
            availableTutors={tutors}
            enrollmentData={enrollmentData}
        />
    );
}

export default async function AdminEditCoursePage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                <header className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">Course Builder</h1>
                        <p className="text-xs text-slate-600">Edit modul dan materi kursus</p>
                    </div>
                </header>
                
                <Suspense fallback={<CourseBuilderSkeleton />}>
                    <AdminEditCourseContent courseId={params.id} />
                </Suspense>
            </div>
        </div>
    );
}
