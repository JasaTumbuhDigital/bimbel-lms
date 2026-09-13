"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { updateArticleMetadataAction } from "@/lib/actions/blog";
import { Loader2, ImageIcon, Link } from "lucide-react";
import { toast } from "sonner";

interface ArticleMetadataSidebarProps {
    article: {
        id: string;
        slug: string;
        seoTitle: string | null;
        seoDescription: string | null;
        seoImageUrl: string | null;
        coverImageUrl: string | null;
    };
    canEditMetadata: boolean;
}

export default function ArticleMetadataSidebar({
    article,
    canEditMetadata,
}: ArticleMetadataSidebarProps) {
    const [metaState, metaAction, isMetaPending] = useActionState(updateArticleMetadataAction, null);
    const prevMetaState = useRef(metaState);

    // Mode SEO Image: "cover" (pakai cover artikel) atau "custom" (URL sendiri)
    const [seoImageMode, setSeoImageMode] = useState<"cover" | "custom">(
        article.seoImageUrl && article.seoImageUrl !== article.coverImageUrl ? "custom" : "cover"
    );
    const [customSeoImageUrl, setCustomSeoImageUrl] = useState(
        seoImageMode === "custom" ? (article.seoImageUrl || "") : ""
    );

    // Nilai final seoImageUrl yang akan dikirim ke server
    const seoImageValue = seoImageMode === "cover"
        ? (article.coverImageUrl || "")
        : customSeoImageUrl;

    useEffect(() => {
        if (metaState === prevMetaState.current) return;
        prevMetaState.current = metaState;

        if (!metaState) return;
        if (metaState.success) {
            toast.success(metaState.message || "SEO metadata berhasil disimpan");
        } else if (metaState.error) {
            toast.error(metaState.error);
        }
    }, [metaState]);

    return (
        <div className="space-y-6">
            {canEditMetadata ? (
                <form action={metaAction} className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 space-y-5">
                    <div className="border-b pb-3">
                        <h2 className="text-base font-bold text-slate-800">SEO & Penerbitan</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Pengaturan ini mempengaruhi tampilan di mesin pencari & sosial media</p>
                    </div>
                    <input type="hidden" name="articleId" value={article.id} />
                    <input type="hidden" name="seoImageUrl" value={seoImageValue} />

                    {/* URL Slug */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">URL Slug</label>
                        <div className="flex items-center gap-1.5 border border-slate-300 rounded-md px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                            <Link className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <input
                                type="text"
                                name="slug"
                                defaultValue={article.slug}
                                className="flex-1 outline-none bg-transparent text-slate-800 placeholder:text-slate-400"
                                placeholder="url-artikel-anda"
                            />
                        </div>
                    </div>

                    {/* SEO Title */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            SEO Title
                            <span className="ml-1.5 text-xs font-normal text-slate-400">(opsional)</span>
                        </label>
                        <input
                            type="text"
                            name="seoTitle"
                            defaultValue={article.seoTitle || ""}
                            maxLength={70}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Default: judul artikel"
                        />
                        <p className="text-xs text-slate-400 mt-1">Maks. 70 karakter. Muncul di tab browser & hasil Google.</p>
                    </div>

                    {/* SEO Description */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            SEO Description
                            <span className="ml-1.5 text-xs font-normal text-slate-400">(opsional)</span>
                        </label>
                        <textarea
                            name="seoDescription"
                            defaultValue={article.seoDescription || ""}
                            rows={3}
                            maxLength={160}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Default: ringkasan artikel"
                        />
                        <p className="text-xs text-slate-400 -mt-0.5">Maks. 160 karakter. Muncul di bawah judul di Google.</p>
                    </div>

                    {/* SEO Image */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Gambar Sosial Media (OG Image)
                        </label>
                        <div className="flex rounded-md overflow-hidden border border-slate-300 text-sm mb-3">
                            <button
                                type="button"
                                onClick={() => setSeoImageMode("cover")}
                                className={`flex-1 px-3 py-1.5 font-medium transition-colors ${seoImageMode === "cover" ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-50"}`}
                            >
                                Sama dengan Cover
                            </button>
                            <button
                                type="button"
                                onClick={() => setSeoImageMode("custom")}
                                className={`flex-1 px-3 py-1.5 font-medium transition-colors ${seoImageMode === "custom" ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-50"}`}
                            >
                                URL Lain
                            </button>
                        </div>

                        {seoImageMode === "cover" ? (
                            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 flex items-center gap-2 text-xs text-slate-500">
                                <ImageIcon className="w-4 h-4 shrink-0" />
                                {article.coverImageUrl
                                    ? "Menggunakan gambar cover artikel"
                                    : "Belum ada cover — tambahkan cover artikel terlebih dahulu"}
                            </div>
                        ) : (
                            <div>
                                <input
                                    type="url"
                                    value={customSeoImageUrl}
                                    onChange={e => setCustomSeoImageUrl(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="https://example.com/og-image.jpg"
                                />
                                <p className="text-xs text-slate-400 mt-1">Ukuran ideal: 1200 × 630 px.</p>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isMetaPending}
                        className="w-full bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-slate-900 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isMetaPending && <Loader2 className="w-4 h-4 animate-spin" />}
                        Simpan SEO & Penerbitan
                    </button>
                </form>
            ) : (
                <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 text-sm text-slate-500 text-center">
                    Hanya Admin dan Author Utama yang dapat mengubah SEO dan pengaturan penerbitan.
                </div>
            )}
        </div>
    );
}
