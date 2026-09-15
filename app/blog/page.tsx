import Link from "next/link";
import { getArticleListForPublic, getBlogCategories } from "@/lib/data/blog";
import ArticlePublicCard from "@/components/blog/ArticlePublicCard";
import BlogFilterBar from "@/components/blog/BlogFilterBar";
import { BookOpen } from "lucide-react";

import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Blog & Wawasan Belajar",
    description: "Kumpulan artikel edukatif, materi pendalaman, dan tips belajar untuk siswa.",
    alternates: {
        canonical: "/blog",
    },
    openGraph: {
        title: "Blog & Wawasan Belajar",
        description: "Kumpulan artikel edukatif, materi pendalaman, dan tips belajar untuk siswa.",
        type: "website",
    },
};

interface BlogPageProps {
    searchParams: Promise<{
        category?: string;
        tag?: string;
        search?: string;
    }>;
}

export default async function BlogPublicPage({ searchParams }: BlogPageProps) {
    const { category, tag, search } = await searchParams;

    const [articles, categories] = await Promise.all([
        getArticleListForPublic({
            categorySlug: category,
            tagSlug: tag,
            search,
        }),
        getBlogCategories(),
    ]);

    return (
        <main className="min-h-screen bg-slate-50 text-slate-900 pb-16">
            {/* Header Hero */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                                <BookOpen className="w-3.5 h-3.5" />
                                Ruang Baca & Blog
                            </div>
                            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                                Wawasan & Artikel Edukasi
                            </h1>
                            <p className="text-sm sm:text-base text-slate-600 max-w-2xl">
                                Pelajari berbagai tips belajar efektif, pembahasan topik pelajaran, dan informasi seputar persiapan ujian.
                            </p>
                        </div>
                        <Link
                            href="/"
                            className="text-xs font-medium text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-lg transition-colors"
                        >
                            &larr; Beranda Utama
                        </Link>
                    </div>
                </div>
            </div>

            {/* Filter & Article Listing */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* Filter Bar */}
                <BlogFilterBar
                    categories={categories}
                    activeCategory={category}
                    activeTag={tag}
                    activeSearch={search}
                />

                {/* Grid Artikel */}
                {articles.length === 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
                        <p className="text-base font-semibold text-slate-700">
                            Tidak ada artikel yang ditemukan
                        </p>
                        <p className="text-xs text-slate-500 max-w-md mx-auto">
                            {search || category || tag
                                ? "Coba sesuaikan kata kunci pencarian atau bersihkan filter yang aktif."
                                : "Saat ini belum ada artikel yang dipublikasikan. Kunjungi lagi nanti!"}
                        </p>
                        {(search || category || tag) && (
                            <Link
                                href="/blog"
                                className="inline-block text-xs text-blue-600 font-medium hover:underline pt-2"
                            >
                                Tampilkan semua artikel
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {articles.map((article) => (
                            <ArticlePublicCard key={article.id} article={article} />
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
