import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/data/auth";
import { getAllReviewsForAdmin } from "@/lib/data/review";
import { deleteReviewAction } from "@/lib/actions/review";
import { Star } from "lucide-react";
import Link from "next/link";
import { DeleteReviewButton } from "@/components/admin/delete-review-button";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/ui/skeletons";

export const metadata = {
    title: "Manajemen Ulasan - Admin",
};

export default async function AdminReviewsPage() {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== "admin") {
        redirect("/login");
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                <header className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div>
                        <Link href="/admin" className="text-sm text-blue-600 hover:underline mb-1 inline-block">
                            &larr; Kembali ke Dashboard
                        </Link>
                        <h1 className="text-2xl font-bold text-slate-900">Manajemen Ulasan</h1>
                        <p className="text-sm text-slate-500 mt-0.5">
                            Kelola ulasan dari seluruh kursus
                        </p>
                    </div>
                </header>

                <Suspense fallback={<TableSkeleton />}>
                    <ReviewsTable />
                </Suspense>
            </div>
        </div>
    );
}

async function ReviewsTable() {
    const reviews = await getAllReviewsForAdmin();

    if (reviews.length === 0) {
        return (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-500">
                Belum ada ulasan yang masuk.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <p className="text-sm text-slate-600">
                Menampilkan {reviews.length} ulasan
            </p>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                        <tr>
                            <th className="text-left px-5 py-3 font-medium">Siswa</th>
                            <th className="text-left px-5 py-3 font-medium">Kursus</th>
                            <th className="text-center px-5 py-3 font-medium">Rating</th>
                            <th className="text-left px-5 py-3 font-medium">Komentar</th>
                            <th className="text-left px-5 py-3 font-medium">Tanggal</th>
                            <th className="px-5 py-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {reviews.map((review) => (
                            <tr key={review.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-5 py-4 font-medium text-slate-800 whitespace-nowrap">
                                    {review.student.user.name}
                                </td>
                                <td className="px-5 py-4">
                                    <Link
                                        href={`/admin/courses/${review.course.id}/edit`}
                                        className="text-blue-600 hover:underline line-clamp-1 max-w-[200px] block"
                                        title={review.course.title}
                                    >
                                        {review.course.title}
                                    </Link>
                                </td>
                                <td className="px-5 py-4">
                                    <div className="flex items-center justify-center gap-0.5">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <Star
                                                key={star}
                                                className={`w-3.5 h-3.5 ${
                                                    star <= review.rating
                                                        ? "fill-yellow-400 text-yellow-400"
                                                        : "text-slate-200"
                                                }`}
                                            />
                                        ))}
                                        <span className="ml-1 text-xs text-slate-500">({review.rating})</span>
                                    </div>
                                </td>
                                <td className="px-5 py-4 text-slate-600 max-w-xs">
                                    <p className="line-clamp-2">{review.comment || <span className="italic text-slate-400">—</span>}</p>
                                </td>
                                <td className="px-5 py-4 text-slate-400 whitespace-nowrap text-xs">
                                    {new Date(review.createdAt).toLocaleDateString("id-ID", {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                    })}
                                </td>
                                <td className="px-5 py-4 text-right">
                                    <DeleteReviewButton reviewId={review.id} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
