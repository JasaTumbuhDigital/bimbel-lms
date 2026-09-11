"use client";

import { useActionState, useEffect, useRef } from "react";
import { updateArticleMetadataAction } from "@/lib/actions/blog";
import TagAutocomplete from "./TagAutocomplete";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ArticleMetadataSidebarProps {
    article: {
        id: string;
        slug: string;
        categoryId: string | null;
        seoTitle: string | null;
        seoDescription: string | null;
        tags?: { tag: { name: string } }[];
    };
    categories: { id: string; name: string }[];
    canEditMetadata: boolean;
}

export default function ArticleMetadataSidebar({
    article,
    categories,
    canEditMetadata,
}: ArticleMetadataSidebarProps) {
    const [metaState, metaAction, isMetaPending] = useActionState(updateArticleMetadataAction, null);
    const prevMetaState = useRef(metaState);

    useEffect(() => {
        if (metaState === prevMetaState.current) return;
        prevMetaState.current = metaState;

        if (!metaState) return;
        if (metaState.success) {
            toast.success(metaState.message || "Metadata berhasil disimpan");
        } else if (metaState.error) {
            toast.error(metaState.error);
        }
    }, [metaState]);

    return (
        <div className="space-y-6">
            {canEditMetadata ? (
                <form action={metaAction} className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 space-y-4">
                    <h2 className="text-lg font-bold text-slate-800 border-b pb-2 mb-4">Metadata & SEO</h2>
                    <input type="hidden" name="articleId" value={article.id} />

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">URL Slug</label>
                        <input
                            type="text"
                            name="slug"
                            defaultValue={article.slug}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Kategori</label>
                        <select
                            name="categoryId"
                            defaultValue={article.categoryId || ""}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">-- Pilih Kategori --</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tags</label>
                        <TagAutocomplete
                            initialTags={article.tags?.map((t: any) => t.tag.name) || []}
                            onTagsChange={() => { }}
                        />
                    </div>

                    <div className="pt-4 border-t mt-4">
                        <label className="block text-sm font-medium text-slate-700 mb-1">SEO Title</label>
                        <input
                            type="text"
                            name="seoTitle"
                            defaultValue={article.seoTitle || ""}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Opsional, default = Judul Artikel"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">SEO Description</label>
                        <textarea
                            name="seoDescription"
                            defaultValue={article.seoDescription || ""}
                            rows={3}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Opsional, default = Ringkasan"
                        />
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={isMetaPending}
                            className="w-full bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-slate-900 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isMetaPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            Simpan Metadata & SEO
                        </button>
                    </div>
                </form>
            ) : (
                <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 text-sm text-slate-500 text-center">
                    Hanya Admin dan Author Utama yang dapat mengubah Metadata, Kategori, dan SEO.
                </div>
            )}
        </div>
    );
}
