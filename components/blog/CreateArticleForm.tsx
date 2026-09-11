"use client";

import { useActionState, useEffect } from "react";
import { createArticleAction } from "@/lib/actions/blog";
import { ActionResult } from "@/types/action";
import { useRouter } from "next/navigation";

export default function CreateArticleForm({ basePath }: { basePath: string }) {
    const router = useRouter();
    const [state, formAction, isPending] = useActionState<ActionResult<{ articleId: string; slug: string }>, FormData>(
        createArticleAction,
        { success: false }
    );

    useEffect(() => {
        if (state.success && state.data?.articleId) {
            router.push(`${basePath}/${state.data.articleId}/edit`);
        }
    }, [state, router, basePath]);

    return (
        <form action={formAction} className="space-y-4">
            <div>
                <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
                    Judul Artikel
                </label>
                <input
                    type="text"
                    id="title"
                    name="title"
                    required
                    disabled={isPending}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                    placeholder="Masukkan judul artikel..."
                />
                {state?.fieldErrors?.title && (
                    <p className="text-sm text-red-500 mt-1">{state.fieldErrors.title[0]}</p>
                )}
                <p className="text-xs text-slate-500 mt-1">
                    Judul ini masih bisa kamu ubah nanti saat proses editing.
                </p>
            </div>

            {state?.error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">
                    {state.error}
                </div>
            )}

            <div className="pt-2">
                <button
                    type="submit"
                    disabled={isPending}
                    className="w-full bg-blue-600 text-white font-medium px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                >
                    {isPending ? "Membuat Draft..." : "Buat & Mulai Menulis"}
                </button>
            </div>
        </form>
    );
}
