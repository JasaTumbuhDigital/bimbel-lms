import { z } from "zod";

export const createArticleSchema = z.object({
    title: z.string().min(3, "Judul minimal 3 karakter").max(200, "Judul maksimal 200 karakter"),
    categoryId: z.string().uuid("ID Kategori tidak valid").optional().nullable(),
    tagNames: z.array(z.string().min(1).max(50)).max(10, "Maksimal 10 tag").default([]),
});

export const updateArticleContentSchema = z.object({
    articleId: z.string().uuid("ID Artikel tidak valid"),
    title: z.string().min(3, "Judul minimal 3 karakter").max(200, "Judul maksimal 200 karakter").optional(),
    content: z.any().optional(), // Disimpan sebagai JSON dari TipTap
    excerpt: z.string().max(300, "Ringkasan maksimal 300 karakter").optional().nullable(),
    coverImageUrl: z.string().optional(),
    categoryId: z.string().uuid("ID Kategori tidak valid").optional().nullable(),
    tagNames: z.array(z.string().min(1).max(50)).max(10, "Maksimal 10 tag").optional(),
});

export const updateArticleMetadataSchema = z.object({
    articleId: z.string().uuid("ID Artikel tidak valid"),
    slug: z.string().min(3, "Slug minimal 3 karakter").max(200, "Slug maksimal 200 karakter").optional(),
    seoTitle: z.string().max(70, "SEO Title maksimal 70 karakter").optional().nullable(),
    seoDescription: z.string().max(160, "SEO Description maksimal 160 karakter").optional().nullable(),
    seoImageUrl: z.string().optional(),
});

export const createBlogCategorySchema = z.object({
    name: z.string().min(2, "Nama kategori minimal 2 karakter"),
});

export const updateBlogCategorySchema = z.object({
    id: z.string().uuid("ID Kategori tidak valid"),
    name: z.string().min(2, "Nama kategori minimal 2 karakter"),
});
