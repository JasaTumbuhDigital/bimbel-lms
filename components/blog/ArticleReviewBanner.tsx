"use client";

import { AlertCircle } from "lucide-react";

interface ArticleReviewBannerProps {
    status: string;
    reviewNote: string | null;
}

export default function ArticleReviewBanner({ status, reviewNote }: ArticleReviewBannerProps) {
    if (!reviewNote || status !== "draft") return null;

    return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
                <h3 className="font-semibold text-red-800 text-sm">Catatan Revisi dari Admin:</h3>
                <p className="text-sm text-red-700 mt-1">{reviewNote}</p>
            </div>
        </div>
    );
}
