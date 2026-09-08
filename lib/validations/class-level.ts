import { z } from "zod";

export const classLevelSchema = z.object({
    name: z
        .string()
        .min(1, "Nama tingkat kelas wajib diisi")
        .max(50, "Nama kelas maksimal 50 karakter"),
    description: z.string().optional(),
    isDefault: z.boolean().default(false),
});

export const updateClassLevelSchema = classLevelSchema.partial().extend({
    id: z.string().uuid("ID Kelas tidak valid"),
});
