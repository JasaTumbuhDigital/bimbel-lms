import Link from "next/link";
import { getReviewQueueForAdmin } from "@/lib/data/blog";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/ui/skeletons";
import { getAuthenticatedUser } from "@/lib/data/auth";
import { redirect } from "next/navigation";

export const metadata = {
    title: "Antrean Review Blog - Admin",
};

export default async function AdminBlogReviewPage() {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                <header className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div>
                        <Link
                            href="/admin/blog"
                            className="text-xs text-blue-600 hover:underline mb-1 inline-block"
                        >
                            &larr; Kembali ke Manajemen Blog
                        </Link>
                        <h1 className="text-xl font-bold text-slate-900">Antrean Review Artikel</h1>
                        <p className="text-xs text-slate-600">Daftar artikel yang menunggu persetujuan (paling lama menunggu di atas)</p>
                    </div>
                </header>

                <Suspense fallback={<TableSkeleton />}>
                    <ReviewQueueTable />
                </Suspense>
            </div>
        </div>
    );
}

async function ReviewQueueTable() {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== "admin") redirect("/login");

    const queue = await getReviewQueueForAdmin();

    return (
        <div className="overflow-x-auto bg-white border border-slate-200 rounded-lg shadow-sm">
            <table className="w-full text-left text-sm text-slate-800">
                <thead className="bg-slate-100 border-b border-slate-200 text-xs font-semibold uppercase text-slate-700">
                    <tr>
                        <th className="py-3 px-4">Judul</th>
                        <th className="py-3 px-4">Penulis (Author)</th>
                        <th className="py-3 px-4">Kategori</th>
                        <th className="py-3 px-4">Diajukan Pada</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                    {queue.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="py-8 px-4 text-center text-slate-500">
                                Tidak ada artikel dalam antrean review.
                            </td>
                        </tr>
                    ) : (
                        queue.map((article) => (
                            <tr key={article.id} className="hover:bg-slate-50">
                                <td className="py-3 px-4 font-medium text-slate-900">
                                    {article.title}
                                </td>
                                <td className="py-3 px-4 text-xs text-slate-600">
                                    {article.author.name}
                                </td>
                                <td className="py-3 px-4 text-xs text-slate-600">
                                    {article.category?.name || "-"}
                                </td>
                                <td className="py-3 px-4 text-xs text-slate-600">
                                    {article.submittedAt ? new Date(article.submittedAt).toLocaleDateString("id-ID", {
                                        day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                                    }) : "-"}
                                </td>
                                <td className="py-3 px-4 text-right">
                                    <Link
                                        href={`/admin/blog/${article.id}/edit`}
                                        className="bg-blue-50 text-blue-700 text-xs px-3 py-1.5 rounded border border-blue-200 hover:bg-blue-100 transition-colors inline-block"
                                    >
                                        Review Artikel
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
