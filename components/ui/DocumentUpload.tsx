"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { institutionConfig } from "@/config/institution";

const STORAGE_BUCKET = institutionConfig.shortName.toLowerCase();

export default function DocumentUpload({ 
    courseId,
    moduleId,
    lessonId,
    onUploadSuccess 
}: { 
    courseId: string;
    moduleId: string;
    lessonId?: string;
    onUploadSuccess: (path: string) => void;
}) {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState("");

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validasi tipe file (PDF, PPT, PPTX)
        const allowedTypes = [
            "application/pdf",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        ];
        
        if (!allowedTypes.includes(file.type)) {
            setUploadError("Hanya file PDF atau PPT/PPTX yang didukung.");
            return;
        }

        // Validasi ukuran file (Max 20MB)
        if (file.size > 20 * 1024 * 1024) {
            setUploadError("Ukuran file maksimal adalah 20MB.");
            return;
        }

        setIsUploading(true);
        setUploadError("");

        try {
            const supabase = createClient();
            const fileExt = file.name.split('.').pop();
            const idToUse = lessonId || moduleId;
            const fileName = `courses/${courseId}/${idToUse}/${crypto.randomUUID()}.${fileExt}`;
            
            const { data, error } = await supabase.storage
                .from(STORAGE_BUCKET)
                .upload(fileName, file);

            if (error) {
                setUploadError(error.message);
            } else if (data) {
                // Berhasil upload, kembalikan path ke parent
                onUploadSuccess(data.path);
            }
        } catch (err: any) {
            setUploadError(err.message || "Gagal mengunggah file");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="mt-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
                Upload File Dokumen
            </label>
            <input 
                type="file" 
                accept=".pdf,.ppt,.pptx"
                onChange={handleFileChange}
                disabled={isUploading}
                className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100 disabled:opacity-50"
            />
            {isUploading && <p className="text-sm text-blue-600 mt-1">Mengunggah file...</p>}
            {uploadError && <p className="text-sm text-red-600 mt-1">{uploadError}</p>}
        </div>
    );
}
