"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCourseAction } from "@/lib/actions/course";

export default function CreateCourseForm({ role }: { role: "admin" | "tutor" }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        
        startTransition(async () => {
            // We pass null as prevState because we are calling it directly instead of useFormState
            // wait, createCourseAction expects (prevState, formData).
            const result = await createCourseAction(null, formData);
            if (result.success && result.data && (result.data as any).id) {
                alert(result.message);
                router.push(`/${role}/courses/${(result.data as any).id}/edit`);
            } else {
                alert(result.error || "Gagal membuat kursus.");
            }
        });
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md max-w-2xl">
            <div className="mb-4">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Judul Kursus <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    id="title"
                    name="title"
                    required
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Contoh: Matematika Dasar SMA"
                />
            </div>

            <div className="mb-6">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Deskripsi Kursus
                </label>
                <textarea
                    id="description"
                    name="description"
                    rows={4}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Tuliskan deskripsi singkat mengenai kursus ini..."
                />
            </div>
            
            {/* Note: Thumbnail upload and Class Levels / Tutors assignment are done in the Edit page (Course Builder) */}
            <div className="bg-blue-50 text-blue-800 p-4 rounded-md mb-6 text-sm">
                <p><strong>Catatan:</strong> Setelah kursus dibuat, Anda akan diarahkan ke halaman Course Builder untuk mengunggah thumbnail, mengatur tingkatan kelas, dan menyusun materi.</p>
            </div>

            <div className="flex gap-4">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md font-medium"
                >
                    Batal
                </button>
                <button
                    type="submit"
                    disabled={isPending}
                    className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-md font-medium disabled:opacity-50"
                >
                    {isPending ? "Menyimpan..." : "Buat Kursus"}
                </button>
            </div>
        </form>
    );
}
