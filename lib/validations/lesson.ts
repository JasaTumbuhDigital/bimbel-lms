import { z } from "zod"

const YOUTUBE_URL_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11}/;

const baseLessonSchema = z.object({
    moduleId: z.string().uuid("ID Modul tidak valid"),
    title: z.string().min(1, "Judul materi harus diisi").max(150, "Judul materi maksimal 150 karakter"),
    contentType: z.enum(["video", "document"], { message: "Tipe materi harus dipilih" }),
    videoUrl: z.string().url("Format URL tidak valid").regex(YOUTUBE_URL_REGEX, "Hanya menerima URL YouTube yang valid (watch?v= atau youtu.be/)").optional().or(z.literal("")),
    documentUrl: z.string().optional().or(z.literal("")),
});

export const createLessonSchema = baseLessonSchema.refine(
    (data) => {
        if (data.contentType === "video") {
            return !!data.videoUrl && data.videoUrl.trim() !== "";
        }
        if (data.contentType === "document") {
            return !!data.documentUrl && data.documentUrl.trim() !== "";
        }
        return true;
    },
    {
        message: "URL Video wajib diisi jika tipe materi adalah Video, URL Dokumen wajib jika tipe materi adalah Dokumen",
        path: ["contentType"]
    }
);

export const updateLessonSchema = baseLessonSchema.partial().extend({
    id: z.string().uuid("ID Materi tidak valid"),
}).refine(
    (data) => {
        // Jika mengubah tipe konten, pastikan URL yang sesuai disediakan (jika field contentType disertakan dalam update)
        if (data.contentType === "video") {
            return !!data.videoUrl && data.videoUrl.trim() !== "";
        }
        if (data.contentType === "document") {
            return !!data.documentUrl && data.documentUrl.trim() !== "";
        }
        return true;
    },
    {
        message: "URL Video wajib diisi jika tipe materi adalah Video, URL Dokumen wajib jika tipe materi adalah Dokumen",
        path: ["contentType"]
    }
);

export const reorderSchema = z.object({
    parentId: z.string().uuid("ID Induk tidak valid"),
    orderedIds: z.array(z.string().uuid("ID urutan tidak valid")),
});