import { z } from "zod";

export const reviewSchema = z.object({
    courseId: z.string().uuid({ message: "ID kursus tidak valid" }),
    rating: z.coerce.number().min(1, "Minimal rating 1").max(5, "Maksimal rating 5"),
    comment: z.string().optional(),
});
