"use client";

import { useState, useActionState, useTransition, useEffect, useRef } from "react";
import { addCoAuthorAction, removeCoAuthorAction } from "@/lib/actions/blog";
import { ActionResult } from "@/types/action";
import { useRouter } from "next/navigation";
import { Users, User, Trash2, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Select, { SelectOption } from "@/components/ui/Select";

interface CoAuthorItem {
    userId: string;
    user: {
        id: string;
        name: string;
    };
}

interface CoAuthorManagerProps {
    articleId: string;
    mainAuthor: {
        id: string;
        name: string;
    };
    coAuthors: CoAuthorItem[];
    availableTutors: Array<{ id: string; name: string }>;
    canManage: boolean;
}

export default function CoAuthorManager({
    articleId,
    mainAuthor,
    coAuthors,
    availableTutors,
    canManage,
}: CoAuthorManagerProps) {
    const router = useRouter();
    const [selectedUserId, setSelectedUserId] = useState("");
    const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const [addState, addAction, isAddPending] = useActionState<ActionResult, FormData>(
        addCoAuthorAction,
        { success: false }
    );
    const prevAddState = useRef<ActionResult | null>(null);

    useEffect(() => {
        if (addState === prevAddState.current) return;
        prevAddState.current = addState;

        if (!addState) return;
        if (addState.success) {
            toast.success(addState.message || "Co-Author berhasil ditambahkan");
            setSelectedUserId("");
            router.refresh();
        } else if (addState.error) {
            toast.error(addState.error);
        }
    }, [addState, router]);

    const handleRemove = (coAuthorId: string, name: string) => {
        if (!window.confirm(`Hapus ${name} dari daftar Co-Author?`)) return;

        setDeletingUserId(coAuthorId);
        startTransition(async () => {
            const res = await removeCoAuthorAction(articleId, coAuthorId);
            if (res.success) {
                toast.success(res.message || "Co-Author berhasil dihapus");
                router.refresh();
            } else {
                toast.error(res.error || "Gagal menghapus co-author");
            }
            setDeletingUserId(null);
        });
    };

    // Filter tutor yang belum menjadi Author Utama ataupun Co-Author
    const assignedUserIds = new Set([mainAuthor.id, ...coAuthors.map((c) => c.userId)]);
    const tutorOptions: SelectOption[] = availableTutors
        .filter((t) => !assignedUserIds.has(t.id))
        .map((t) => ({
            value: t.id,
            label: t.name,
        }));

    return (
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Users className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-sm text-slate-800">Kolaborasi & Penulis</h3>
            </div>

            {/* Penulis Utama */}
            <div>
                <span className="text-xs font-medium text-slate-500 block mb-1.5">Penulis Utama</span>
                <div className="flex items-center gap-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-md">
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {mainAuthor.name ? mainAuthor.name.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-900 truncate">{mainAuthor.name}</p>
                        <p className="text-[10px] text-blue-600 font-medium">Author Utama</p>
                    </div>
                </div>
            </div>

            {/* Daftar Co-Author */}
            <div>
                <span className="text-xs font-medium text-slate-500 block mb-1.5">
                    Co-Author ({coAuthors.length})
                </span>

                {coAuthors.length === 0 ? (
                    <p className="text-xs text-slate-400 italic bg-slate-50/50 p-2.5 rounded border border-dashed border-slate-200 text-center">
                        Belum ada Co-Author yang ditambahkan.
                    </p>
                ) : (
                    <div className="space-y-1.5">
                        {coAuthors.map((co) => (
                            <div
                                key={co.userId}
                                className="flex items-center justify-between p-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-md transition-colors"
                            >
                                <div className="flex items-center gap-2 min-w-0 pr-2">
                                    <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                                        {co.user.name ? co.user.name.charAt(0).toUpperCase() : "U"}
                                    </div>
                                    <span className="text-xs font-medium text-slate-800 truncate">
                                        {co.user.name}
                                    </span>
                                </div>

                                {canManage && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemove(co.userId, co.user.name)}
                                        disabled={isPending && deletingUserId === co.userId}
                                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors shrink-0"
                                        title={`Hapus ${co.user.name}`}
                                    >
                                        {isPending && deletingUserId === co.userId ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                                        ) : (
                                            <Trash2 className="w-3.5 h-3.5" />
                                        )}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Form Tambah Co-Author (Hanya untuk Admin & Author Utama) */}
            {canManage && (
                <div className="pt-2 border-t border-slate-100">
                    <span className="text-xs font-medium text-slate-700 block mb-1.5">
                        Tambah Co-Author
                    </span>
                    <form action={addAction} className="space-y-2">
                        <input type="hidden" name="articleId" value={articleId} />
                        <input type="hidden" name="userId" value={selectedUserId} />

                        <Select
                            options={tutorOptions}
                            value={selectedUserId}
                            onChange={(val) => setSelectedUserId(val)}
                            placeholder={
                                tutorOptions.length === 0
                                    ? "Semua tutor sudah terdaftar"
                                    : "Pilih Tutor / Admin..."
                            }
                            searchPlaceholder="Cari nama tutor..."
                            emptyText="Tutor tidak ditemukan."
                            clearable={false}
                            disabled={isAddPending || tutorOptions.length === 0}
                        />

                        <button
                            type="submit"
                            disabled={isAddPending || !selectedUserId}
                            className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5"
                        >
                            {isAddPending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Plus className="w-3.5 h-3.5" />
                            )}
                            <span>Tambah Co-Author</span>
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
