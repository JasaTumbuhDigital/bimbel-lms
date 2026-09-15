import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { institutionConfig } from "@/config/institution";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = institutionConfig.url;

    // Ambil semua artikel blog yang berstatus published
    let blogArticles: { slug: string; updatedAt: Date }[] = [];
    try {
        blogArticles = await prisma.blogArticle.findMany({
            where: {
                status: "published",
            },
            select: {
                slug: true,
                updatedAt: true,
            },
        });
    } catch (error) {
        console.error("Gagal mengambil data artikel untuk sitemap:", error);
    }

    const articleUrls: MetadataRoute.Sitemap = blogArticles.map((article) => ({
        url: `${baseUrl}/blog/${article.slug}`,
        lastModified: article.updatedAt,
        changeFrequency: "weekly",
        priority: 0.7,
    }));

    return [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 1.0,
        },
        {
            url: `${baseUrl}/blog`,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 0.8,
        },
        ...articleUrls,
    ];
}
