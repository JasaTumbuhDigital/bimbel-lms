"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { unarchiveCourseAction } from "@/lib/actions/course";

export default function UnarchiveCourseButton({ courseId }: { courseId: string }) {
    const [isPending, startTransition] = useTransition();

    const handleUnarchive = () => {
        if (!confirm("Yakin ingin memulihkan kursus ini dari arsip?")) return;

        startTransition(async () => {
            const result = await unarchiveCourseAction(courseId);
            if (!result.success) {
                toast.error(result.error);
            } else {
                toast.success(result.message || "Kursus berhasil dipulihkan.");
            }
        });
    };

    return (
        <button
            onClick={handleUnarchive}
            disabled={isPending}
            className="text-green-600 hover:text-green-900 text-xs font-medium hover:underline disabled:opacity-50"
        >
            {isPending ? "Memulihkan..." : "Pulihkan"}
        </button>
    );
}
