"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { institutionConfig } from "@/config/institution";
import { loginAction } from "@/lib/actions/auth";

export default function LoginPage() {
    const router = useRouter();
    const [isPending, setIsPending] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsPending(true);
        setErrorMsg(null);

        const formData = new FormData(e.currentTarget);
        try {
            const res = await loginAction(null, formData);
            if (!res.success) {
                setErrorMsg(res.error || "Gagal melakukan login.");
                setIsPending(false);
            } else if (res.data?.redirectTo) {
                router.push(res.data.redirectTo);
                router.refresh();
                // Sengaja tidak set isPending(false) agar tombol tetap loading
                // selama Next.js memuat halaman dashboard
            }
        } catch (err) {
            setErrorMsg("Terjadi kesalahan sistem saat mencoba login.");
            setIsPending(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 text-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white border border-slate-300 rounded-lg shadow-sm p-6 space-y-6">
                {/* Branding Header */}
                <div className="text-center space-y-1">
                    <h1 className="text-xl font-bold text-slate-900">
                        {institutionConfig.name}
                    </h1>
                    <p className="text-sm text-slate-600">{institutionConfig.hero.subtitle}</p>
                </div>

                {/* Error Alert */}
                {errorMsg && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                        {errorMsg}
                    </div>
                )}

                {/* Form Login */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                            Email
                        </label>
                        <input
                            name="email"
                            type="email"
                            required
                            placeholder="nama@email.com"
                            className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                            Password
                        </label>
                        <input
                            name="password"
                            type="password"
                            required
                            placeholder="Masukkan password"
                            className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50 text-sm"
                    >
                        {isPending ? "Memproses..." : "Masuk ke Akun"}
                    </button>
                </form>

                <div className="text-center pt-2 border-t border-slate-200">
                    <p className="text-xs text-slate-500">
                        LMS Bimbel &copy; {new Date().getFullYear()} - {institutionConfig.shortName}
                    </p>
                </div>
            </div>
        </div>
    );
}
