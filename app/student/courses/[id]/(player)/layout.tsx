import { getCourseById } from "@/lib/data/course";
import { getAuthenticatedUser } from "@/lib/data/auth";
import { redirect, notFound } from "next/navigation";
import { CourseSidebar } from "@/components/student/CourseSidebar";

export default async function PlayerLayout(props: { children: React.ReactNode, params: Promise<{ id: string }> }) {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== "student") {
        redirect("/login");
    }

    const { id } = await props.params;
    const course = await getCourseById(id);

    if (!course) {
        notFound();
    }

    const isEnrolled = course.enrollments && course.enrollments.length > 0;
    if (!isEnrolled) {
        redirect(`/student/courses/${course.id}`);
    }

    return (
        <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
            <CourseSidebar course={course} />
            {props.children}
        </div>
    );
}
