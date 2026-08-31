import { notFound } from "next/navigation";
import { getCourseById } from "@/lib/data/course";
import { prisma } from "@/lib/prisma";
import CourseBuilder from "@/components/admin/CourseBuilder";

export const metadata = {
    title: "Edit Kursus - Admin",
};

export default async function AdminEditCoursePage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const course = await getCourseById(params.id);

    if (!course) {
        notFound();
    }

    const classLevels = await prisma.classLevel.findMany({ orderBy: { name: "asc" } });
    const tutors = await prisma.tutorProfile.findMany({
        include: { user: true },
        orderBy: { user: { name: "asc" } }
    });

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                <header className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">Course Builder</h1>
                        <p className="text-xs text-slate-600">Edit modul dan materi kursus</p>
                    </div>
                </header>
                
                <CourseBuilder 
                    course={course} 
                    role="admin" 
                    availableClassLevels={classLevels} 
                    availableTutors={tutors} 
                />
            </div>
        </div>
    );
}
