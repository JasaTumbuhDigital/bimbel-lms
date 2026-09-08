"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { updateClassLevelAction } from "@/lib/actions/class-level";
import { Spinner } from "@/components/ui/skeletons";
import { ActionResult } from "@/types/action";

export default function EditClassLevelButton({
    level
}: {
    level: {
        id: string;
        name: string;
        description: string | null;
        isDefault: boolean;
    }
}) {
    const [showEdit, setShowEdit] = useState(false);
    const [state, formAction, isPending] = useActionState<ActionResult, FormData>(
        updateClassLevelAction,
        { success: false }
    );

    // Menangani respons action
    useEffect(() => {
        if (state.success && showEdit) {
            toast.success(state.message || "Tingkatan kelas berhasil diperbarui");
            setShowEdit(false);
        } else if (state.error && showEdit) {
            toast.error(state.error);
        }
    }, [state, showEdit]);

    return (
        <div className="inline-flex flex-col items-end relative">
            <button
                type="button"
                onClick={() => setShowEdit(true)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
            >
                Edit
            </button>

            {showEdit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 text-left">
                    <div className="bg-white rounded-lg w-full max-w-md p-6 shadow-xl border border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-semibold text-slate-900">Edit Tingkatan Kelas</h2>
                            <button
                                type="button"
                                onClick={() => setShowEdit(false)}
                                disabled={isPending}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>

                        <form action={formAction} className="space-y-4">
                            <input type="hidden" name="id" value={level.id} />
                            
                            <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                                    Nama Kelas / Tingkatan *
                                </label>
                                <input
                                    name="name"
                                    type="text"
                                    required
                                    defaultValue={level.name}
                                    placeholder="Contoh: 10 SMA, 11 SMA, 12 UTBK"
                                    className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                />
                                {state.fieldErrors?.name && (
                                    <p className="text-xs text-red-600">{state.fieldErrors.name[0]}</p>
                                )}
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                                    Deskripsi (Opsional)
                                </label>
                                <input
                                    name="description"
                                    type="text"
                                    defaultValue={level.description || ""}
                                    placeholder="Contoh: Kurikulum Merdeka Fase E"
                                    className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                />
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                                <input
                                    id={`isDefault-${level.id}`}
                                    name="isDefault"
                                    type="checkbox"
                                    value="true"
                                    defaultChecked={level.isDefault}
                                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                />
                                <label htmlFor={`isDefault-${level.id}`} className="text-xs text-slate-700 font-medium">
                                    Jadikan kelas bawaan default saat pendaftaran siswa baru
                                </label>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowEdit(false)}
                                    disabled={isPending}
                                    className="text-sm px-4 py-1.5 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="text-sm px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 flex items-center justify-center gap-2 min-w-[100px]"
                                >
                                    {isPending ? <><Spinner className="w-3 h-3 text-white" /> Simpan</> : "Simpan Perubahan"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
