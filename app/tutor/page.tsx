import { logoutAction } from "@/lib/actions/auth";

export default function TutorDashboardPage() {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <header className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">Dashboard Tutor</h1>
                        <p className="text-xs text-slate-600">Pengelolaan Materi Kursus dan Kuis</p>
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

                <main className="bg-white border border-slate-200 rounded-lg p-6">
                    <h2 className="text-base font-semibold text-slate-900 mb-1">
                        Selamat Datang di Halaman Tutor
                    </h2>
                    <p className="text-sm text-slate-600">
                        Halaman ini dikhususkan untuk role tutor. Di sini Anda dapat mengelola materi modul yang Anda ampu.
                    </p>
                </main>
            </div>
        </div>
    );
}
