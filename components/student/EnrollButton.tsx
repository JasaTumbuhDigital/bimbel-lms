"use client";

import { useTransition } from "react";
import { enrollCourseAction } from "@/lib/actions/enrollment";

export default function EnrollButton({ courseId }: { courseId: string }) {
    const [isPending, startTransition] = useTransition();

    const handleEnroll = () => {
        startTransition(async () => {
            const res = await enrollCourseAction(courseId);
            if (!res.success) {
                alert(res.error);
            }
            // Jika sukses, halaman akan terefresh otomatis via revalidatePath
        });
    };

    return (
        <button
            onClick={handleEnroll}
            disabled={isPending}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed"
        >
            {isPending ? "Memproses Pendaftaran..." : "Mulai Belajar Sekarang"}
        </button>
    );
}
