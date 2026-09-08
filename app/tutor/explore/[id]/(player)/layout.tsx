import { getCourseById } from "@/lib/data/course";
import { getAuthenticatedUser } from "@/lib/data/auth";
import { redirect, notFound } from "next/navigation";
import { CourseSidebar } from "@/components/student/CourseSidebar";

export default async function TutorPlayerLayout(props: { children: React.ReactNode, params: Promise<{ id: string }> }) {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== "tutor") {
        redirect("/login");
    }

    const { id } = await props.params;
    const course = await getCourseById(id);

    if (!course) {
        notFound();
    }

    return (
        <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
            <CourseSidebar course={course} basePath="/tutor/explore" />
            {props.children}
        </div>
    );
}
