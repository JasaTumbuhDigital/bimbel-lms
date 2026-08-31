"use client";

import { useState, useTransition, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useRouter } from "next/navigation";
import { reorderLessonsAction, createLessonAction, updateModuleAction, deleteModuleAction } from "@/lib/actions/module";
import { createClient } from "@/utils/supabase/client";
import { institutionConfig } from "@/config/institution";
import SortableLessonItem from "./SortableLessonItem";
import DocumentUpload from "./DocumentUpload";

const STORAGE_BUCKET = institutionConfig.shortName.toLowerCase();

export default function SortableModuleItem({ module, courseId }: { module: any; courseId: string }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    // UI states
    const [isExpanded, setIsExpanded] = useState(false);
    const [isAddingLesson, setIsAddingLesson] = useState(false);
    const [lessons, setLessons] = useState(module.lessons || []);

    // Sync state with server changes
    useEffect(() => {
        setLessons(module.lessons || []);
    }, [module.lessons]);

    // Form Add Lesson states
    const [lessonTitle, setLessonTitle] = useState("");
    const [contentType, setContentType] = useState<"video" | "document">("video");
    const [videoUrl, setVideoUrl] = useState("");
    const [fileUrl, setFileUrl] = useState(""); // Simulate file path string for now

    // Module Edit states
    const [isEditingModule, setIsEditingModule] = useState(false);
    const [editModuleTitle, setEditModuleTitle] = useState(module.title);

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: module.id,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        position: isDragging ? ("relative" as const) : ("static" as const),
    };

    // Sensor untuk child DndContext (Lessons) - stop propagation supaya tidak me-trigger parent drag
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleLessonDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = lessons.findIndex((l: any) => l.id === active.id);
        const newIndex = lessons.findIndex((l: any) => l.id === over.id);
        const newOrdered = arrayMove(lessons, oldIndex, newIndex);

        setLessons(newOrdered);

        startTransition(async () => {
            const orderedIds = newOrdered.map((l: any) => l.id);
            const res = await reorderLessonsAction(module.id, orderedIds);
            if (!res.success) {
                alert(res.error);
                setLessons(lessons);
            }
        });
    };

    const handleAddLesson = async (e: React.FormEvent) => {
        e.preventDefault();

        if (contentType === "document" && !fileUrl) {
            alert("Silakan unggah dokumen terlebih dahulu.");
            return;
        }

        startTransition(async () => {
            const formData = new FormData();
            formData.append("moduleId", module.id);
            formData.append("title", lessonTitle);
            formData.append("contentType", contentType);

            if (contentType === "video") formData.append("videoUrl", videoUrl);
            if (contentType === "document") formData.append("documentUrl", fileUrl); // Nanti diintegrasikan dgn Supabase Client

            const res = await createLessonAction(null, formData);
            if (res.success) {
                setLessonTitle("");
                setVideoUrl("");
                setFileUrl("");
                setIsAddingLesson(false);
            } else {
                alert(res.error || res.fieldErrors ? JSON.stringify(res.fieldErrors) : "Error");
            }
        });
    };

    const handleCancelAddLesson = async () => {
        // Jika batal dan ada file yang sudah terunggah, hapus dari storage
        if (fileUrl) {
            const supabase = createClient();
            await supabase.storage.from(STORAGE_BUCKET).remove([fileUrl]);
        }
        
        // Reset state
        setLessonTitle("");
        setVideoUrl("");
        setFileUrl("");
        setContentType("video");
        setIsAddingLesson(false);
    };

    const handleUpdateModule = async (e: React.FormEvent) => {
        e.preventDefault();
        startTransition(async () => {
            const formData = new FormData();
            formData.append("id", module.id);
            formData.append("title", editModuleTitle);
            const res = await updateModuleAction(null, formData);
            if (res.success) {
                setIsEditingModule(false);
            } else {
                alert(res.error);
            }
        });
    };

    const handleDeleteModule = async () => {
        if (!confirm("Apakah Anda yakin ingin menghapus modul ini beserta seluruh materinya?")) return;
        startTransition(async () => {
            const res = await deleteModuleAction(module.id);
            if (!res.success) {
                alert(res.error);
            }
        });
    };

    return (
        <div ref={setNodeRef} style={style} className={`border border-gray-200 rounded-md bg-white shadow-sm ${isDragging ? "opacity-50" : ""}`}>
            {/* Header Module (Draggable Area) */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-t-md border-b border-gray-200">
                {isEditingModule ? (
                    <form onSubmit={handleUpdateModule} className="flex-1 flex items-center gap-2 mr-4">
                        <input
                            type="text"
                            required
                            value={editModuleTitle}
                            onChange={(e) => setEditModuleTitle(e.target.value)}
                            className="flex-1 p-1.5 border border-gray-300 rounded text-sm"
                            autoFocus
                        />
                        <button type="submit" disabled={isPending} className="bg-blue-600 text-white px-2 py-1.5 text-xs rounded hover:bg-blue-700">Simpan</button>
                        <button type="button" disabled={isPending} onClick={() => setIsEditingModule(false)} className="text-gray-600 px-2 py-1.5 text-xs hover:bg-gray-200 rounded">Batal</button>
                    </form>
                ) : (
                    <div className="flex items-center gap-3">
                        <button {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600 focus:outline-none">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" /></svg>
                        </button>
                        <h3 className="font-semibold text-gray-800">{module.title}</h3>
                    </div>
                )}
                
                <div className="flex items-center gap-2">
                    {!isEditingModule && (
                        <>
                            <button onClick={() => setIsEditingModule(true)} className="text-blue-600 hover:bg-blue-50 p-1 rounded-md text-sm font-medium">Edit</button>
                            <button onClick={handleDeleteModule} className="text-red-600 hover:bg-red-50 p-1 rounded-md text-sm font-medium">Hapus</button>
                        </>
                    )}
                    <button onClick={() => setIsExpanded(!isExpanded)} className="text-gray-500 hover:bg-gray-200 px-2 py-1 rounded-md text-sm ml-2 border-l border-gray-300 pl-3">
                        {isExpanded ? "Tutup" : "Buka"} ({lessons.length} materi)
                    </button>
                </div>
            </div>

            {/* Konten Lesson */}
            {isExpanded && (
                <div className="p-4">
                    {lessons.length === 0 ? (
                        <p className="text-sm text-gray-500 mb-4 italic">Belum ada materi di modul ini.</p>
                    ) : (
                        <div className="mb-4">
                            <DndContext id={`dnd-lessons-${module.id}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleLessonDragEnd}>
                                <SortableContext items={lessons.map((l: any) => l.id)} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-2">
                                        {lessons.map((lesson: any) => (
                                            <SortableLessonItem key={lesson.id} lesson={lesson} courseId={courseId} moduleId={module.id} />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        </div>
                    )}

                    {!isAddingLesson ? (
                        <button
                            onClick={() => setIsAddingLesson(true)}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                            + Tambah Materi
                        </button>
                    ) : (
                        <form onSubmit={handleAddLesson} className="mt-4 p-4 border border-blue-100 bg-blue-50 rounded-md">
                            <h4 className="font-medium text-sm mb-3">Tambah Materi Baru</h4>

                            <div className="space-y-3">
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
                                        <input type="radio" name="contentType" value="video" checked={contentType === "video"} onChange={() => setContentType("video")} />
                                        Video (YouTube)
                                    </label>
                                    <label className="flex items-center gap-2 text-sm">
                                        <input type="radio" name="contentType" value="document" checked={contentType === "document"} onChange={() => setContentType("document")} />
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
                                            moduleId={module.id}
                                            onUploadSuccess={(path) => setFileUrl(path)}
                                        />
                                        {fileUrl && (
                                            <p className="text-xs text-green-600 mt-2 font-medium">
                                                File berhasil diunggah! Siap disimpan.
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div className="flex gap-2 pt-2">
                                    <button type="submit" disabled={isPending} className="bg-blue-600 text-white px-3 py-1.5 text-sm rounded hover:bg-blue-700 disabled:opacity-50">Simpan Materi</button>
                                    <button type="button" disabled={isPending} onClick={handleCancelAddLesson} className="text-gray-600 px-3 py-1.5 text-sm hover:bg-gray-200 rounded">Batal</button>
                                </div>
                            </div>
                        </form>
                    )}
                </div>
            )}
        </div>
    );
}
