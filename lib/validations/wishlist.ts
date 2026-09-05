import { z } from "zod";

export const wishlistSchema = z.object({
    courseId: z.string().uuid({ message: "ID kursus tidak valid" }),
});
