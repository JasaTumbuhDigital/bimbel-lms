import Link from "next/link";
import { logoutAction } from "@/lib/actions/auth";

export default function AdminDashboardPage() {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header Dashboard */}
                <header className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Dashboard Admin</h1>
                        <p className="text-sm text-slate-600">
                            Selamat datang di Panel Manajemen Bimbel Zest College
                        </p>
                    </div>
                    <form action={logoutAction}>
                        <button
                            type="submit"
                            className="bg-red-600 hover:bg-red-700 text-white text-xs font-medium py-2 px-4 rounded-md transition-colors"
                        >
                            Keluar (Logout)
                        </button>
                    </form>
                </header>

                {/* Grid Menu Navigasi Admin */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Card 1: Manajemen Tingkatan Kelas */}
                    <Link
                        href="/admin/class-levels"
                        className="block p-6 bg-white border border-slate-200 rounded-lg hover:border-blue-500 hover:shadow-sm transition-all"
                    >
                        <h2 className="text-base font-semibold text-slate-900 mb-1">
                            Manajemen Tingkatan Kelas &rarr;
                        </h2>
                        <p className="text-xs text-slate-600">
                            Tambah dan kelola kategori tingkatan kelas (10 SMA, 11 SMA, 12 UTBK) untuk penempatan siswa.
                        </p>
                    </Link>

                    {/* Card 2: Tambah Siswa Baru */}
                    <Link
                        href="/admin/students/new"
                        className="block p-6 bg-white border border-slate-200 rounded-lg hover:border-blue-500 hover:shadow-sm transition-all"
                    >
                        <h2 className="text-base font-semibold text-slate-900 mb-1">
                            Registrasi Siswa Baru &rarr;
                        </h2>
                        <p className="text-xs text-slate-600">
                            Daftarkan akun siswa baru, atur kredensial awal, dan tentukan penempatan kelasnya.
                        </p>
                    </Link>

                    {/* Card 3: Daftar Seluruh Siswa */}
                    <Link
                        href="/admin/students"
                        className="block p-6 bg-white border border-slate-200 rounded-lg hover:border-blue-500 hover:shadow-sm transition-all"
                    >
                        <h2 className="text-base font-semibold text-slate-900 mb-1">
                            Daftar Seluruh Siswa &rarr;
                        </h2>
                        <p className="text-xs text-slate-600">
                            Lihat status akun siswa, tingkatan kelas, dan status reset password.
                        </p>
                    </Link>

                    {/* Card 4: Manajemen Kursus */}
                    <Link
                        href="/admin/courses"
                        className="block p-6 bg-white border border-slate-200 rounded-lg hover:border-blue-500 hover:shadow-sm transition-all"
                    >
                        <h2 className="text-base font-semibold text-slate-900 mb-1">
                            Manajemen Kursus &rarr;
                        </h2>
                        <p className="text-xs text-slate-600">
                            Buat kursus baru, kelola modul/materi, tingkatan kelas, dan atur penugasan tutor.
                        </p>
                    </Link>

                    {/* Card 5: Manajemen Ulasan */}
                    <Link
                        href="/admin/reviews"
                        className="block p-6 bg-white border border-slate-200 rounded-lg hover:border-blue-500 hover:shadow-sm transition-all"
                    >
                        <h2 className="text-base font-semibold text-slate-900 mb-1">
                            Manajemen Ulasan &rarr;
                        </h2>
                        <p className="text-xs text-slate-600">
                            Pantau dan moderasi ulasan siswa dari seluruh kursus. Hapus ulasan yang tidak pantas.
                        </p>
                    </Link>
                </section>
            </div>
        </div>
    );
}
