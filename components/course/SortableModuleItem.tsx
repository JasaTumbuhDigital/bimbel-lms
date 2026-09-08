"use client";

import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";
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
import { updateModuleAction, deleteModuleAction } from "@/lib/actions/module";
import { reorderLessonsAction, createLessonAction } from "@/lib/actions/lesson";
import { createQuizAction, updateQuizAction, deleteQuizAction } from "@/lib/actions/quiz";
import QuizBuilderModal from "../quiz/QuizBuilder";
import { createClient } from "@/utils/supabase/client";
import { institutionConfig } from "@/config/institution";
import SortableLessonItem from "./SortableLessonItem";
import DocumentUpload from "@/components/ui/DocumentUpload";
import { Spinner } from "@/components/ui/skeletons";

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
        setQuiz(module.quiz || null);
    }, [module.lessons, module.quiz]);

    // Form Add Lesson states
    const [lessonTitle, setLessonTitle] = useState("");
    const [contentType, setContentType] = useState<"video" | "document">("video");
    const [videoUrl, setVideoUrl] = useState("");
    const [fileUrl, setFileUrl] = useState(""); // Simulate file path string for now

    // Module Edit states
    const [isEditingModule, setIsEditingModule] = useState(false);
    const [editModuleTitle, setEditModuleTitle] = useState(module.title);

    //Quiz states
    const [quiz, setQuiz] = useState(module.quiz || null);
    const [isAddingQuiz, setIsAddingQuiz] = useState(false);
    const [quizTitle, setQuizTitle] = useState(`Kuis: ${module.title}`);
    const [passingScore, setPassingScore] = useState(70);
    const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
    const [isRandomized, setIsRandomized] = useState(false);

    // Edit & Delete Quiz states
    const [isEditingQuizDetails, setIsEditingQuizDetails] = useState(false);
    const [editQuizTitle, setEditQuizTitle] = useState(quiz?.title || "");
    const [editQuizPassingScore, setEditQuizPassingScore] = useState(quiz?.passingScorePercent || 70);

    const [confirmConfig, setConfirmConfig] = useState<{ title: string; message: string; action: () => Promise<void> } | null>(null);

    const handleUpdateQuizDetails = async (e: React.FormEvent) => {
        e.preventDefault();
        startTransition(async () => {
            if (!quiz) return;
            const formData = new FormData();
            formData.append("id", quiz.id);
            formData.append("title", editQuizTitle);
            formData.append("passingScorePercent", editQuizPassingScore.toString());
            const res = await updateQuizAction(null, formData);
            if (res.success) {
                if (quiz) {
                    setQuiz({ ...quiz, title: editQuizTitle, passingScorePercent: editQuizPassingScore });
                }
                toast.success("Kuis berhasil diperbarui");
                setIsEditingQuizDetails(false);
            } else {
                toast.error(res.error || "Gagal memperbarui kuis");
            }
        });
    };

    const handleDeleteQuiz = () => {
        setConfirmConfig({
            title: "Hapus Kuis",
            message: "Apakah Anda yakin ingin menghapus kuis ini beserta seluruh soalnya?",
            action: async () => {
                const res = await deleteQuizAction(quiz.id);
                if (res.success) {
                    toast.success("Kuis berhasil dihapus");
                    setQuiz(null);
                    setIsQuizModalOpen(false);
                    setConfirmConfig(null);
                } else {
                    toast.error(res.error || "Gagal menghapus kuis");
                }
            }
        });
    };

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
                toast.error(res.error);
                setLessons(lessons);
            }
        });
    };

    const handleAddLesson = async (e: React.FormEvent) => {
        e.preventDefault();

        if (contentType === "document" && !fileUrl) {
            toast("Silakan unggah dokumen terlebih dahulu.");
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
                if (res.data) {
                    setLessons((prev: any) => [...prev, res.data]);
                }
                setLessonTitle("");
                setVideoUrl("");
                setFileUrl("");
                setIsAddingLesson(false);
                toast.success(res.message);
            } else {
                toast.error(res.error || res.fieldErrors ? JSON.stringify(res.fieldErrors) : "Error");
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
                toast.error(res.error);
            }
        });
    };

    const handleDeleteModule = () => {
        setConfirmConfig({
            title: "Hapus Modul",
            message: "Apakah Anda yakin ingin menghapus modul ini beserta seluruh materinya?",
            action: async () => {
                const res = await deleteModuleAction(module.id);
                if (res.success) {
                    toast.success("Modul berhasil dihapus");
                    setConfirmConfig(null);
                } else {
                    toast.error(res.error || "Gagal menghapus modul");
                }
            }
        });
    };

    const handleCreateQuiz = async (e: React.FormEvent) => {
        e.preventDefault();
        startTransition(async () => {
            const formData = new FormData();
            formData.append("moduleId", module.id);
            formData.append("title", quizTitle);
            formData.append("passingScorePercent", passingScore.toString());
            formData.append("isRandomized", isRandomized.toString());
            const res = await createQuizAction(null, formData);
            if (res.success) {
                if (res.data) {
                    setQuiz(res.data);
                }
                setIsAddingQuiz(false);
                toast.success(res.message);
            } else {
                toast.error(res.error || "Gagal membuat kuis");
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
                        <button type="submit" disabled={isPending} className="bg-blue-600 text-white px-2 py-1.5 text-xs rounded hover:bg-blue-700 flex items-center justify-center gap-1">
                            {isPending ? <Spinner className="w-3 h-3" /> : null} Simpan
                        </button>
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
                                    <button type="submit" disabled={isPending} className="bg-blue-600 text-white px-4 py-2 text-sm rounded hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                                        {isPending ? <><Spinner /> Menyimpan...</> : "Tambah Materi"}
                                    </button>
                                    <button type="button" disabled={isPending} onClick={handleCancelAddLesson} className="text-gray-600 px-3 py-1.5 text-sm hover:bg-gray-200 rounded">Batal</button>
                                </div>
                            </div>
                        </form>
                    )}

                    <div className="mt-8 pt-4 border-t border-gray-200">
                        <h4 className="font-semibold text-sm text-gray-800 mb-3">Evaluasi Modul</h4>

                        {quiz ? (
                            !isEditingQuizDetails ? (
                                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-md border border-purple-100">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-purple-100 p-2 rounded-md text-purple-600">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                                                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h5 className="font-medium text-sm text-purple-900">{quiz.title}</h5>
                                                {quiz.isRandomized && (
                                                    <span className="text-[10px] bg-purple-200 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">Acak</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-purple-700 mt-0.5">
                                                KKM: {quiz.passingScorePercent}% • {quiz.questions?.length || 0} Soal
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditQuizTitle(quiz.title);
                                                setEditQuizPassingScore(quiz.passingScorePercent);
                                                setIsEditingQuizDetails(true);
                                            }}
                                            className="text-xs text-purple-700 hover:text-purple-900 font-medium px-2 py-1 hover:bg-purple-100 rounded transition-colors"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleDeleteQuiz}
                                            disabled={isPending}
                                            className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 hover:bg-red-50 rounded transition-colors"
                                        >
                                            Hapus
                                        </button>
                                        <button
                                            onClick={() => setIsQuizModalOpen(!isQuizModalOpen)}
                                            className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${isQuizModalOpen ? 'bg-purple-200 text-purple-800 hover:bg-purple-300' : 'bg-purple-600 text-white hover:bg-purple-700'}`}
                                        >
                                            {isQuizModalOpen ? "Tutup Builder" : "Kelola Soal"}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleUpdateQuizDetails} className="p-4 border border-purple-200 bg-purple-50 rounded-md space-y-3">
                                    <h5 className="font-medium text-xs text-purple-900 font-bold uppercase tracking-wider">Edit Detail Kuis</h5>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div className="sm:col-span-2">
                                            <label className="block text-xs text-gray-600 mb-1">Judul Kuis</label>
                                            <input
                                                type="text"
                                                required
                                                value={editQuizTitle}
                                                onChange={(e) => setEditQuizTitle(e.target.value)}
                                                className="w-full p-2 border border-gray-300 rounded text-sm bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">KKM (%)</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="100"
                                                required
                                                value={editQuizPassingScore}
                                                onChange={(e) => setEditQuizPassingScore(Number(e.target.value))}
                                                className="w-full p-2 border border-gray-300 rounded text-sm bg-white"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => setIsEditingQuizDetails(false)}
                                            className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200 rounded"
                                        >
                                            Batal
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isPending}
                                            className="bg-purple-600 text-white px-3 py-1.5 text-xs rounded hover:bg-purple-700 font-medium disabled:opacity-50 flex items-center justify-center gap-1"
                                        >
                                            {isPending ? <><Spinner className="w-3 h-3" /> Menyimpan...</> : "Simpan Perubahan"}
                                        </button>
                                    </div>
                                </form>
                            )
                        ) : !isAddingQuiz ? (
                            <button
                                onClick={() => setIsAddingQuiz(true)}
                                className="w-full py-2.5 border-2 border-dashed border-purple-300 text-purple-600 rounded-md text-sm font-medium hover:bg-purple-50 hover:border-purple-400 transition-colors"
                            >
                                + Buat Kuis untuk Modul Ini
                            </button>
                        ) : (
                            <form onSubmit={handleCreateQuiz} className="p-4 border border-purple-100 bg-purple-50 rounded-md">
                                <h5 className="font-medium text-sm mb-3 text-purple-900">Buat Kuis Baru</h5>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Judul Kuis</label>
                                        <input
                                            type="text"
                                            required
                                            value={quizTitle}
                                            onChange={(e) => setQuizTitle(e.target.value)}
                                            className="w-full p-2 border border-gray-300 rounded text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Nilai Kelulusan Minimum (KKM %)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="100"
                                            required
                                            value={passingScore}
                                            onChange={(e) => setPassingScore(Number(e.target.value))}
                                            className="w-24 p-2 border border-gray-300 rounded text-sm"
                                        />
                                    </div>
                                    <label className="flex items-start gap-2 text-sm mt-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isRandomized}
                                            onChange={(e) => setIsRandomized(e.target.checked)}
                                            className="mt-1 rounded text-purple-600 focus:ring-purple-500"
                                        />
                                        <div>
                                            <span className="font-medium text-gray-700">Acak Urutan Soal (Siswa)</span>
                                            <p className="text-xs text-gray-500">Jika dicentang, siswa akan menerima soal dengan urutan acak setiap kali mengerjakan.</p>
                                        </div>
                                    </label>
                                    <div className="flex gap-2 pt-2">
                                        <button type="submit" disabled={isPending} className="bg-purple-600 text-white px-3 py-1.5 text-sm rounded hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-1">
                                            {isPending ? <><Spinner /> Menyimpan...</> : "Simpan Kuis"}
                                        </button>
                                        <button type="button" disabled={isPending} onClick={() => setIsAddingQuiz(false)} className="text-gray-600 px-3 py-1.5 text-sm hover:bg-gray-200 rounded">
                                            Batal
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}

                        {/* Inline Quiz Builder */}
                        {isQuizModalOpen && quiz && (
                            <div className="mt-4 border-2 border-purple-100 rounded-lg overflow-hidden bg-white">
                                <QuizBuilderModal
                                    onClose={() => setIsQuizModalOpen(false)}
                                    quiz={quiz}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal Konfirmasi Hapus */}
            {confirmConfig && (
                <ConfirmModal
                    title={confirmConfig.title}
                    message={confirmConfig.message}
                    onConfirm={confirmConfig.action}
                    onClose={() => setConfirmConfig(null)}
                />
            )}
        </div>
    );
}

// Sub-komponen Modal Konfirmasi
function ConfirmModal({ title, message, onConfirm, onClose }: { title: string; message: string; onConfirm: () => Promise<void>; onClose: () => void }) {
    const [isPending, setIsPending] = useState(false);

    const handleConfirm = async () => {
        setIsPending(true);
        await onConfirm();
        setIsPending(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg w-full max-w-sm p-6 space-y-4 shadow-xl border border-slate-200">
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-slate-900">{title}</h2>
                    <button onClick={onClose} disabled={isPending} className="text-slate-400 hover:text-slate-600 text-lg">&times;</button>
                </div>
                <p className="text-sm text-slate-600">{message}</p>
                <div className="flex justify-end gap-2 pt-2">
                    <button onClick={onClose} disabled={isPending} className="text-sm px-4 py-1.5 border border-slate-200 rounded-md text-slate-600">
                        Batal
                    </button>
                    <button onClick={handleConfirm} disabled={isPending} className="text-sm px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                        {isPending ? <><Spinner /> Menghapus...</> : "Hapus"}
                    </button>
                </div>
            </div>
        </div>
    );
}
