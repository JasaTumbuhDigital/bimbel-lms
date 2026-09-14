import Link from "next/link";
import Image from "next/image";
import { getPublicUrl } from "@/lib/supabase-storage";
import { Calendar, User as UserIcon, Tag as TagIcon } from "lucide-react";

interface ArticlePublicCardProps {
    article: {
        id: string;
        title: string;
        slug: string;
        excerpt?: string | null;
        coverImageUrl?: string | null;
        publishedAt?: Date | string | null;
        category?: { id: string; name: string; slug: string } | null;
        author: { name: string; avatarUrl?: string | null };
        tags?: Array<{ tag: { id: string; name: string; slug: string } }>;
    };
}

export default function ArticlePublicCard({ article }: ArticlePublicCardProps) {
    const fullCoverUrl = getPublicUrl(article.coverImageUrl || null);
    const dateFormatted = article.publishedAt
        ? new Date(article.publishedAt).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
        })
        : null;

    return (
        <article className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col group">
            {/* Cover Image */}
            <Link href={`/blog/${article.slug}`} className="relative aspect-video w-full overflow-hidden bg-slate-100 block">
                {fullCoverUrl ? (
                    <Image
                        src={fullCoverUrl}
                        alt={article.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        unoptimized
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-slate-100 to-slate-200 text-slate-400">
                        <span className="text-xs font-medium">Tanpa Cover</span>
                    </div>
                )}
                {article.category && (
                    <span className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full shadow-xs border border-blue-100">
                        {article.category.name}
                    </span>
                )}
            </Link>

            {/* Content */}
            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                    <Link href={`/blog/${article.slug}`} className="block">
                        <h2 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                            {article.title}
                        </h2>
                    </Link>
                    {article.excerpt && (
                        <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                            {article.excerpt}
                        </p>
                    )}
                </div>

                {/* Footer Info */}
                <div className="pt-4 border-t border-slate-100 space-y-2.5 text-xs text-slate-500">
                    {/* Tags */}
                    {article.tags && article.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 items-center">
                            <TagIcon className="w-3 h-3 text-slate-400 shrink-0" />
                            {article.tags.slice(0, 3).map(({ tag }) => (
                                <Link
                                    key={tag.id}
                                    href={`/blog?tag=${tag.slug}`}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[11px] transition-colors"
                                >
                                    #{tag.name}
                                </Link>
                            ))}
                            {article.tags.length > 3 && (
                                <span className="text-[11px] text-slate-400">+{article.tags.length - 3}</span>
                            )}
                        </div>
                    )}

                    {/* Author & Date */}
                    <div className="flex items-center justify-between text-slate-500 pt-1">
                        <div className="flex items-center gap-1.5">
                            {article.author.avatarUrl ? (
                                <Image
                                    src={getPublicUrl(article.author.avatarUrl)!}
                                    alt={article.author.name}
                                    width={20}
                                    height={20}
                                    className="rounded-full object-cover"
                                    unoptimized
                                />
                            ) : (
                                <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center">
                                    <UserIcon className="w-3 h-3 text-slate-600" />
                                </div>
                            )}
                            <span className="font-medium text-slate-700 truncate max-w-30">
                                {article.author.name}
                            </span>
                        </div>
                        {dateFormatted && (
                            <div className="flex items-center gap-1 text-slate-400">
                                <Calendar className="w-3 h-3" />
                                <span>{dateFormatted}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </article>
    );
}
