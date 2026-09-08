import Link from "next/link";
import { listUsers } from "@/lib/data/user";
import { getClassLevels } from "@/lib/data/class-level";
import { getAuthenticatedUser } from "@/lib/data/auth";
import UserRowActions from "@/components/users/UserRowActions";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/ui/skeletons";

type Params = {
    searchParams: Promise<{
        tab?: string;
        search?: string;
        classLevelId?: string;
        page?: string;
    }>;
};

export default async function AdminUsersPage({ searchParams }: Params) {
    const { tab = "student", search, classLevelId, page } = await searchParams;

    const activeTab = tab as "student" | "tutor" | "admin";
    const currentPage = page ? parseInt(page, 10) : 1;
    
    // Ambil data yang ringan agar UI filter cepat dirender
    const classLevels = await getClassLevels();

    const tabs = [
        { key: "student", label: "Siswa" },
        { key: "tutor", label: "Tutor" },
        { key: "admin", label: "Admin" },
    ];

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <header className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div>
                        <Link href="/admin" className="text-xs text-blue-600 hover:underline mb-1 inline-block">
                            &larr; Kembali ke Dashboard Admin
                        </Link>
                        <h1 className="text-xl font-bold text-slate-900">Manajemen Pengguna</h1>
                        <p className="text-xs text-slate-600">
                            Kelola akun siswa, tutor, dan admin
                        </p>
                    </div>
                    {/* Tombol tambah user sesuai tab aktif */}
                    <Link
                        href={`/admin/users/new?role=${activeTab}`}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors text-xs"
                    >
                        + Tambah {tabs.find(t => t.key === activeTab)?.label}
                    </Link>
                </header>

                {/* Tab Navigasi */}
                <nav className="flex border-b border-slate-200">
                    {tabs.map((t) => (
                        <Link
                            key={t.key}
                            href={`/admin/users?tab=${t.key}`}
                            className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === t.key
                                ? "border-b-2 border-blue-600 text-blue-600"
                                : "text-slate-500 hover:text-slate-800"
                                }`}
                        >
                            {t.label}
                        </Link>
                    ))}
                </nav>

                {/* Filter & Search */}
                <form method="GET" className="flex gap-3 flex-wrap">
                    <input type="hidden" name="tab" value={activeTab} />
                    <input
                        type="search"
                        name="search"
                        defaultValue={search}
                        placeholder="Cari nama atau email..."
                        className="border border-slate-200 rounded-md px-3 py-1.5 text-sm flex-1 min-w-48"
                    />
                    {/* Filter tingkatan kelas */}
                    {activeTab === "student" && (
                        <select
                            name="classLevelId"
                            defaultValue={classLevelId || ""}
                            className="border border-slate-200 rounded-md px-3 py-1.5 text-sm"
                        >
                            <option value="">Semua Tingkatan</option>
                            {classLevels.map((cl) => (
                                <option key={cl.id} value={cl.id}>{cl.name}</option>
                            ))}
                        </select>
                    )}
                    <button type="submit" className="bg-slate-700 text-white px-4 py-1.5 rounded-md text-sm">
                        Cari
                    </button>
                    {(search || classLevelId) && (
                        <Link href={`/admin/users?tab=${activeTab}`} className="px-4 py-1.5 text-sm text-slate-500 border border-slate-200 rounded-md">
                            Reset
                        </Link>
                    )}
                </form>

                {/* Tabel User dengan Suspense */}
                <Suspense key={`${activeTab}-${search}-${classLevelId}-${currentPage}`} fallback={<TableSkeleton />}>
                    <UsersTable 
                        activeTab={activeTab} 
                        search={search} 
                        classLevelId={classLevelId} 
                        currentPage={currentPage} 
                        classLevels={classLevels} 
                    />
                </Suspense>
            </div>
        </div>
    );
}

async function UsersTable({ 
    activeTab, 
    search, 
    classLevelId, 
    currentPage, 
    classLevels 
}: { 
    activeTab: "student"|"tutor"|"admin";
    search?: string;
    classLevelId?: string;
    currentPage: number;
    classLevels: any[];
}) {
    const pageSize = 10;
    
    const [currentUser, { users, total }] = await Promise.all([
        getAuthenticatedUser(),
        listUsers({ role: activeTab, search, classLevelId, page: currentPage, pageSize }),
    ]);

    return (
        <div className="space-y-4">
            <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                {users.length === 0 ? (
                    <p className="text-sm text-slate-500 p-6">Tidak ada pengguna ditemukan.</p>
                ) : (
                    <table className="w-full text-left text-sm text-slate-800">
                        <thead className="bg-slate-100 border-b border-slate-200 text-xs font-semibold uppercase text-slate-700">
                            <tr>
                                <th className="py-2.5 px-4">Nama</th>
                                <th className="py-2.5 px-4">Email</th>
                                {activeTab === "student" && <th className="py-2.5 px-4 text-center">Tingkatan</th>}
                                {activeTab === "tutor" && <th className="py-2.5 px-4 text-center">Kursus Diampu</th>}
                                <th className="py-2.5 px-4 text-center">Status Akun</th>
                                <th className="py-2.5 px-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {users.map((user) => {
                                const profile = (user as any).studentProfile;
                                const tutorProfile = (user as any).tutorProfile;
                                const courseCount = tutorProfile?._count?.courseTutors ?? null;

                                return (
                                    <tr key={user.id} className="hover:bg-slate-50">
                                        <td className="py-3 px-4 font-medium">{user.name}</td>
                                        <td className="py-3 px-4 text-slate-600">{user.email}</td>
                                        {activeTab === "student" && (
                                            <td className="py-3 px-4 text-center">
                                                <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded border border-slate-200">
                                                    {profile?.classLevel?.name || "Belum Diatur"}
                                                </span>
                                            </td>
                                        )}
                                        {activeTab === "tutor" && (
                                            <td className="py-3 px-4 text-center">
                                                <span className="text-slate-600 text-xs">{courseCount ?? 0} kursus</span>
                                            </td>
                                        )}
                                        <td className="py-3 px-4 text-center">
                                            {user.isActive ? (
                                                <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded font-medium">Aktif</span>
                                            ) : (
                                                <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded font-medium">Nonaktif</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <UserRowActions
                                                user={{
                                                    id: user.id,
                                                    authId: user.authId,
                                                    name: user.name,
                                                    email: user.email,
                                                    phone: user.phone ?? null,
                                                    isActive: user.isActive,
                                                    role: user.role,
                                                    mustChangePassword: user.mustChangePassword,
                                                    bio: tutorProfile?.bio ?? null,
                                                }}
                                                studentProfileId={profile?.id ?? null}
                                                classLevels={classLevels}
                                                activeTab={activeTab}
                                                currentAdminId={currentUser?.id}
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </section>

            {/* Pagination */}
            {total > pageSize && (
                <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                    <p className="text-sm text-slate-600">
                        Menampilkan {(currentPage - 1) * pageSize + 1} hingga {Math.min(currentPage * pageSize, total)} dari {total} pengguna
                    </p>
                    <div className="flex gap-2">
                        {currentPage > 1 ? (
                            <Link
                                href={`/admin/users?tab=${activeTab}${search ? `&search=${search}` : ""}${classLevelId ? `&classLevelId=${classLevelId}` : ""}&page=${currentPage - 1}`}
                                className="px-3 py-1.5 border border-slate-200 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors"
                            >
                                Sebelumnya
                            </Link>
                        ) : (
                            <span className="px-3 py-1.5 border border-slate-100 rounded-md text-sm font-medium text-slate-400 bg-slate-50 cursor-not-allowed">
                                Sebelumnya
                            </span>
                        )}
                        {currentPage * pageSize < total ? (
                            <Link
                                href={`/admin/users?tab=${activeTab}${search ? `&search=${search}` : ""}${classLevelId ? `&classLevelId=${classLevelId}` : ""}&page=${currentPage + 1}`}
                                className="px-3 py-1.5 border border-slate-200 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors"
                            >
                                Selanjutnya
                            </Link>
                        ) : (
                            <span className="px-3 py-1.5 border border-slate-100 rounded-md text-sm font-medium text-slate-400 bg-slate-50 cursor-not-allowed">
                                Selanjutnya
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
