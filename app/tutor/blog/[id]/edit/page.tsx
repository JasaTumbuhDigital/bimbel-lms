import { getAuthenticatedUser } from "@/lib/data/auth";
import { getArticleByIdForManagement, getBlogCategories } from "@/lib/data/blog";
import { getTutorsForBlogSelect } from "@/lib/data/user";
import { notFound, redirect } from "next/navigation";
import ArticleEditorForm from "@/components/blog/ArticleEditorForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import DeleteArticleButton from "@/components/blog/DeleteArticleButton";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function TutorEditArticlePage({ params }: PageProps) {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== "tutor") {
        redirect("/login");
    }

    const { id } = await params;

    const [article, categories, tutors] = await Promise.all([
        getArticleByIdForManagement(id),
        getBlogCategories(),
        getTutorsForBlogSelect()
    ]);

    if (!article) {
        notFound();
    }

    const isMainAuthor = article.authorId === user.id;
    const isCoAuthor = article.coAuthors.some((ca: any) => ca.user.id === user.id);

    // Tutor hanya boleh akses jika dia Author Utama atau Co-Author
    if (!isMainAuthor && !isCoAuthor) {
        redirect("/tutor/blog");
    }

    // Role yang di-pass ke form
    // Walaupun aslinya user.role = "tutor", tapi kalau dia cuma Co-Author, kita pass "co_author"
    // agar form tahu dia nggak boleh ngedit metadata.
    const effectiveRole = isMainAuthor ? "tutor" : "co_author";

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Link
                        href="/tutor/blog"
                        className="p-2 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5 text-slate-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">
                            {effectiveRole === "co_author" ? "Edit Konten Artikel" : "Edit Artikel"}
                        </h1>
                        <p className="text-sm text-slate-500">
                            {effectiveRole === "co_author"
                                ? "Anda diundang sebagai Co-Author. Anda hanya dapat mengubah isi konten."
                                : "Membangun konten dan mengatur metadata SEO."}
                        </p>
                    </div>
                </div>

                <ArticleEditorForm
                    article={article}
                    categories={categories}
                    availableTutors={tutors}
                    role={effectiveRole}
                    isMainAuthor={isMainAuthor}
                />

                {isMainAuthor && (
                    <div className="bg-white border border-red-200 rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
                        <div>
                            <h4 className="text-sm font-bold text-red-700">Hapus Artikel Ini</h4>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Artikel dan seluruh data terkait akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
                            </p>
                        </div>
                        <DeleteArticleButton
                            articleId={article.id}
                            articleTitle={article.title}
                            variant="button"
                            redirectOnSuccess="/tutor/blog"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
