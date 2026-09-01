"use client";

import { useTransition } from "react";
import { markLessonCompleteAction } from "@/lib/actions/progress";
import { useRouter } from "next/navigation";

export default function MarkAsDoneButton({ 
    lessonId, 
    courseId,
    isCompleted,
    nextLessonUrl
}: { 
    lessonId: string;
    courseId: string;
    isCompleted: boolean;
    nextLessonUrl?: string | null;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const handleMarkAsDone = () => {
        if (isCompleted) return;
        
        startTransition(async () => {
            const res = await markLessonCompleteAction(lessonId, courseId);
            if (!res.success) {
                alert(res.error);
            } else if (nextLessonUrl) {
                router.push(nextLessonUrl);
            }
        });
    };

    if (isCompleted) {
        return (
            <div className="flex items-center gap-2 text-green-600 font-medium px-4 py-2 bg-green-50 rounded-lg border border-green-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Selesai
            </div>
        );
    }

    return (
        <button
            onClick={handleMarkAsDone}
            disabled={isPending}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg shadow-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {isPending ? "Memproses..." : "Tandai Selesai"}
        </button>
    );
}
