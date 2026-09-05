"use client";

import { deleteReviewAction } from "@/lib/actions/review";

export function DeleteReviewButton({ reviewId }: { reviewId: string }) {
    return (
        <form
            action={async () => {
                await deleteReviewAction(reviewId);
            }}
        >
            <button
                type="submit"
                className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                onClick={(e) => {
                    if (!confirm("Hapus ulasan ini?")) e.preventDefault();
                }}
            >
                Hapus
            </button>
        </form>
    );
}
