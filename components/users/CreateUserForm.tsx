"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createUserAccountAction } from "@/lib/actions/user";
import { ActionResult } from "@/types/action";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/skeletons";

type ClassLevelOption = {
    id: string;
    name: string;
    isDefault: boolean;
};

export default function CreateUserForm({
    classLevels,
    defaultRole = "student",
}: {
    classLevels: ClassLevelOption[];
    defaultRole?: string;
}) {
    const [state, formAction, isPending] = useActionState<ActionResult, FormData>(
        createUserAccountAction,
        { success: false }
    );
    const formRef = useRef<HTMLFormElement>(null);
    const [selectedRole, setSelectedRole] = useState(defaultRole);

    useEffect(() => {
        if (state.success && formRef.current) {
            formRef.current.reset();
            toast.success(state.message);
        } else if (state.error) {
            toast.error(state.error);
        }
    }, [state]);

    return (
        <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 max-w-xl">
            <h2 className="text-base font-semibold text-slate-900 mb-4">
                Formulir Registrasi Pengguna Baru
            </h2>

            <form ref={formRef} action={formAction} className="space-y-4">
                {/* Pilihan Role */}
                <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                        Peran (Role) *
                    </label>
                    <select
                        name="role"
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                        <option value="student">Siswa</option>
                        <option value="tutor">Tutor</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>

                {/* Nama Lengkap */}
                <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                        Nama Lengkap *
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
                        Alamat Email *
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
                        type="tel"
                        placeholder="Contoh: 081234567890"
                        className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    {state.fieldErrors?.phone && (
                        <p className="text-xs text-red-600">{state.fieldErrors.phone[0]}</p>
                    )}
                </div>

                {/* Dinamis: Kelas (Khusus Siswa) */}
                {selectedRole === "student" && (
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                            Jenjang Kelas *
                        </label>
                        <select
                            name="classLevelId"
                            required
                            defaultValue={classLevels.find(c => c.isDefault)?.id || ""}
                            className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        >
                            <option value="" disabled>-- Pilih Kelas --</option>
                            {classLevels.map((level) => (
                                <option key={level.id} value={level.id}>
                                    {level.name}
                                </option>
                            ))}
                        </select>
                        {state.fieldErrors?.classLevelId && (
                            <p className="text-xs text-red-600">{state.fieldErrors.classLevelId[0]}</p>
                        )}
                    </div>
                )}

                {/* Dinamis: Bio (Khusus Tutor) */}
                {selectedRole === "tutor" && (
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                            Bio Singkat (Opsional)
                        </label>
                        <textarea
                            name="bio"
                            rows={3}
                            placeholder="Tulis sedikit latar belakang atau spesialisasi..."
                            className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                        ></textarea>
                    </div>
                )}

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isPending ? <><Spinner /> Menyimpan Data...</> : "Buat Akun Pengguna"}
                    </button>
                    <p className="text-xs text-slate-500 mt-3 text-center">
                        Catatan: Password default akan dibuat otomatis, pengguna wajib menggantinya saat login pertama kali.
                    </p>
                </div>
            </form>
        </section>
    );
}
