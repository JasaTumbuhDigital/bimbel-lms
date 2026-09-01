"use client";

import { useState, useTransition } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { deleteLessonAction, updateLessonAction } from "@/lib/actions/module";
import DocumentUpload from "@/components/ui/DocumentUpload";

export default function SortableLessonItem({ lesson, courseId, moduleId }: { lesson: any; courseId: string; moduleId: string }) {
    const [isPending, startTransition] = useTransition();
    const [isEditing, setIsEditing] = useState(false);
    
    // Form states
    const [lessonTitle, setLessonTitle] = useState(lesson.title);
    const [contentType, setContentType] = useState<"video" | "document">(lesson.contentType);
    const [videoUrl, setVideoUrl] = useState(lesson.videoUrl || "");
    const [fileUrl, setFileUrl] = useState(lesson.documentUrl || "");

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: lesson.id,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        position: isDragging ? ("relative" as const) : ("static" as const),
    };

    const handleDelete = () => {
        if (!confirm("Apakah Anda yakin ingin menghapus materi ini? Dokumen yang terlampir (jika ada) juga akan dihapus.")) return;
        
        startTransition(async () => {
            const res = await deleteLessonAction(lesson.id);
            if (!res.success) {
                alert(res.error);
            }
        });
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (contentType === "document" && !fileUrl) {
            alert("Silakan unggah dokumen terlebih dahulu.");
            return;
        }

        startTransition(async () => {
            const formData = new FormData();
            formData.append("id", lesson.id);
            formData.append("title", lessonTitle);
            formData.append("contentType", contentType);

            if (contentType === "video") formData.append("videoUrl", videoUrl);
            if (contentType === "document") formData.append("documentUrl", fileUrl);

            const res = await updateLessonAction(null, formData);
            if (res.success) {
                setIsEditing(false);
            } else {
                alert(res.error || res.fieldErrors ? JSON.stringify(res.fieldErrors) : "Error");
            }
        });
    };

    if (isEditing) {
        return (
            <div ref={setNodeRef} style={style} className={`p-4 border border-blue-200 bg-blue-50 rounded-md shadow-sm ${isDragging ? "opacity-50" : ""}`}>
                <form onSubmit={handleUpdate} className="space-y-3">
                    <h4 className="font-medium text-sm mb-2 text-blue-900">Edit Materi</h4>
                    <div>
                        <input
                            type="text"
                            placeholder="Judul Materi"
                            required
                            value={lessonTitle}
                            onChange={(e) => setLessonTitle(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded text-sm"
                        />
                    </div>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-sm">
                            <input type="radio" name={`contentType-${lesson.id}`} value="video" checked={contentType === "video"} onChange={() => setContentType("video")} />
                            Video (YouTube)
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                            <input type="radio" name={`contentType-${lesson.id}`} value="document" checked={contentType === "document"} onChange={() => setContentType("document")} />
                            Dokumen (PDF/PPT)
                        </label>
                    </div>

                    {contentType === "video" && (
                        <input
                            type="url"
                            placeholder="URL YouTube (contoh: https://youtube.com/watch?v=...)"
                            required
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded text-sm"
                        />
                    )}

                    {contentType === "document" && (
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                            <DocumentUpload
                                courseId={courseId}
                                moduleId={moduleId}
                                lessonId={lesson.id}
                                onUploadSuccess={(path) => setFileUrl(path)}
                            />
                            {fileUrl && (
                                <p className="text-xs text-green-600 mt-2 font-medium break-all">
                                    File saat ini: {fileUrl}
                                </p>
                            )}
                        </div>
                    )}

                    <div className="flex gap-2 pt-2">
                        <button type="submit" disabled={isPending} className="bg-blue-600 text-white px-3 py-1.5 text-sm rounded hover:bg-blue-700 disabled:opacity-50">Simpan Perubahan</button>
                        <button type="button" disabled={isPending} onClick={() => setIsEditing(false)} className="text-gray-600 px-3 py-1.5 text-sm hover:bg-gray-200 rounded">Batal</button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            className={`flex items-center justify-between p-3 bg-white border border-gray-200 rounded-md shadow-sm ${isDragging ? "opacity-50" : "hover:border-gray-300"}`}
        >
            <div className="flex items-center gap-3 overflow-hidden">
                <button {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600 focus:outline-none shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" /></svg>
                </button>
                <div className="min-w-0">
                    <h4 className="font-medium text-sm text-gray-800 truncate">{lesson.title}</h4>
                    <p className="text-xs text-gray-500 capitalize">{lesson.contentType}</p>
                </div>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
                <button 
                    onClick={() => setIsEditing(true)}
                    disabled={isPending}
                    className="text-blue-600 hover:text-blue-800 text-xs font-medium disabled:opacity-50"
                >
                    Edit
                </button>
                <button 
                    onClick={handleDelete}
                    disabled={isPending}
                    className="text-red-600 hover:text-red-800 text-xs font-medium disabled:opacity-50"
                >
                    {isPending ? "..." : "Hapus"}
                </button>
            </div>
        </div>
    );
}
