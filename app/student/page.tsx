import Link from "next/link";
import { logoutAction } from "@/lib/actions/auth";
import { getAuthenticatedUser } from "@/lib/data/auth";
import { getStudentDashboardSummary } from "@/lib/data/student-dashboard";
import { getStudentWishlist } from "@/lib/data/wishlist";
import { BookOpen, CheckCircle, PlayCircle, Bookmark, Loader2 } from "lucide-react";
import Image from "next/image";
import { WishlistButton } from "@/components/student/wishlist-button";
import { redirect } from "next/navigation";
import { getPublicUrl } from "@/lib/supabase-storage";
import { Suspense } from "react";

export const metadata = {
    title: "Dashboard Siswa",
};

export default async function StudentDashboardPage() {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== "student" || !user.studentProfile) {
        redirect("/login");
    }

    const studentId = user.studentProfile.id;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <header className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Halo, {user.name}!</h1>
                        <p className="text-sm text-slate-600">Selamat datang kembali di Portal Belajar Siswa</p>
                    </div>

                    <form action={logoutAction}>
                        <button
                            type="submit"
                            className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-sm font-medium py-1.5 px-4 rounded-md transition-colors"
                        >
                            Keluar
                        </button>
                    </form>
                </header>

                <Suspense fallback={<DashboardSkeleton />}>
                    <DashboardMain studentId={studentId} />
                </Suspense>
            </div>
        </div>
    );
}

function DashboardSkeleton() {
    return (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-sm text-slate-500 animate-pulse">Memuat dashboard...</p>
        </div>
    )
}

function WishlistSkeleton() {
    return (
        <div className="bg-white border border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center space-y-4 shadow-sm">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
            <p className="text-xs text-slate-500 animate-pulse">Memuat wishlist...</p>
        </div>
    )
}

async function DashboardMain({ studentId }: { studentId: string }) {
    const summary = await getStudentDashboardSummary(studentId);

    return (
        <>
            {/* Ringkasan Statistik */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="bg-blue-100 p-3 rounded-lg text-blue-700">
                        <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Enrolled</p>
                        <p className="text-2xl font-bold text-slate-900">{summary.enrolled}</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="bg-amber-100 p-3 rounded-lg text-amber-700">
                        <PlayCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Kursus Aktif</p>
                        <p className="text-2xl font-bold text-slate-900">{summary.aktif}</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="bg-green-100 p-3 rounded-lg text-green-700">
                        <CheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Kursus Selesai</p>
                        <p className="text-2xl font-bold text-slate-900">{summary.selesai}</p>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Kolom Kiri (2/3): Kursus Saya & Katalog */}
                <div className="lg:col-span-2 space-y-8">
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                <PlayCircle className="w-5 h-5 text-slate-500" />
                                Kursus Aktif & Selesai
                            </h2>
                        </div>

                        {summary.perCourse.length === 0 ? (
                            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500">
                                <p className="mb-4">Kamu belum mendaftar kursus apapun.</p>
                                <Link href="/student/courses" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md transition-colors text-sm">
                                    Eksplorasi Katalog Kursus
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {summary.perCourse.map(course => {
                                    const thumbnailUrl = getPublicUrl(course.thumbnailUrl || null);
                                    return (
                                        <Link
                                            key={course.courseId}
                                            href={`/student/courses/${course.courseId}`}
                                            className="group bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col sm:flex-row"
                                        >
                                            {/* Thumbnail Kecil */}
                                            <div className="w-full sm:w-48 h-32 bg-slate-100 relative shrink-0 overflow-hidden">
                                                {thumbnailUrl ? (
                                                    <Image src={thumbnailUrl} alt={course.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized />
                                                ) : (
                                                    <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                                                        <BookOpen className="w-8 h-8 opacity-50" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info Course */}
                                            <div className="p-4 flex-1 flex flex-col justify-between">
                                                <div>
                                                    <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                                                        {course.title}
                                                    </h3>
                                                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                                        <span className={`px-2 py-0.5 rounded-full font-medium ${course.isSelesai ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                            {course.isSelesai ? 'Selesai' : 'Sedang Berjalan'}
                                                        </span>
                                                        <span>&bull;</span>
                                                        <span>{course.completed} / {course.total} Materi</span>
                                                    </div>
                                                </div>

                                                <div className="mt-4">
                                                    <div className="flex justify-between text-xs mb-1 font-medium text-slate-700">
                                                        <span>Progres Belajar</span>
                                                        <span>{course.progressPercentage}%</span>
                                                    </div>
                                                    <div className="w-full bg-slate-200 rounded-full h-1.5">
                                                        <div
                                                            className={`h-1.5 rounded-full ${course.isSelesai ? 'bg-green-500' : 'bg-blue-600'}`}
                                                            style={{ width: `${course.progressPercentage}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}

                                <div className="pt-4 text-center">
                                    <Link href="/student/courses" className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline">
                                        Jelajahi kursus lainnya &rarr;
                                    </Link>
                                </div>
                            </div>
                        )}
                    </section>
                </div>

                {/* Kolom Kanan (1/3): Wishlist */}
                <div className="space-y-8">
                    <section>
                        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-4">
                            <Bookmark className="w-5 h-5 text-slate-500" />
                            Wishlist Saya
                        </h2>

                        <Suspense fallback={<WishlistSkeleton />}>
                            <WishlistSidebar />
                        </Suspense>
                    </section>
                </div>
            </div>
        </>
    );
}

async function WishlistSidebar() {
    const wishlists = await getStudentWishlist();
    
    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            {wishlists.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">
                    Wishlist kamu kosong.
                </div>
            ) : (
                <div className="divide-y divide-slate-100">
                    {wishlists.map(w => (
                        <div key={w.id} className="relative p-4 hover:bg-slate-50 transition-colors group">
                            <Link href={`/student/courses/${w.course.id}`} className="absolute inset-0 z-0" />
                            <h3 className="font-medium text-slate-900 group-hover:text-blue-600 line-clamp-2 text-sm mb-2 relative z-10 pointer-events-none">
                                {w.course.title}
                            </h3>
                            <div className="flex justify-between items-center mt-3 relative z-10">
                                <div className="text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded pointer-events-none">
                                    {w.course.classLevels.length > 0 ? w.course.classLevels[0].classLevel.name : 'Umum'}
                                </div>
                                {/* WishlistButton dengan layout yg lebih kecil untuk sidebar */}
                                <div className="scale-90 origin-right">
                                    <WishlistButton courseId={w.course.id} initialIsWishlisted={true} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
