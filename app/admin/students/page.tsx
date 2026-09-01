import Link from "next/link";
import { getStudents } from "@/lib/data/auth";
import { getClassLevels } from "@/lib/data/class-level";
import StudentRowActions from "@/components/users/StudentRowActions";

export default async function StudentsPage() {
    const [students, classLevels] = await Promise.all([
        getStudents(),
        getClassLevels(),
    ]);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
            <div className="max-w-6xl mx-auto space-y-6">
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
                            Daftar Seluruh Siswa
                        </h1>
                        <p className="text-xs text-slate-600">
                            Kelola dan pantau data akun seluruh siswa terdaftar
                        </p>
                    </div>

                    <Link
                        href="/admin/students/new"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors text-xs"
                    >
                        + Registrasi Siswa Baru
                    </Link>
                </header>

                {/* Section Tabel Daftar Siswa */}
                <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
                    <h2 className="text-base font-semibold text-slate-900">
                        Total Siswa Terdaftar ({students.length})
                    </h2>

                    {students.length === 0 ? (
                        <p className="text-sm text-slate-500 py-4">
                            Belum ada siswa yang terdaftar. Silakan daftarkan siswa pertama dengan menekan tombol di atas.
                        </p>
                    ) : (
                        <div className="overflow-x-auto border border-slate-200 rounded-md">
                            <table className="w-full text-left text-sm text-slate-800">
                                <thead className="bg-slate-100 border-b border-slate-200 text-xs font-semibold uppercase text-slate-700">
                                    <tr>
                                        <th className="py-2.5 px-4">Nama Siswa</th>
                                        <th className="py-2.5 px-4">Kontak (Email / Telepon)</th>
                                        <th className="py-2.5 px-4 text-center">Tingkatan Kelas Saat Ini</th>
                                        <th className="py-2.5 px-4 text-center">Status Password</th>
                                        <th className="py-2.5 px-4 text-center">Status Akun</th>
                                        <th className="py-2.5 px-4 text-right">Aksi & Kelola Kelas</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {students.map((student) => {
                                        const profile = student.studentProfile;
                                        const classLevelName = profile?.classLevel?.name || "Belum Diatur";
                                        const mustChangePassword = profile?.mustChangePassword;

                                        return (
                                            <tr key={student.id} className="hover:bg-slate-50">
                                                <td className="py-3 px-4 font-medium text-slate-900">
                                                    {student.name}
                                                </td>
                                                <td className="py-3 px-4 text-slate-600">
                                                    <div>{student.email}</div>
                                                    {student.phone && (
                                                        <div className="text-xs text-slate-400">{student.phone}</div>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <span className="bg-slate-100 text-slate-800 text-xs px-2.5 py-1 rounded font-medium border border-slate-200">
                                                        {classLevelName}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    {mustChangePassword ? (
                                                        <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded font-medium">
                                                            Wajib Ganti Password
                                                        </span>
                                                    ) : (
                                                        <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded font-medium">
                                                            Password Diperbarui
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    {student.isActive ? (
                                                        <span className="text-emerald-600 text-xs font-semibold">
                                                            Aktif
                                                        </span>
                                                    ) : (
                                                        <span className="text-red-600 text-xs font-semibold">
                                                            Nonaktif
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    {profile && (
                                                        <StudentRowActions
                                                            studentId={student.id}
                                                            authId={student.authId}
                                                            studentProfileId={profile.id}
                                                            currentClassLevelId={profile.classLevelId}
                                                            classLevels={classLevels}
                                                        />
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
