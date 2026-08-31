"use client";

import { useState, useTransition } from "react";
import { updateCourseAction } from "@/lib/actions/course";
import ThumbnailUpload from "./ThumbnailUpload";

export default function CourseInfoTab({ course, role }: { course: any, role: "admin" | "tutor" }) {
    const [isPending, startTransition] = useTransition();
    const [thumbnailUrl, setThumbnailUrl] = useState(course.thumbnailUrl || "");

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        if (thumbnailUrl) {
            formData.append("thumbnailUrl", thumbnailUrl);
        }

        startTransition(async () => {
            const result = await updateCourseAction(course.id, null, formData);
            if (result.success) {
                alert(result.message);
            } else {
                alert(result.error);
            }
        });
    };

    return (
        <div>
            <h2 className="text-xl font-semibold mb-4">Informasi Dasar Kursus</h2>
            <form onSubmit={handleSubmit} className="max-w-2xl bg-white border border-slate-200 p-6 rounded-md shadow-sm">
                <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Judul Kursus</label>
                    <input 
                        type="text" 
                        defaultValue={course.title}
                        name="title"
                        required
                        className="w-full p-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm" 
                    />
                </div>
                <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi Singkat</label>
                    <textarea 
                        defaultValue={course.description || ""}
                        name="description"
                        rows={4}
                        className="w-full p-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm" 
                    />
                </div>
                
                <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-md">
                    <ThumbnailUpload 
                        courseId={course.id}
                        currentThumbnailUrl={thumbnailUrl}
                        onUploadSuccess={(path) => setThumbnailUrl(path)}
                    />
                </div>

                <div className="flex gap-3">
                    <button 
                        type="submit" 
                        disabled={isPending}
                        className="bg-blue-600 text-white px-4 py-2 text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        {isPending ? "Menyimpan..." : "Simpan Perubahan"}
                    </button>
                </div>
            </form>
        </div>
    );
}
