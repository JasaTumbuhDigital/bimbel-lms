"use client";

import { useActionState, useState, useTransition, useEffect, useRef } from "react";
import {
    createBlogCategoryAction,
    updateBlogCategoryAction,
    deleteBlogCategoryAction
} from "@/lib/actions/blog";
import { ActionResult } from "@/types/action";
import { Plus, Trash2, Pencil, Check, X, Loader2, FolderTree } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface CategoryWithCount {
    id: string;
    name: string;
    slug: string;
    _count?: {
        articles: number;
    };
}

interface CategoryManagerProps {
    initialCategories: CategoryWithCount[];
}

export default function CategoryManager({ initialCategories }: CategoryManagerProps) {
    const router = useRouter();
    const [name, setName] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const [createState, createAction, isCreatePending] = useActionState<ActionResult, FormData>(
        createBlogCategoryAction,
        { success: false }
    );
    const prevCreateState = useRef<ActionResult | null>(null);

    useEffect(() => {
        if (createState === prevCreateState.current) return;
        prevCreateState.current = createState;

        if (!createState) return;

        if (createState.success) {
            toast.success(createState.message || "Kategori berhasil ditambahkan");
            setName("");
            router.refresh();
        } else if (createState.error) {
            toast.error(createState.error);
        }
    }, [createState, router]);

    const handleDelete = (category: CategoryWithCount) => {
        const count = category._count?.articles || 0;
        const confirmMsg = count > 0
            ? `Kategori "${category.name}" digunakan oleh ${count} artikel. Jika dihapus, artikel terkait akan berstatus tanpa kategori. Tetap hapus?`
            : `Yakin ingin menghapus kategori "${category.name}"?`;

        if (!window.confirm(confirmMsg)) return;

        setDeletingId(category.id);
        startTransition(async () => {
            const res = await deleteBlogCategoryAction(category.id);
            if (res.success) {
                toast.success(res.message || "Kategori berhasil dihapus");
                router.refresh();
            } else {
                toast.error(res.error || "Gagal menghapus kategori");
            }
            setDeletingId(null);
        });
    };

    const handleStartEdit = (category: CategoryWithCount) => {
        setEditingId(category.id);
        setEditingName(category.name);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditingName("");
    };

    const handleSaveEdit = async (categoryId: string) => {
        const trimmed = editingName.trim();
        if (!trimmed || trimmed.length < 2) {
            toast.error("Nama kategori minimal 2 karakter");
            return;
        }

        setIsUpdating(true);
        try {
            const res = await updateBlogCategoryAction(categoryId, trimmed);
            if (res.success) {
                toast.success(res.message || "Kategori berhasil diperbarui");
                setEditingId(null);
                setEditingName("");
                router.refresh();
            } else {
                toast.error(res.error || "Gagal memperbarui kategori");
            }
        } catch {
            toast.error("Terjadi kesalahan saat memperbarui kategori");
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Form Tambah Kategori */}
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <FolderTree className="w-4 h-4 text-blue-600" />
                    Tambah Kategori Baru
                </h2>
                <form action={createAction} className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        name="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Masukkan nama kategori (contoh: Tips & Trik, UTBK, dsb.)"
                        required
                        disabled={isCreatePending}
                        className="flex-1 px-3.5 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                    <button
                        type="submit"
                        disabled={isCreatePending || !name.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 min-w-32"
                    >
                        {isCreatePending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Plus className="w-4 h-4" />
                        )}
                        <span>Tambah</span>
                    </button>
                </form>
            </div>

            {/* Tabel Daftar Kategori */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                        Daftar Kategori ({initialCategories.length})
                    </h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-800">
                        <thead className="bg-slate-100 border-b border-slate-200 text-xs font-semibold uppercase text-slate-600">
                            <tr>
                                <th className="py-3 px-5">Nama Kategori</th>
                                <th className="py-3 px-5">Slug (URL)</th>
                                <th className="py-3 px-5 text-center">Jumlah Artikel</th>
                                <th className="py-3 px-5 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {initialCategories.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-8 px-4 text-center text-slate-500">
                                        Belum ada kategori yang dibuat. Silakan tambahkan lewat form di atas.
                                    </td>
                                </tr>
                            ) : (
                                initialCategories.map((cat) => {
                                    const isEditing = editingId === cat.id;

                                    return (
                                        <tr key={cat.id} className={`transition-colors ${isEditing ? "bg-blue-50/50" : "hover:bg-slate-50/80"}`}>
                                            <td className="py-3 px-5 font-medium text-slate-900">
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={editingName}
                                                        onChange={(e) => setEditingName(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") {
                                                                e.preventDefault();
                                                                handleSaveEdit(cat.id);
                                                            } else if (e.key === "Escape") {
                                                                handleCancelEdit();
                                                            }
                                                        }}
                                                        disabled={isUpdating}
                                                        autoFocus
                                                        placeholder="Nama kategori..."
                                                        className="px-2.5 py-1 border border-blue-400 rounded-md text-sm w-full max-w-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                                                    />
                                                ) : (
                                                    cat.name
                                                )}
                                            </td>
                                            <td className="py-3.5 px-5 text-slate-500 font-mono text-xs">
                                                {cat.slug}
                                            </td>
                                            <td className="py-3.5 px-5 text-center">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                                    {cat._count?.articles ?? 0}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-5 text-right">
                                                {isEditing ? (
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSaveEdit(cat.id)}
                                                            disabled={isUpdating || !editingName.trim()}
                                                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100/70 rounded transition-colors disabled:opacity-50"
                                                            title="Simpan Perubahan (Enter)"
                                                        >
                                                            {isUpdating ? (
                                                                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                                            ) : (
                                                                <Check className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={handleCancelEdit}
                                                            disabled={isUpdating}
                                                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded transition-colors disabled:opacity-50"
                                                            title="Batal (Esc)"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleStartEdit(cat)}
                                                            disabled={isPending || isUpdating || editingId !== null}
                                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                                                            title="Edit Kategori"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(cat)}
                                                            disabled={(isPending && deletingId === cat.id) || isUpdating || editingId !== null}
                                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                                            title="Hapus Kategori"
                                                        >
                                                            {isPending && deletingId === cat.id ? (
                                                                <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                                                            ) : (
                                                                <Trash2 className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
