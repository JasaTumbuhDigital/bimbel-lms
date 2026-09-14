"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createEmptyDraftAction } from "@/lib/actions/blog";
import { Loader2 } from "lucide-react";

export default function CreateDraftButton({ basePath }: { basePath: string }) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleCreate = () => {
        startTransition(async () => {
            const res = await createEmptyDraftAction();
            if (res.success && res.data?.articleId) {
                router.push(`${basePath}/${res.data.articleId}/edit`);
            } else {
                alert(res.error || "Gagal membuat draft");
            }
        });
    };

    return (
        <button
            onClick={handleCreate}
            disabled={isPending}
            className="bg-blue-600 text-white text-sm px-4 py-2 rounded hover:bg-blue-700 transition-colors flex items-center justify-center min-w-35"
        >
            {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
                "+ Tulis Artikel Baru"
            )}
        </button>
    );
}
