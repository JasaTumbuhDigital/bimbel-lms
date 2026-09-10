"use client";

import { useRouter } from "next/navigation";

export default function ReviewCourseFilter({
    courses,
    currentCourseId,
}: {
    courses: { id: string; title: string }[];
    currentCourseId: string;
}) {
    const router = useRouter();

    return (
        <select
            value={currentCourseId}
            onChange={(e) => {
                const val = e.target.value;
                if (val) {
                    router.push(`/admin/courses?status=reviews&courseId=${val}`);
                } else {
                    router.push(`/admin/courses?status=reviews`);
                }
            }}
            className="text-sm border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
            <option value="">Semua Kursus</option>
            {courses.map((c) => (
                <option key={c.id} value={c.id}>
                    {c.title}
                </option>
            ))}
        </select>
    );
}
