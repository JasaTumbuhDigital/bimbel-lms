import Link from "next/link";
import { getClassLevels } from "@/lib/data/class-level";
import CreateStudentForm from "@/components/users/CreateStudentForm";

export default async function NewStudentPage() {
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
                            Registrasi Akun Siswa Baru
                        </h1>
                        <p className="text-xs text-slate-600">
                            Tambah siswa baru dan tetapkan penempatan tingkatan kelasnya
                        </p>
                    </div>
                </header>

                {/* Form Component */}
                <CreateStudentForm classLevels={classLevels} />
            </div>
        </div>
    );
}
