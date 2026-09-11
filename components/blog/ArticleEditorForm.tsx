"use client";

import { useActionState, useState, useTransition, useEffect, useRef } from "react";
import TipTapEditor from "./TipTapEditor";
import CoverImageUpload from "./CoverImageUpload";
import ArticleMetadataSidebar from "./ArticleMetadataSidebar";
import ArticleFormActions from "./ArticleFormActions";
import AdminReviewCard from "./AdminReviewCard";
import ArticleReviewBanner from "./ArticleReviewBanner";
import {
    updateArticleContentAction,
    unpublishArticleAction
} from "@/lib/actions/blog";
import { ActionResult } from "@/types/action";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { toast } from "sonner";

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

    // Form content states
    const [contentJson, setContentJson] = useState<any>(article.content || {});
    const [coverImageUrl, setCoverImageUrl] = useState(article.coverImageUrl || "");
    const [title, setTitle] = useState(article.title || "");
    const [excerpt, setExcerpt] = useState(article.excerpt || "");

    // Track which button was clicked to show spinner only on that button
    const [activeBtn, setActiveBtn] = useState<string | null>(null);

    // "Baseline" values (updated after successful save to reset dirty state)
    const baseline = useRef({
        title: article.title || "",
        content: JSON.stringify(article.content || {}),
        cover: article.coverImageUrl || "",
        excerpt: article.excerpt || "",
    });

    const isDirty =
        title !== baseline.current.title ||
        JSON.stringify(contentJson) !== baseline.current.content ||
        coverImageUrl !== baseline.current.cover ||
        excerpt !== baseline.current.excerpt;

    // Server action state for content
    const [contentState, contentAction, isContentPending] = useActionState<ActionResult, FormData>(
        updateArticleContentAction,
        { success: false }
    );
    const [isPending, startTransition] = useTransition();

    // Toast tracking — only fire when state object reference changes
    const prevContentState = useRef<ActionResult | null>(null);

    useEffect(() => {
        if (contentState === prevContentState.current) return;
        prevContentState.current = contentState;

        if (!contentState) return;

        if (contentState.success) {
            toast.success(contentState.message || "Isi artikel berhasil diperbarui");
            // Reset dirty baseline to current values
            baseline.current = {
                title,
                content: JSON.stringify(contentJson),
                cover: coverImageUrl,
                excerpt,
            };
        } else if (contentState.error) {
            toast.error(contentState.error);
        }
        setActiveBtn(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contentState]);

    const handleUnpublish = () => {
        setActiveBtn("unpublish");
        startTransition(async () => {
            const res = await unpublishArticleAction(article.id);
            if (res.success) {
                toast.success(res.message || "Artikel berhasil di-unpublish");
                router.refresh();
            } else {
                toast.error(res.error || "Gagal meng-unpublish artikel");
            }
            setActiveBtn(null);
        });
    };

    return (
        <div className="space-y-6">
            {/* Banner Rejection */}
            <ArticleReviewBanner status={article.status} reviewNote={article.reviewNote} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-6">
                    <form action={contentAction} className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 space-y-6">
                        <div className="flex items-center justify-between border-b pb-4">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                Konten Artikel
                                {isDirty && (
                                    <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                        <Save className="w-3 h-3" /> Ada perubahan
                                    </span>
                                )}
                            </h2>
                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${article.status === 'published' ? 'bg-green-100 text-green-800' :
                                    article.status === 'pending_review' ? 'bg-amber-100 text-amber-800' :
                                        'bg-slate-100 text-slate-800'
                                }`}>
                                {article.status.replace("_", " ").toUpperCase()}
                            </span>
                        </div>

                        <input type="hidden" name="articleId" value={article.id} />
                        <input type="hidden" name="content" value={JSON.stringify(contentJson)} />
                        <input type="hidden" name="coverImageUrl" value={coverImageUrl} />

                        {/* Title Input */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Judul Artikel</label>
                            <input
                                type="text"
                                name="title"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                required
                                className="w-full text-lg font-semibold px-4 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Masukkan judul artikel..."
                            />
                        </div>

                        {/* Cover Image Upload */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Cover Image</label>
                            <CoverImageUpload
                                articleId={article.id}
                                currentCoverUrl={coverImageUrl}
                                onUploadSuccess={(url) => setCoverImageUrl(url)}
                            />
                        </div>

                        {/* TipTap Editor */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Isi Konten</label>
                            <div className="border border-slate-300 rounded-md overflow-hidden min-h-87.5">
                                <TipTapEditor
                                    articleId={article.id}
                                    content={contentJson}
                                    onChange={(json) => setContentJson(json)}
                                />
                            </div>
                        </div>

                        {/* Ringkasan (Excerpt) */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Ringkasan (Excerpt)</label>
                            <textarea
                                name="excerpt"
                                value={excerpt}
                                onChange={e => setExcerpt(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Ringkasan singkat untuk ditampilkan di card artikel..."
                            />
                        </div>

                        {/* Action Buttons */}
                        <ArticleFormActions
                            status={article.status}
                            canPublish={canPublish}
                            canEditMetadata={canEditMetadata}
                            isDirty={isDirty}
                            isContentPending={isContentPending}
                            isPending={isPending}
                            activeBtn={activeBtn}
                            setActiveBtn={setActiveBtn}
                            onUnpublish={handleUnpublish}
                        />
                    </form>

                    {/* Admin Approval Card — Pending Review */}
                    {canPublish && article.status === 'pending_review' && (
                        <AdminReviewCard
                            articleId={article.id}
                            isDirty={isDirty}
                            contentAction={contentAction}
                            isContentPending={isContentPending}
                            contentValues={{
                                title,
                                contentJson,
                                coverImageUrl,
                                excerpt,
                            }}
                        />
                    )}
                </div>

                {/* Sidebar Metadata & SEO */}
                <ArticleMetadataSidebar
                    article={article}
                    categories={categories}
                    canEditMetadata={canEditMetadata}
                />
            </div>
        </div>
    );
}
