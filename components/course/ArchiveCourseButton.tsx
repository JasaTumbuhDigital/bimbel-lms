"use client";

import { useTransition } from "react";
import { archiveCourseAction } from "@/lib/actions/course";

export default function ArchiveCourseButton({ courseId }: { courseId: string }) {
    const [isPending, startTransition] = useTransition();

    const handleArchive = () => {
        if (!confirm("Yakin ingin mengarsipkan kursus ini?")) return;

        startTransition(async () => {
            const result = await archiveCourseAction(courseId);
            if (!result.success) {
                alert(result.error);
            }
        });
    };

    return (
        <button
            onClick={handleArchive}
            disabled={isPending}
            className="text-red-600 hover:text-red-900 text-sm font-medium disabled:opacity-50"
        >
            {isPending ? "Mengarsipkan..." : "Arsipkan"}
        </button>
    );
}
