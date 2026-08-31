"use client";

import { useActionState, useEffect, useRef } from "react";
import { createStudentAction, type ActionResult } from "@/lib/actions/auth";

type ClassLevelOption = {
    id: string;
    name: string;
    isDefault: boolean;
};

export default function CreateStudentForm({
    classLevels,
}: {
    classLevels: ClassLevelOption[];
}) {
    const [state, formAction, isPending] = useActionState<ActionResult, FormData>(
        createStudentAction,
        { success: false }
    );
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        if (state.success && formRef.current) {
            formRef.current.reset();
        }
    }, [state.success]);

    return (
        <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 max-w-xl">
            <h2 className="text-base font-semibold text-slate-900">
                Formulir Registrasi Siswa Baru
            </h2>

            {/* Alert Error General */}
            {state.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                    {state.error}
                </div>
            )}

            {/* Alert Sukses */}
            {state.success && state.message && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
                    {state.message}
                </div>
            )}

            <form ref={formRef} action={formAction} className="space-y-4">
                {/* Nama Lengkap */}
                <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                        Nama Lengkap Siswa *
                    </label>
                    <input
                        name="name"
                        type="text"
                        required
                        placeholder="Contoh: Ahmad Rizky"
                        className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    {state.fieldErrors?.name && (
                        <p className="text-xs text-red-600">{state.fieldErrors.name[0]}</p>
                    )}
                </div>

                {/* Email */}
                <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                        Alamat Email Siswa *
                    </label>
                    <input
                        name="email"
                        type="email"
                        required
                        placeholder="Contoh: ahmad.rizky@gmail.com"
                        className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    {state.fieldErrors?.email && (
                        <p className="text-xs text-red-600">{state.fieldErrors.email[0]}</p>
                    )}
                </div>

                {/* Nomor Telepon */}
                <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                        Nomor WhatsApp / Telepon (Opsional)
                    </label>
                    <input
                        name="phone"
                        type="text"
                        placeholder="Contoh: 081234567890"
                        className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                </div>

                {/* Password Awal */}
                <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                        Password Awal Akun (Opsional)
                    </label>
                    <input
                        name="password"
                        type="password"
                        placeholder="Kosongkan untuk menggunakan default: Password123"
                        className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <p className="text-xs text-slate-500">
                        Siswa akan dipaksa mengganti password ini saat pertama kali login.
                    </p>
                </div>

                {/* Pilihan Tingkatan Kelas */}
                <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                        Tingkatan Kelas *
                    </label>
                    <select
                        name="classLevelId"
                        className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                        <option value="">-- Pilih Tingkatan Kelas --</option>
                        {classLevels.map((level) => (
                            <option key={level.id} value={level.id}>
                                {level.name} {level.isDefault ? "(Kelas Bawaan Default)" : ""}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    type="submit"
                    disabled={isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-md transition-colors text-sm disabled:opacity-50"
                >
                    {isPending ? "Mendaftarkan Siswa..." : "Daftarkan Siswa Baru"}
                </button>
            </form>
        </section>
    );
}
