import Link from "next/link";
import { getBlogCategories } from "@/lib/data/blog";
import { getAuthenticatedUser } from "@/lib/data/auth";
import { redirect } from "next/navigation";
import CategoryManager from "@/components/blog/CategoryManager";

export const metadata = {
    title: "Manajemen Kategori Blog - Admin",
};

export default async function AdminBlogCategoriesPage() {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== "admin") {
        redirect("/login");
    }

    const categories = await getBlogCategories();

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <header className="border-b border-slate-200 pb-4">
                    <Link
                        href="/admin/blog"
                        className="text-xs text-blue-600 hover:underline mb-2 inline-block"
                    >
                        &larr; Kembali ke Manajemen Artikel
                    </Link>
                    <h1 className="text-xl font-bold text-slate-900">Manajemen Kategori Blog</h1>
                    <p className="text-xs text-slate-600 mt-0.5">
                        Kelola kategori artikel blog untuk memudahkan pengelompokan materi dan artikel.
                    </p>
                </header>

                <CategoryManager initialCategories={categories} />
            </div>
        </div>
    );
}
