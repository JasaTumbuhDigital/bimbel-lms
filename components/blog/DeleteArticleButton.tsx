"use client";

import { useTransition } from "react";
import { deleteArticleAction } from "@/lib/actions/blog";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface DeleteArticleButtonProps {
    articleId: string;
    articleTitle: string;
    redirectOnSuccess?: string;
    variant?: "icon" | "button";
    className?: string;
}

export default function DeleteArticleButton({
    articleId,
    articleTitle,
    redirectOnSuccess,
    variant = "icon",
    className = "",
}: DeleteArticleButtonProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const handleDelete = () => {
        const confirmMsg = `Yakin ingin menghapus artikel "${articleTitle}"? Tindakan ini tidak dapat dibatalkan.`;
        if (!window.confirm(confirmMsg)) return;

        startTransition(async () => {
            const res = await deleteArticleAction(articleId);
            if (res.success) {
                toast.success(res.message || "Artikel berhasil dihapus");
                if (redirectOnSuccess) {
                    router.push(redirectOnSuccess);
                } else {
                    router.refresh();
                }
            } else {
                toast.error(res.error || "Gagal menghapus artikel");
            }
        });
    };

    if (variant === "button") {
        return (
            <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-colors disabled:opacity-50 ${className}`}
                title="Hapus Artikel"
            >
                {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                ) : (
                    <Trash2 className="w-4 h-4 text-red-600" />
                )}
                <span>Hapus Artikel</span>
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className={`p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 ${className}`}
            title="Hapus Artikel"
        >
            {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin text-red-600" />
            ) : (
                <Trash2 className="w-4 h-4" />
            )}
        </button>
    );
}
