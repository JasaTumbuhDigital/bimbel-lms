import Link from "next/link";
import { getClassLevels } from "@/lib/data/class-level";
import CreateUserForm from "@/components/users/CreateUserForm";

type Params = {
    searchParams: Promise<{
        role?: string;
    }>;
};

export default async function NewUserPage({ searchParams }: Params) {
    const { role = "student" } = await searchParams;

    const classLevels = await getClassLevels();

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                <header className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div>
                        <Link href={`/admin/users?tab=${role}`} className="text-xs text-blue-600 hover:underline mb-1 inline-block">
                            &larr; Batal & Kembali ke Daftar Pengguna
                        </Link>
                        <h1 className="text-xl font-bold text-slate-900">Tambah Pengguna Baru</h1>
                        <p className="text-xs text-slate-600">
                            Isi formulir di bawah untuk menambahkan siswa, tutor, atau admin baru.
                        </p>
                    </div>
                </header>

                <main>
                    <CreateUserForm classLevels={classLevels} defaultRole={role} />
                </main>
            </div>
        </div>
    );
}
