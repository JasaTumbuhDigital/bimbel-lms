import { prisma } from "@/lib/prisma";

/**
 * 1a. Query Daftar Artikel Publik (Hanya yang Published)
 * TSD §4.10
 */
export async function getArticleListForPublic(options?: { categorySlug?: string, tagSlug?: string, search?: string }) {
    const where: any = { status: "published" };

    if (options?.categorySlug) {
        where.category = { slug: options.categorySlug };
    }

    if (options?.tagSlug) {
        where.tags = { some: { tag: { slug: options.tagSlug } } };
    }

    if (options?.search) {
        where.title = { contains: options.search, mode: "insensitive" };
    }

    return prisma.blogArticle.findMany({
        where,
        include: {
            author: { select: { name: true, avatarUrl: true } },
            category: true,
            tags: { include: { tag: true } }
        },
        // Urutkan berdasarkan tanggal publish terbaru
        orderBy: { publishedAt: "desc" }
    });
}

/**
 * 1b. Query Artikel Detail (Publik)
 */
export async function getArticleBySlugForPublic(slug: string) {
    return prisma.blogArticle.findFirst({
        where: { slug, status: "published" },
        include: {
            author: { select: { id: true, name: true, avatarUrl: true, tutorProfile: { select: { bio: true } } } },
            coAuthors: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
            category: true,
            tags: { include: { tag: true } }
        }
    });
}

/**
 * 1c. Query Daftar Artikel untuk Manajemen (Admin & Tutor)
 * TSD §4.10
 */
export async function getArticleListForManagement(userId: string, role: string) {
    let where: any = {};

    if (role === "admin") {
        // Admin melihat:
        // 1. Semua artikel yang sudah published
        // 2. Draft milik sendiri (sebagai author utama ATAU co-author)
        // Draft orang lain TIDAK ditampilkan di sini.
        where.OR = [
            { status: "published" },
            { status: "draft", authorId: userId },
            { status: "draft", coAuthors: { some: { userId } } },
        ];
    } else {
        // Tutor hanya melihat artikel miliknya sendiri (author utama atau co-author)
        where.OR = [
            { authorId: userId },
            { coAuthors: { some: { userId } } },
        ];
    }

    return prisma.blogArticle.findMany({
        where,
        include: {
            author: { select: { name: true } },
            category: true
        },
        orderBy: { updatedAt: "desc" }
    });
}

/**
 * 2. Query Antrean Review untuk Admin
 * TSD §4.11
 */
export async function getReviewQueueForAdmin() {
    return prisma.blogArticle.findMany({
        where: { status: "pending_review" },
        include: {
            author: { select: { name: true } },
            category: true
        },
        // Yang paling lama antre akan muncul paling atas
        orderBy: { submittedAt: "asc" },
    });
}

/**
 * 3. Query Daftar Kategori & Detail untuk Editor
 */
export async function getBlogCategories() {
    return prisma.blogCategory.findMany({
        include: {
            _count: {
                select: { articles: true }
            }
        },
        orderBy: { name: "asc" }
    });
}

export async function getArticleByIdForManagement(articleId: string) {
    return prisma.blogArticle.findUnique({
        where: { id: articleId },
        include: {
            author: { select: { id: true, name: true, email: true } },
            category: true,
            tags: { include: { tag: true } },
            coAuthors: { include: { user: { select: { id: true, name: true, email: true, role: true } } } }
        }
    });
}

/**
 * 4. Query Pencarian Tag (Untuk Auto-rekomendasi/Autocomplete di UI)
 */
export async function searchBlogTags(query?: string) {
    if (query) {
        return prisma.blogTag.findMany({
            where: {
                name: { contains: query, mode: "insensitive" }
            },
            orderBy: { name: "asc" },
            take: 20, // Batasi 20 hasil pencarian supaya query tetap ringan
        });
    }

    // Jika tidak ada query (baru pertama kali klik input tag), 
    // munculkan 20 tag pertama secara default
    return prisma.blogTag.findMany({
        orderBy: { name: "asc" },
        take: 20,
    });
}
