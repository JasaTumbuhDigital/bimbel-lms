"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { changePasswordAction } from "@/lib/actions/auth";

export default function ChangePasswordPage() {
    const router = useRouter();
    const [isPending, setIsPending] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsPending(true);
        setErrorMsg(null);
        setSuccessMsg(null);

        const formData = new FormData(e.currentTarget);
        try {
            const res = await changePasswordAction(null, formData);
            if (!res.success) {
                setErrorMsg(res.error || "Gagal memperbarui password.");
            } else {
                setSuccessMsg("Password berhasil diperbarui. Mengalihkan ke portal user...");
                setTimeout(() => {
                    router.push(res.data?.redirectTo || "/student");
                    router.refresh();
                }, 1500);
            }
        } catch (err) {
            setErrorMsg("Terjadi kesalahan sistem saat memperbarui password.");
        } finally {
            setIsPending(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 text-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white border border-slate-300 rounded-lg shadow-sm p-6 space-y-6">
                <div className="text-center space-y-1">
                    <h1 className="text-xl font-bold text-slate-900">
                        Perbarui Password Pertama Kali
                    </h1>
                    <p className="text-xs text-slate-600">
                        Demi keamanan akun Anda, silakan ubah password default dari admin menjadi password baru Anda.
                    </p>
                </div>

                {errorMsg && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                        {errorMsg}
                    </div>
                )}

                {successMsg && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
                        {successMsg}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                            Password Baru
                        </label>
                        <input
                            name="newPassword"
                            type="password"
                            required
                            placeholder="Minimal 8 karakter (Huruf besar, kecil, & angka)"
                            className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                            Konfirmasi Password Baru
                        </label>
                        <input
                            name="confirmPassword"
                            type="password"
                            required
                            placeholder="Ulangi password baru"
                            className="w-full bg-slate-300 border border-slate-300 rounded-md py-2 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50 text-sm"
                    >
                        {isPending ? "Menyimpan Password..." : "Simpan dan Lanjutkan"}
                    </button>
                </form>
            </div>
        </div>
    );
}
