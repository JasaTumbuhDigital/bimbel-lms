import { getAuthenticatedUser } from "@/lib/data/auth";
import { getArticleByIdForManagement, getBlogCategories } from "@/lib/data/blog";
import { notFound, redirect } from "next/navigation";
import ArticleEditorForm from "@/components/blog/ArticleEditorForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function AdminEditArticlePage({ params }: PageProps) {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== "admin") {
        redirect("/login");
    }

    const { id } = await params;

    const [article, categories] = await Promise.all([
        getArticleByIdForManagement(id),
        getBlogCategories()
    ]);

    if (!article) {
        notFound();
    }

    const isMainAuthor = article.authorId === user.id;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin/blog"
                        className="p-2 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5 text-slate-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Edit Artikel</h1>
                        <p className="text-sm text-slate-500">Membangun konten dan mengatur metadata SEO.</p>
                    </div>
                </div>

                <ArticleEditorForm
                    article={article}
                    categories={categories}
                    role="admin"
                    isMainAuthor={isMainAuthor}
                />
            </div>
        </div>
    );
}
