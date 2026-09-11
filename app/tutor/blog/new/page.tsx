import Link from "next/link";
import CreateArticleForm from "@/components/blog/CreateArticleForm";

export const metadata = {
    title: "Buat Artikel Baru - Tutor",
};

export default function NewTutorBlogPage() {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
            <div className="max-w-2xl mx-auto space-y-6">
                <header className="border-b border-slate-200 pb-4">
                    <Link
                        href="/tutor/blog"
                        className="text-xs text-blue-600 hover:underline mb-1 inline-block"
                    >
                        &larr; Kembali ke Manajemen Blog
                    </Link>
                    <h1 className="text-xl font-bold text-slate-900">Buat Artikel Baru</h1>
                </header>

                <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
                    <CreateArticleForm basePath="/tutor/blog" />
                </div>
            </div>
        </div>
    );
}
