import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getArticleBySlugForPublic } from "@/lib/data/blog";
import { getAuthenticatedUser } from "@/lib/data/auth";
import { getPublicUrl } from "@/lib/supabase-storage";
import { renderArticleContentToHtml } from "@/lib/blog/render-html";
import { Calendar, User as UserIcon, Users, Tag as TagIcon, ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import { institutionConfig } from "@/config/institution";
import ShareButton from "@/components/blog/ShareButton";

interface PageProps {
    params: Promise<{ slug: string }>;
}

/**
 * Generate SEO Metadata dinamis per artikel
 * TSD §5.3 & PRD FR-35
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const article = await getArticleBySlugForPublic(slug);

    if (!article) {
        return {
            title: "Artikel Tidak Ditemukan",
        };
    }

    const title = article.seoTitle || article.title;
    const description = article.seoDescription || article.excerpt || institutionConfig.description;
    const ogImage = article.seoImageUrl
        ? (article.seoImageUrl.startsWith("http") ? article.seoImageUrl : getPublicUrl(article.seoImageUrl))
        : (article.coverImageUrl ? getPublicUrl(article.coverImageUrl) : undefined);

    return {
        title,
        description,
        alternates: {
            canonical: `/blog/${article.slug}`,
        },
        openGraph: {
            title,
            description,
            type: "article",
            publishedTime: article.publishedAt ? new Date(article.publishedAt).toISOString() : undefined,
            modifiedTime: new Date(article.updatedAt).toISOString(),
            authors: [article.author.name, ...(article.coAuthors?.map((ca) => ca.user.name) || [])],
            tags: article.tags?.map((t) => t.tag.name),
            images: ogImage ? [{ url: ogImage, width: 1200, height: 630, alt: title }] : undefined,
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: ogImage ? [ogImage] : undefined,
        },
    };
}

export default async function BlogDetailPage({ params }: PageProps) {
    const { slug } = await params;
    const article = await getArticleBySlugForPublic(slug);

    if (!article) {
        notFound();
    }

    // Edge Case §6 poin 7: Artikel draft/pending_review hanya boleh dibuka preview oleh admin/author/co-author
    const isPublished = article.status === "published";
    let isPreview = false;

    if (!isPublished) {
        const currentUser = await getAuthenticatedUser();
        const isAuthorizedPreview =
            currentUser &&
            (currentUser.role === "admin" ||
                article.authorId === currentUser.id ||
                article.coAuthors.some((ca) => ca.user.id === currentUser.id));

        if (!isAuthorizedPreview) {
            notFound();
        }

        isPreview = true;
    }

    const htmlContent = renderArticleContentToHtml(article.content);
    const fullCoverUrl = getPublicUrl(article.coverImageUrl || null);
    const resolvedOgImage = article.seoImageUrl
        ? (article.seoImageUrl.startsWith("http") ? article.seoImageUrl : getPublicUrl(article.seoImageUrl))
        : fullCoverUrl;

    const dateFormatted = article.publishedAt
        ? new Date(article.publishedAt).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
        })
        : new Date(article.createdAt).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: article.title,
        description: article.excerpt || institutionConfig.description,
        image: resolvedOgImage ? [resolvedOgImage] : undefined,
        datePublished: article.publishedAt ? new Date(article.publishedAt).toISOString() : undefined,
        dateModified: new Date(article.updatedAt).toISOString(),
        author: {
            "@type": "Person",
            name: article.author.name,
        },
        publisher: {
            "@type": "Organization",
            name: institutionConfig.name,
            logo: {
                "@type": "ImageObject",
                url: `${institutionConfig.url}${institutionConfig.logo.src}`,
            },
        },
        mainEntityOfPage: {
            "@type": "WebPage",
            "@id": `${institutionConfig.url}/blog/${article.slug}`,
        },
    };

    return (
        <main className="min-h-screen bg-white text-slate-900 pb-20">
            {/* JSON-LD Structured Data untuk Google Rich Snippets */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            {/* Banner Preview jika artikel belum dipublikasikan */}
            {isPreview && (
                <div className="bg-amber-500 text-white px-4 py-2.5 text-center text-xs sm:text-sm font-semibold tracking-wide shadow-xs sticky top-0 z-50">
                    ⚠️ Mode Pratinjau — Artikel ini berstatus &ldquo;
                    {article.status.replace("_", " ").toUpperCase()}
                    &rdquo; dan belum dipublikasikan secara umum.
                </div>
            )}

            {/* Navigasi Balik */}
            <div className="border-b border-slate-100 bg-slate-50/50">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
                    <Link
                        href="/blog"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Kembali ke Semua Artikel
                    </Link>
                </div>
            </div>

            <article className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
                {/* Header Artikel */}
                <header className="space-y-4">
                    {article.category && (
                        <Link
                            href={`/blog?category=${article.category.slug}`}
                            className="inline-block bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full transition-colors"
                        >
                            {article.category.name}
                        </Link>
                    )}

                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                        {article.title}
                    </h1>

                    {article.excerpt && (
                        <p className="text-base sm:text-lg text-slate-600 leading-relaxed italic">
                            {article.excerpt}
                        </p>
                    )}

                    {/* Metadata Penulis & Tanggal */}
                    <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-100 text-xs sm:text-sm text-slate-600">
                        {/* Author Utama */}
                        <div className="flex items-center gap-2">
                            {article.author.avatarUrl ? (
                                <Image
                                    src={getPublicUrl(article.author.avatarUrl)!}
                                    alt={article.author.name}
                                    width={32}
                                    height={32}
                                    className="rounded-full object-cover"
                                    unoptimized
                                />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                                    <UserIcon className="w-4 h-4 text-slate-600" />
                                </div>
                            )}
                            <div>
                                <span className="font-semibold text-slate-900">{article.author.name}</span>
                                <span className="text-slate-400 block text-[11px]">Penulis Utama</span>
                            </div>
                        </div>

                        {/* Co-Authors jika ada */}
                        {article.coAuthors && article.coAuthors.length > 0 && (
                            <div className="flex items-center gap-1.5 text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full text-xs">
                                <Users className="w-3.5 h-3.5 text-slate-600" />
                                <span>
                                    Bersama:{" "}
                                    {article.coAuthors.map((ca) => ca.user.name).join(", ")}
                                </span>
                            </div>
                        )}

                        {/* Tanggal & Tombol Bagikan */}
                        <div className="flex items-center gap-3 ml-auto">
                            <div className="flex items-center gap-1 text-slate-400 text-xs">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{dateFormatted}</span>
                            </div>
                            <ShareButton title={article.title} slug={article.slug} variant="default" />
                        </div>
                    </div>
                </header>

                {/* Cover Image */}
                {fullCoverUrl && (
                    <div className="relative aspect-video w-full rounded-2xl overflow-hidden shadow-sm border border-slate-200">
                        <Image
                            src={fullCoverUrl}
                            alt={article.title}
                            fill
                            className="object-cover"
                            priority
                            unoptimized
                        />
                    </div>
                )}

                {/* Konten Artikel Utama (TipTap rendered to HTML) */}
                <div
                    className="prose prose-slate max-w-none text-slate-800
                        prose-headings:font-bold prose-headings:text-slate-900
                        prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
                        prose-p:my-4 prose-p:leading-relaxed
                        prose-a:text-blue-600 prose-a:underline hover:prose-a:text-blue-800
                        prose-img:rounded-xl prose-img:border prose-img:border-slate-200
                        prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-slate-50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg
                        prose-pre:bg-zinc-900 prose-pre:text-zinc-100 prose-pre:rounded-lg"
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                />

                {/* Bagikan Artikel Bottom Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                    <div>
                        <p className="text-xs font-bold text-slate-900">Bagikan Wawasan Ini</p>
                        <p className="text-[11px] text-slate-500">Bantu temanmu mendapatkan ilmu dan tips belajar yang bermanfaat.</p>
                    </div>
                    <ShareButton title={article.title} slug={article.slug} variant="default" />
                </div>

                {/* Footer Tags */}
                {article.tags && article.tags.length > 0 && (
                    <div className="pt-8 border-t border-slate-200 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            <TagIcon className="w-3.5 h-3.5" />
                            <span>Topik Terkait</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {article.tags.map(({ tag }) => (
                                <Link
                                    key={tag.id}
                                    href={`/blog?tag=${tag.slug}`}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded-md font-medium transition-colors"
                                >
                                    #{tag.name}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Penulis Bio Card */}
                {article.author.tutorProfile?.bio && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex items-start gap-4">
                        {article.author.avatarUrl ? (
                            <Image
                                src={getPublicUrl(article.author.avatarUrl)!}
                                alt={article.author.name}
                                width={48}
                                height={48}
                                className="rounded-full object-cover shrink-0"
                                unoptimized
                            />
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                                <UserIcon className="w-6 h-6 text-slate-600" />
                            </div>
                        )}
                        <div className="space-y-1">
                            <h3 className="text-sm font-bold text-slate-900">
                                Tentang {article.author.name}
                            </h3>
                            <p className="text-xs text-slate-600 leading-relaxed">
                                {article.author.tutorProfile.bio}
                            </p>
                        </div>
                    </div>
                )}
            </article>
        </main>
    );
}
