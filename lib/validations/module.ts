import { z } from "zod";

export const createModuleSchema = z.object({
    courseId: z.string().uuid("ID Kursus tidak valid"),
    title: z.string().min(1, "Judul modul harus diisi").max(150, "Judul modul maksimal 150 karakter"),
});

export const updateModuleSchema = createModuleSchema.partial().extend({
    id: z.string().uuid("ID Modul tidak valid"),
});

export const reorderSchema = z.object({
    parentId: z.string().uuid("ID Induk tidak valid"),
    orderedIds: z.array(z.string().uuid("ID urutan tidak valid")),
});

export const toggleProgressSchema = z.object({
    lessonId: z.string().uuid("ID Materi tidak valid"),
    isCompleted: z.boolean(),
});
