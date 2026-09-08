"use client";

import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
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

import SortableModuleItem from "./SortableModuleItem";
import { reorderModulesAction, createModuleAction } from "@/lib/actions/module";
import { Spinner } from "@/components/ui/skeletons";

export default function ModulesTab({ course }: { course: any }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [modules, setModules] = useState(course.modules || []);

    // Add Module form state
    const [isAddingModule, setIsAddingModule] = useState(false);
    const [newModuleTitle, setNewModuleTitle] = useState("");

    // Sync state if course.modules changes via Next.js Server Action revalidation
    useEffect(() => {
        setModules(course.modules || []);
    }, [course.modules]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = modules.findIndex((m: any) => m.id === active.id);
        const newIndex = modules.findIndex((m: any) => m.id === over.id);
        const newOrderedModules = arrayMove(modules, oldIndex, newIndex);

        // Optimistic UI update
        setModules(newOrderedModules);

        startTransition(async () => {
            const orderedIds = newOrderedModules.map((m: any) => m.id);
            const res = await reorderModulesAction(course.id, orderedIds);
            if (!res.success) {
                toast.error(res.error || "Gagal mengubah urutan");
                setModules(modules); // revert
            }
        });
    };

    const handleAddModule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newModuleTitle.trim()) return;

        startTransition(async () => {
            const formData = new FormData();
            formData.append("courseId", course.id);
            formData.append("title", newModuleTitle);

            const res = await createModuleAction(null, formData);
            if (res.success) {
                if (res.data) {
                    setModules((prev: any) => [...prev, { ...(res.data as any), lessons: [], quiz: null }]);
                }
                setNewModuleTitle("");
                setIsAddingModule(false);
                toast.success(res.message);
            } else {
                toast.error(res.error || (res.fieldErrors ? JSON.stringify(res.fieldErrors) : "Error"));
            }
        });
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-semibold">Susunan Modul & Materi</h2>
                    <p className="text-sm text-gray-600">Geser (drag-and-drop) untuk mengatur urutan modul. Klik modul untuk mengelola materinya.</p>
                </div>
                <button
                    onClick={() => setIsAddingModule(!isAddingModule)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium text-sm"
                >
                    + Tambah Modul
                </button>
            </div>

            {isAddingModule && (
                <form onSubmit={handleAddModule} className="bg-gray-50 p-4 rounded-md border border-gray-200 mb-6 flex gap-3">
                    <input
                        type="text"
                        placeholder="Judul modul (misal: Bab 1: Pengenalan)"
                        value={newModuleTitle}
                        onChange={(e) => setNewModuleTitle(e.target.value)}
                        className="flex-1 p-2 border border-gray-300 rounded-md"
                        autoFocus
                        disabled={isPending}
                    />
                    <button type="submit" disabled={isPending} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
                        {isPending ? <><Spinner /> Menyimpan...</> : "Simpan"}
                    </button>
                    <button type="button" disabled={isPending} onClick={() => setIsAddingModule(false)} className="text-gray-600 hover:text-gray-900 px-3">Batal</button>
                </form>
            )}

            {modules.length === 0 ? (
                <div className="p-8 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                    Belum ada modul di kursus ini. Silakan tambah modul pertama Anda.
                </div>
            ) : (
                <DndContext id="dnd-modules-list" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={modules.map((m: any) => m.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-4">
                            {modules.map((module: any) => (
                                <SortableModuleItem key={module.id} module={module} courseId={course.id} />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}
        </div>
    );
}
