import Link from "next/link";
import { logoutAction } from "@/lib/actions/auth";

export default function StudentDashboardPage() {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <header className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">Portal Belajar Siswa</h1>
                        <p className="text-xs text-slate-600">Materi dan Progress Pembelajaran</p>
                    </div>

                    <form action={logoutAction}>
                        <button
                            type="submit"
                            className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-sm font-medium py-1.5 px-3 rounded-md transition-colors"
                        >
                            Keluar
                        </button>
                    </form>
                </header>

                <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Card 1: Katalog Kursus */}
                    <Link
                        href="/student/courses"
                        className="block p-6 bg-white border border-slate-200 rounded-lg hover:border-blue-500 hover:shadow-sm transition-all"
                    >
                        <h2 className="text-base font-semibold text-slate-900 mb-1">
                            Katalog Kursus Pembelajaran &rarr;
                        </h2>
                        <p className="text-xs text-slate-600">
                            Jelajahi kursus yang tersedia untuk tingkatan kelas kamu dan mulai belajar.
                        </p>
                    </Link>
                </section>
            </div>
        </div>
    );
}
