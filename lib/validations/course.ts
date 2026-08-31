import { z } from "zod";

export const courseSchema = z.object({
    title: z
        .string()
        .min(3, "Judul kursus minimal 3 karakter")
        .max(150, "Judul kursus maksimal 150 karakter"),
    description: z.string().optional(),
    thumbnailUrl: z.string().optional(),
    visibleToAllLevels: z.boolean().default(false),
    classLevelIds: z.array(z.string()).default([]),
    tutorProfileIds: z.array(z.string()).default([]),
});

export type CourseInput = z.infer<typeof courseSchema>;
