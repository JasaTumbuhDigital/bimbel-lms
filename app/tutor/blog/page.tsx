import Link from "next/link";
import { getArticleListForManagement } from "@/lib/data/blog";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/ui/skeletons";
import { getAuthenticatedUser } from "@/lib/data/auth";
import { redirect } from "next/navigation";

export const metadata = {
    title: "Manajemen Blog - Tutor",
};

export default async function TutorBlogPage() {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                <header className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div>
                        <Link
                            href="/tutor"
                            className="text-xs text-blue-600 hover:underline mb-1 inline-block"
                        >
                            &larr; Kembali ke Dashboard Tutor
                        </Link>
                        <h1 className="text-xl font-bold text-slate-900">Manajemen Artikel Blog</h1>
                        <p className="text-xs text-slate-600">Kelola artikel yang kamu tulis</p>
                    </div>
                    <div>
                        <Link
                            href="/tutor/blog/new"
                            className="bg-blue-600 text-white text-sm px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                        >
                            + Tulis Artikel Baru
                        </Link>
                    </div>
                </header>

                <Suspense fallback={<TableSkeleton />}>
                    <ArticleTable />
                </Suspense>
            </div>
        </div>
    );
}

async function ArticleTable() {
    const user = await getAuthenticatedUser();
    if (!user) redirect("/login");

    const articles = await getArticleListForManagement(user.id, user.role);

    return (
        <div className="overflow-x-auto bg-white border border-slate-200 rounded-lg shadow-sm">
            <table className="w-full text-left text-sm text-slate-800">
                <thead className="bg-slate-100 border-b border-slate-200 text-xs font-semibold uppercase text-slate-700">
                    <tr>
                        <th className="py-3 px-4">Judul</th>
                        <th className="py-3 px-4">Kategori</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Update Terakhir</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                    {articles.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="py-8 px-4 text-center text-slate-500">
                                Belum ada artikel yang ditulis.
                            </td>
                        </tr>
                    ) : (
                        articles.map((article) => (
                            <tr key={article.id} className="hover:bg-slate-50">
                                <td className="py-3 px-4">
                                    <div className="font-medium text-slate-900">{article.title}</div>
                                    <div className="text-xs text-slate-500">Author: {article.author.name}</div>
                                </td>
                                <td className="py-3 px-4 text-xs text-slate-600">
                                    {article.category?.name || "-"}
                                </td>
                                <td className="py-3 px-4">
                                    <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded ${
                                        article.status === 'published' 
                                            ? 'bg-green-100 text-green-800' 
                                            : article.status === 'pending_review' 
                                                ? 'bg-yellow-100 text-yellow-800'
                                                : 'bg-slate-100 text-slate-600'
                                    }`}>
                                        {article.status.replace("_", " ")}
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-xs text-slate-600">
                                    {new Date(article.updatedAt).toLocaleDateString("id-ID", {
                                        day: "numeric", month: "short", year: "numeric"
                                    })}
                                </td>
                                <td className="py-3 px-4 flex justify-end gap-3 items-center">
                                    <Link
                                        href={`/tutor/blog/${article.id}/edit`}
                                        className="text-blue-600 hover:text-blue-900 text-xs font-medium hover:underline"
                                    >
                                        Edit
                                    </Link>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
