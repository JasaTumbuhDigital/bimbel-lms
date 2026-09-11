"use client";

import { useActionState, useState, useTransition } from "react";
import TipTapEditor from "./TipTapEditor";
import CoverImageUpload from "./CoverImageUpload";
import TagAutocomplete from "./TagAutocomplete";
import {
    updateArticleContentAction,
    updateArticleMetadataAction,
    submitArticleForReviewAction,
    approveArticleAction,
    unpublishArticleAction
} from "@/lib/actions/blog";
import { ActionResult } from "@/types/action";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface ArticleEditorFormProps {
    article: any;
    categories: any[];
    role: "admin" | "tutor" | "co_author";
    isMainAuthor: boolean;
}

export default function ArticleEditorForm({ article, categories, role, isMainAuthor }: ArticleEditorFormProps) {
    const router = useRouter();
    const canEditMetadata = role === "admin" || isMainAuthor;
    const canPublish = role === "admin";

    // States for Content
    const [contentJson, setContentJson] = useState<any>(article.content || {});
    const [coverImageUrl, setCoverImageUrl] = useState(article.coverImageUrl || "");
    const [title, setTitle] = useState(article.title || "");
    const [excerpt, setExcerpt] = useState(article.excerpt || "");

    // Actions state
    const [contentState, contentAction, isContentPending] = useActionState<ActionResult, FormData>(
        updateArticleContentAction,
        { success: false }
    );

    const [metaState, metaAction, isMetaPending] = useActionState<ActionResult, FormData>(
        updateArticleMetadataAction,
        { success: false }
    );

    const [isPending, startTransition] = useTransition();

    const handleWorkflowAction = (actionFn: (id: string) => Promise<ActionResult>) => {
        startTransition(async () => {
            const res = await actionFn(article.id);
            if (res.success) {
                alert(res.message);
                router.refresh();
            } else {
                alert(res.error);
            }
        });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content Area (2/3 width) */}
            <div className="lg:col-span-2 space-y-6">

                {/* CONTENT FORM */}
                <form action={contentAction} className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 space-y-4">
                    <h2 className="text-xl font-bold text-slate-800 border-b pb-2 mb-4">Konten Artikel</h2>

                    <input type="hidden" name="articleId" value={article.id} />
                    <input type="hidden" name="content" value={JSON.stringify(contentJson)} />
                    <input type="hidden" name="coverImageUrl" value={coverImageUrl} />

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Judul Artikel</label>
                        <input
                            type="text"
                            name="title"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                        {contentState?.fieldErrors?.title && (
                            <p className="text-sm text-red-500 mt-1">{contentState.fieldErrors.title[0]}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Ringkasan (Excerpt)</label>
                        <textarea
                            name="excerpt"
                            value={excerpt}
                            onChange={e => setExcerpt(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Ringkasan singkat artikel..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Isi Artikel</label>
                        <div className="border border-slate-300 rounded-md">
                            <TipTapEditor 
                                content={contentJson}
                                onChange={setContentJson}
                                articleId={article.id}
                            />
                        </div>
                    </div>

                    {contentState?.error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">
                            {contentState.error}
                        </div>
                    )}

                    {contentState?.success && (
                        <div className="bg-green-50 text-green-600 p-3 rounded-md text-sm border border-green-200">
                            {contentState.message}
                        </div>
                    )}

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={isContentPending}
                            className="bg-blue-600 text-white font-medium px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isContentPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            Simpan Konten & Draft
                        </button>
                    </div>
                </form>
            </div>

            {/* Sidebar (1/3 width) */}
            <div className="space-y-6">

                {/* WORKFLOW STATUS */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 space-y-4">
                    <h2 className="text-lg font-bold text-slate-800 border-b pb-2 mb-2">Status & Workflow</h2>

                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-sm font-medium text-slate-600">Status Saat Ini:</span>
                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${article.status === 'published' ? 'bg-green-100 text-green-800' :
                            article.status === 'review' ? 'bg-amber-100 text-amber-800' :
                                'bg-slate-100 text-slate-800'
                            }`}>
                            {article.status.toUpperCase()}
                        </span>
                    </div>

                    {/* Workflow Buttons */}
                    <div className="space-y-2">
                        {article.status === 'draft' && canEditMetadata && (
                            <button
                                type="button"
                                onClick={() => handleWorkflowAction(submitArticleForReviewAction)}
                                disabled={isPending}
                                className="w-full bg-amber-500 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-amber-600 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                            >
                                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                Ajukan Review (Submit)
                            </button>
                        )}

                        {article.status === 'review' && canPublish && (
                            <button
                                type="button"
                                onClick={() => handleWorkflowAction(approveArticleAction)}
                                disabled={isPending}
                                className="w-full bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                            >
                                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                Publish Artikel
                            </button>
                        )}

                        {article.status === 'published' && canPublish && (
                            <button
                                type="button"
                                onClick={() => handleWorkflowAction(unpublishArticleAction)}
                                disabled={isPending}
                                className="w-full bg-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-md hover:bg-slate-300 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                            >
                                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                Tarik ke Draft (Unpublish)
                            </button>
                        )}
                    </div>
                </div>

                {/* COVER IMAGE */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 space-y-4">
                    <h2 className="text-lg font-bold text-slate-800 border-b pb-2 mb-2">Cover Image</h2>
                    <CoverImageUpload
                        articleId={article.id}
                        currentCoverUrl={coverImageUrl}
                        onUploadSuccess={setCoverImageUrl}
                    />
                    <p className="text-xs text-slate-500 italic mt-1">Gambar ini akan disimpan bersamaan saat menekan tombol "Simpan Konten & Draft".</p>
                </div>

                {/* METADATA FORM (Only for Admin/Main Author) */}
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
                            {/* We will map tags array into multiple hidden inputs so FormData.getAll works */}
                            <TagAutocomplete
                                initialTags={article.tags?.map((t: any) => t.tag.name) || []}
                                onTagsChange={() => { }} // Not really needed because we use hidden inputs inside TagAutocomplete
                            />
                        </div>

                        <div className="pt-2 border-t mt-4">
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
                                rows={2}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Opsional, default = Ringkasan"
                            />
                        </div>

                        {metaState?.error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">
                                {metaState.error}
                            </div>
                        )}

                        {metaState?.success && (
                            <div className="bg-green-50 text-green-600 p-3 rounded-md text-sm border border-green-200">
                                {metaState.message}
                            </div>
                        )}

                        <div className="flex justify-end pt-2">
                            <button
                                type="submit"
                                disabled={isMetaPending}
                                className="bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-slate-900 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {isMetaPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                Simpan Metadata
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 text-sm text-slate-500 text-center">
                        Hanya Admin dan Author Utama yang dapat mengubah Metadata, Kategori, dan SEO.
                    </div>
                )}
            </div>
        </div>
    );
}
