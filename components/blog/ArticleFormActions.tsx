"use client";

import { Loader2, Save } from "lucide-react";

interface ArticleFormActionsProps {
    status: string;
    canPublish: boolean;
    canEditMetadata: boolean;
    isDirty: boolean;
    isContentPending: boolean;
    isPending: boolean;
    activeBtn: string | null;
    setActiveBtn: (btn: string | null) => void;
    onUnpublish: () => void;
}

export default function ArticleFormActions({
    status,
    canPublish,
    canEditMetadata,
    isDirty,
    isContentPending,
    isPending,
    activeBtn,
    setActiveBtn,
    onUnpublish,
}: ArticleFormActionsProps) {
    const ContentSpinner = ({ btnKey }: { btnKey: string }) =>
        isContentPending && activeBtn === btnKey ? (
            <Loader2 className="w-4 h-4 animate-spin" />
        ) : null;

    return (
        <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t">
            {/* ── CO-AUTHOR: status DRAFT ── */}
            {!canEditMetadata && status === "draft" && (
                <button
                    type="submit"
                    onClick={() => setActiveBtn("save")}
                    disabled={!isDirty || isContentPending}
                    className="bg-blue-600 text-white font-medium px-6 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                    {isContentPending && activeBtn === "save" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Simpan Perubahan
                </button>
            )}

            {/* ── CO-AUTHOR: status PENDING_REVIEW / PUBLISHED (Read Only) ── */}
            {!canEditMetadata && status !== "draft" && (
                <div className="text-xs text-slate-500 italic bg-slate-100 px-3.5 py-2 rounded-md border border-slate-200">
                    {status === "published"
                        ? "Artikel sudah dipublikasikan. Hanya Author Utama dan Admin yang dapat melakukan revisi."
                        : "Artikel sedang dalam proses review. Co-Author hanya dapat mengedit saat berstatus draft."}
                </div>
            )}

            {/* ── ADMIN: status DRAFT ── */}
            {canPublish && status === "draft" && (
                <>
                    {isDirty && (
                        <button
                            type="submit"
                            onClick={() => setActiveBtn("save-draft")}
                            disabled={isContentPending || isPending}
                            className="bg-slate-200 text-slate-700 font-medium px-5 py-2 rounded-md hover:bg-slate-300 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isContentPending && activeBtn === "save-draft" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Simpan Draft
                        </button>
                    )}
                    <button
                        type="submit"
                        name="actionType"
                        value="publish"
                        onClick={() => setActiveBtn("publish")}
                        disabled={isContentPending || isPending}
                        className="bg-green-600 text-white font-medium px-6 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        <ContentSpinner btnKey="publish" />
                        Simpan & Publish
                    </button>
                </>
            )}

            {/* ── ADMIN: status PUBLISHED ── */}
            {canPublish && status === "published" && (
                <>
                    <button
                        type="button"
                        onClick={onUnpublish}
                        disabled={isContentPending || isPending}
                        className="bg-red-50 text-red-600 border border-red-200 font-medium px-5 py-2 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50 flex items-center gap-2 mr-auto"
                    >
                        {isPending && activeBtn === "unpublish" && <Loader2 className="w-4 h-4 animate-spin" />}
                        Unpublish
                    </button>
                    <button
                        type="submit"
                        name="actionType"
                        value="publish"
                        onClick={() => setActiveBtn("republish")}
                        disabled={isContentPending || isPending || !isDirty}
                        className="bg-green-600 text-white font-medium px-6 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        <ContentSpinner btnKey="republish" />
                        {!isDirty ? "Tidak ada perubahan" : "Simpan & Publish Ulang"}
                    </button>
                </>
            )}

            {/* ── TUTOR: status DRAFT (termasuk setelah ditolak) ── */}
            {!canPublish && canEditMetadata && status === "draft" && (
                <>
                    {isDirty && (
                        <button
                            type="submit"
                            onClick={() => setActiveBtn("save-draft")}
                            disabled={isContentPending || isPending}
                            className="bg-slate-200 text-slate-700 font-medium px-5 py-2 rounded-md hover:bg-slate-300 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isContentPending && activeBtn === "save-draft" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Simpan Draft
                        </button>
                    )}
                    <button
                        type="submit"
                        name="actionType"
                        value="review"
                        onClick={() => setActiveBtn("review")}
                        disabled={isContentPending || isPending}
                        className="bg-amber-500 text-white font-medium px-6 py-2 rounded-md hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        <ContentSpinner btnKey="review" />
                        Simpan & Ajukan Review
                    </button>
                </>
            )}

            {/* ── TUTOR: status PENDING_REVIEW ── */}
            {!canPublish && canEditMetadata && status === "pending_review" && (
                <>
                    {isDirty && (
                        <button
                            type="submit"
                            onClick={() => setActiveBtn("save-pending")}
                            disabled={isContentPending || isPending}
                            className="bg-blue-600 text-white font-medium px-5 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isContentPending && activeBtn === "save-pending" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Simpan Perubahan
                        </button>
                    )}
                    <button
                        type="submit"
                        name="actionType"
                        value="draft"
                        onClick={() => setActiveBtn("withdraw")}
                        disabled={isContentPending || isPending}
                        className="bg-slate-200 text-slate-700 font-medium px-5 py-2 rounded-md hover:bg-slate-300 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        <ContentSpinner btnKey="withdraw" />
                        Tarik Kembali ke Draft
                    </button>
                </>
            )}

            {/* ── TUTOR: status PUBLISHED ── */}
            {!canPublish && canEditMetadata && status === "published" && (
                <button
                    type="submit"
                    name="actionType"
                    value="review"
                    onClick={() => setActiveBtn("re-review")}
                    disabled={isContentPending || isPending || !isDirty}
                    className="bg-amber-500 text-white font-medium px-6 py-2 rounded-md hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                    <ContentSpinner btnKey="re-review" />
                    {!isDirty ? "Edit dulu untuk mengajukan revisi" : "Simpan Revisi & Ajukan Ulang"}
                </button>
            )}
        </div>
    );
}
