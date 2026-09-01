import Link from "next/link";
import { getClassLevels } from "@/lib/data/class-level";
import CreateClassLevelForm from "@/components/class-level/CreateClassLevelForm";
import DeleteClassLevelButton from "@/components/class-level/DeleteClassLevelButton";

export default async function ClassLevelsPage() {
    const classLevels = await getClassLevels();

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header Navigasi */}
                <header className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div>
                        <Link
                            href="/admin"
                            className="text-xs text-blue-600 hover:underline mb-1 inline-block"
                        >
                            &larr; Kembali ke Dashboard Admin
                        </Link>
                        <h1 className="text-xl font-bold text-slate-900">
                            Manajemen Tingkatan Kelas
                        </h1>
                        <p className="text-xs text-slate-600">
                            Kelola kategori tingkatan kelas untuk penempatan siswa
                        </p>
                    </div>
                </header>

                {/* Client Component Form Tambah Kelas */}
                <CreateClassLevelForm />

                {/* Section Tabel Daftar Kelas */}
                <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
                    <h2 className="text-base font-semibold text-slate-900">
                        Daftar Tingkatan Kelas ({classLevels.length})
                    </h2>

                    {classLevels.length === 0 ? (
                        <p className="text-sm text-slate-500 py-4">
                            Belum ada tingkatan kelas yang dibuat. Silakan tambahkan kelas pertama menggunakan form di atas.
                        </p>
                    ) : (
                        <div className="overflow-x-auto border border-slate-200 rounded-md">
                            <table className="w-full text-left text-sm text-slate-800">
                                <thead className="bg-slate-100 border-b border-slate-200 text-xs font-semibold uppercase text-slate-700">
                                    <tr>
                                        <th className="py-2.5 px-4">Nama Kelas</th>
                                        <th className="py-2.5 px-4">Deskripsi</th>
                                        <th className="py-2.5 px-4 text-center">Jumlah Siswa</th>
                                        <th className="py-2.5 px-4 text-center">Status</th>
                                        <th className="py-2.5 px-4 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {classLevels.map((level) => (
                                        <tr key={level.id} className="hover:bg-slate-50">
                                            <td className="py-3 px-4 font-medium text-slate-900">
                                                {level.name}
                                            </td>
                                            <td className="py-3 px-4 text-slate-600">
                                                {level.description || "-"}
                                            </td>
                                            <td className="py-3 px-4 text-center font-medium">
                                                {level._count.studentProfiles}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                {level.isDefault ? (
                                                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded font-medium">
                                                        Default
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 text-xs">-</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <DeleteClassLevelButton
                                                    id={level.id}
                                                    name={level.name}
                                                    studentCount={level._count.studentProfiles}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
