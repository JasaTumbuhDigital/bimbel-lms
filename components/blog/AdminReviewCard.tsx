"use client";

import { useActionState, useState, useTransition, useEffect, useRef } from "react";
import { approveArticleAction, rejectArticleAction } from "@/lib/actions/blog";
import { ActionResult } from "@/types/action";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

interface AdminReviewCardProps {
    articleId: string;
    isDirty: boolean;
    contentAction: (formData: FormData) => void;
    isContentPending: boolean;
    contentValues: {
        title: string;
        contentJson: any;
        coverImageUrl: string;
        excerpt: string;
    };
}

export default function AdminReviewCard({
    articleId,
    isDirty,
    contentAction,
    isContentPending,
    contentValues,
}: AdminReviewCardProps) {
    const router = useRouter();
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [activeBtn, setActiveBtn] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const [rejectState, rejectAction, isRejectPending] = useActionState<ActionResult, FormData>(
        rejectArticleAction,
        { success: false }
    );
    const prevRejectState = useRef<ActionResult | null>(null);

    useEffect(() => {
        if (rejectState === prevRejectState.current) return;
        prevRejectState.current = rejectState;

        if (!rejectState) return;
        if (rejectState.success) {
            toast.success(rejectState.message || "Artikel ditolak");
            setShowRejectForm(false);
            router.refresh();
        } else if (rejectState.error) {
            toast.error(rejectState.error);
        }
        setActiveBtn(null);
    }, [rejectState, router]);

    const handleApprove = () => {
        setActiveBtn("approve");
        startTransition(async () => {
            const res = await approveArticleAction(articleId);
            if (res.success) {
                toast.success(res.message || "Artikel disetujui & dipublikasikan");
                router.refresh();
            } else {
                toast.error(res.error || "Gagal menyetujui artikel");
            }
            setActiveBtn(null);
        });
    };

    return (
        <div className="bg-amber-50 p-6 rounded-lg shadow-sm border border-amber-200 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-amber-800">Tindakan Admin</h3>
                {isDirty && (
                    <form action={contentAction}>
                        <input type="hidden" name="articleId" value={articleId} />
                        <input type="hidden" name="content" value={JSON.stringify(contentValues.contentJson)} />
                        <input type="hidden" name="coverImageUrl" value={contentValues.coverImageUrl} />
                        <input type="hidden" name="title" value={contentValues.title} />
                        <input type="hidden" name="excerpt" value={contentValues.excerpt} />
                        <button
                            type="submit"
                            onClick={() => setActiveBtn("admin-save")}
                            disabled={isContentPending}
                            className="text-sm text-amber-800 bg-white border border-amber-300 px-4 py-1.5 rounded-md hover:bg-amber-100 flex items-center gap-1.5"
                        >
                            {isContentPending && activeBtn === "admin-save" ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Save className="w-3.5 h-3.5" />
                            )}
                            Simpan Perubahan
                        </button>
                    </form>
                )}
            </div>
            <p className="text-sm text-amber-700">Artikel ini sedang menunggu review dari Anda.</p>

            {showRejectForm ? (
                <form action={rejectAction} className="bg-white p-4 rounded border border-amber-200 space-y-3">
                    <input type="hidden" name="articleId" value={articleId} />
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Alasan Penolakan (Catatan Revisi)
                        </label>
                        <textarea
                            name="reviewNote"
                            required
                            rows={3}
                            placeholder="Jelaskan apa yang perlu diperbaiki..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-red-500 focus:border-red-500 text-sm"
                        />
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button
                            type="button"
                            onClick={() => setShowRejectForm(false)}
                            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-md"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            onClick={() => setActiveBtn("confirm-reject")}
                            disabled={isRejectPending}
                            className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-md flex gap-2 items-center"
                        >
                            {isRejectPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            Konfirmasi Tolak
                        </button>
                    </div>
                </form>
            ) : (
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={handleApprove}
                        disabled={isPending}
                        className="bg-green-600 text-white font-medium px-6 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {isPending && activeBtn === "approve" && <Loader2 className="w-4 h-4 animate-spin" />}
                        Approve & Publish
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowRejectForm(true)}
                        disabled={isPending}
                        className="bg-white text-red-600 border border-red-200 font-medium px-6 py-2 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                        Tolak (Reject)
                    </button>
                </div>
            )}
        </div>
    );
}
