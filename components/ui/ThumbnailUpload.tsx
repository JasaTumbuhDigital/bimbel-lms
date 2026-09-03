"use client";

import { useState } from "react";
import { getPublicUrl } from "@/lib/supabase-storage";
import { createClient } from "@/utils/supabase/client";
import Image from "next/image";
import { institutionConfig } from "@/config/institution";

const STORAGE_BUCKET = institutionConfig.shortName.toLowerCase();

export default function ThumbnailUpload({
    courseId,
    currentThumbnailUrl,
    onUploadSuccess
}: {
    courseId: string;
    currentThumbnailUrl?: string;
    onUploadSuccess: (path: string) => void;
}) {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState("");
    const supabase = createClient();

    // Construct full URL for preview
    const fullImageUrl = getPublicUrl(currentThumbnailUrl || null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validasi tipe file (JPG, PNG)
        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!allowedTypes.includes(file.type)) {
            setUploadError("Hanya file JPG, PNG, atau WEBP yang didukung.");
            return;
        }

        // Validasi ukuran file (Max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            setUploadError("Ukuran file maksimal adalah 2MB.");
            return;
        }

        setIsUploading(true);
        setUploadError("");

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `courses/${courseId}/thumbnail/${crypto.randomUUID()}.${fileExt}`;

            // Hapus thumbnail lama jika ada
            if (currentThumbnailUrl) {
                await supabase.storage.from(STORAGE_BUCKET).remove([currentThumbnailUrl]);
            }

            const { data, error } = await supabase.storage
                .from(STORAGE_BUCKET)
                .upload(fileName, file);

            if (error) {
                setUploadError(error.message);
            } else if (data) {
                // Return just the relative path
                onUploadSuccess(data.path);
            }
        } catch (err: any) {
            setUploadError(err.message || "Gagal mengunggah thumbnail");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="mt-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">
                Thumbnail Kursus
            </label>

            {fullImageUrl && (
                <div className="mb-4 relative w-full max-w-sm aspect-video rounded-md overflow-hidden border border-slate-200">
                    <Image
                        src={fullImageUrl}
                        alt="Course Thumbnail"
                        fill
                        className="object-cover"
                        unoptimized
                        priority
                    />
                </div>
            )}

            <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                disabled={isUploading}
                className="block w-full text-sm text-slate-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100 disabled:opacity-50"
            />
            {isUploading && <p className="text-sm text-blue-600 mt-1">Mengunggah gambar...</p>}
            {uploadError && <p className="text-sm text-red-600 mt-1">{uploadError}</p>}
        </div>
    );
}
