import { notFound } from "next/navigation";
import { getCourseById } from "@/lib/data/course";
import CourseBuilder from "@/components/admin/CourseBuilder";

export const metadata = {
    title: "Kelola Kursus - Tutor",
};

export default async function TutorEditCoursePage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const course = await getCourseById(params.id);

    if (!course) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                <header className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">Course Builder (Tutor)</h1>
                        <p className="text-xs text-slate-600">Edit modul dan materi kursus</p>
                    </div>
                </header>
                
                <CourseBuilder course={course} role="tutor" />
            </div>
        </div>
    );
}
