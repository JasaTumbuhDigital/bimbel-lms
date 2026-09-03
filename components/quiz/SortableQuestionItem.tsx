"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export default function SortableQuestionItem({
    q,
    index,
    isPending,
    onEdit,
    onDelete
}: {
    q: any;
    index: number;
    isPending: boolean;
    onEdit: (q: any) => void;
    onDelete: (id: string) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: q.id,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        position: isDragging ? ("relative" as const) : ("static" as const),
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`border border-gray-200 p-5 rounded-md shadow-sm bg-white ${isDragging ? "opacity-50 border-purple-300" : "hover:border-gray-300"}`}
        >
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-start gap-3">
                    <button
                        {...attributes}
                        {...listeners}
                        className="mt-0.5 cursor-grab text-gray-400 hover:text-gray-600 focus:outline-none shrink-0"
                        title="Geser untuk mengurutkan"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                        </svg>
                    </button>
                    <p className="font-medium text-sm text-gray-800 whitespace-pre-wrap">
                        <span className="text-gray-400 mr-2">{index + 1}.</span>
                        {q.questionText}
                    </p>
                </div>
                <div className="flex gap-3 ml-4 shrink-0">
                    <button
                        onClick={() => onEdit(q)}
                        disabled={isPending}
                        className="text-xs font-medium text-blue-600 hover:underline disabled:opacity-50"
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => onDelete(q.id)}
                        disabled={isPending}
                        className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                    >
                        Hapus
                    </button>
                </div>
            </div>

            {/* List Opsi Jawaban */}
            <div className="pl-10 space-y-1.5 mt-4">
                {q.options?.map((opt: any) => (
                    <div
                        key={opt.id}
                        className={`text-xs p-2.5 rounded-md flex items-start gap-2 ${opt.isCorrect
                                ? "bg-green-50 border border-green-200 text-green-900 font-medium"
                                : "bg-gray-50 border border-gray-100 text-gray-600"
                            }`}
                    >
                        <span>{opt.isCorrect ? "✅" : "⚪"}</span>
                        <span className="mt-0.5">{opt.optionText}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
