"use client";

import { useTransition, useState } from "react";
import {
    toggleUserActiveAction,
    resetUserPasswordAction,
    updateUserAccountAction,
} from "@/lib/actions/user";
import { updateStudentClassLevelAction } from "@/lib/actions/class-level";

type UserData = {
    id: string;
    authId: string;
    name: string;
    email: string;
    phone: string | null;
    isActive: boolean;
    role: string;
    mustChangePassword: boolean;
    bio: string | null;
};

type ClassLevelOption = { id: string; name: string };

export default function UserRowActions({
    user,
    studentProfileId,
    classLevels,
    activeTab,
    currentAdminId,
}: {
    user: UserData;
    studentProfileId: string | null;
    classLevels: ClassLevelOption[];
    activeTab: "student" | "tutor" | "admin";
    currentAdminId?: string;
}) {
    const [isPending, startTransition] = useTransition();
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showClassModal, setShowClassModal] = useState(false);

    const clearFeedback = () => setTimeout(() => setFeedback(null), 4000);

    const handleToggleActive = () => {
        const action = user.isActive ? "menonaktifkan" : "mengaktifkan";
        if (!confirm(`Apakah yakin ingin ${action} akun ${user.name}?`)) return;

        startTransition(async () => {
            const res = await toggleUserActiveAction(user.id, !user.isActive);
            setFeedback({ type: res.success ? "success" : "error", msg: res.message || res.error || "" });
            clearFeedback();
        });
    };

    const handleResetPassword = () => {
        if (!confirm(`Reset password ${user.name} ke default? Mereka wajib ganti password saat login berikutnya.`)) return;

        startTransition(async () => {
            const res = await resetUserPasswordAction(user.id, user.authId);
            setFeedback({ type: res.success ? "success" : "error", msg: res.message || res.error || "" });
            clearFeedback();
        });
    };

    return (
        <div className="flex items-center justify-end gap-2 flex-wrap">
            {feedback && (
                <span className={`text-xs ${feedback.type === "success" ? "text-emerald-600" : "text-red-600"}`}>
                    {feedback.msg}
                </span>
            )}

            {/* Tombol Edit */}
            <button
                onClick={() => setShowEditModal(true)}
                className="text-xs text-blue-600 hover:underline"
                disabled={isPending}
            >
                Edit
            </button>

            {/* Tombol Reset Password */}
            <button
                onClick={handleResetPassword}
                className="text-xs text-amber-600 hover:underline"
                disabled={isPending}
            >
                Reset PW
            </button>

            {/* Tombol Ubah Kelas (khusus siswa) */}
            {activeTab === "student" && studentProfileId && (
                <button
                    onClick={() => setShowClassModal(true)}
                    className="text-xs text-indigo-600 hover:underline"
                    disabled={isPending}
                >
                    Ubah Kelas
                </button>
            )}

            {/* Tombol Nonaktifkan/Aktifkan — disembunyikan untuk akun sendiri di UI */}
            {user.id !== currentAdminId && (
                <button
                    onClick={handleToggleActive}
                    className={`text-xs hover:underline ${user.isActive ? "text-red-600" : "text-emerald-600"}`}
                    disabled={isPending}
                >
                    {user.isActive ? "Nonaktifkan" : "Aktifkan"}
                </button>
            )}

            {/* Modal Edit (inline — sederhana dulu sesuai prioritas fungsional) */}
            {showEditModal && (
                <EditModal
                    user={user}
                    onClose={() => setShowEditModal(false)}
                />
            )}

            {/* Modal Ubah Kelas */}
            {showClassModal && studentProfileId && (
                <ChangeClassModal
                    studentProfileId={studentProfileId}
                    classLevels={classLevels}
                    onClose={() => setShowClassModal(false)}
                />
            )}
        </div>
    );
}

// Sub-komponen Modal Pindah Kelas
function ChangeClassModal({ studentProfileId, classLevels, onClose }: { studentProfileId: string; classLevels: ClassLevelOption[]; onClose: () => void }) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const newClassLevelId = formData.get("classLevelId") as string;

        if (!newClassLevelId) return;

        startTransition(async () => {
            const res = await updateStudentClassLevelAction(studentProfileId, newClassLevelId);
            if (res.success) {
                onClose();
            } else {
                setError(res.error || "Gagal menyimpan.");
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg w-full max-w-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-slate-900">Ubah Tingkatan Kelas</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg">&times;</button>
                </div>

                {error && <p className="text-red-600 text-sm">{error}</p>}

                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="text-xs font-medium text-slate-600">Pilih Tingkatan Baru</label>
                        <select name="classLevelId" required className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm mt-1">
                            <option value="">-- Pilih Tingkatan --</option>
                            {classLevels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose}
                            className="text-sm px-4 py-1.5 border border-slate-200 rounded-md text-slate-600">
                            Batal
                        </button>
                        <button type="submit" disabled={isPending}
                            className="text-sm px-4 py-1.5 bg-blue-600 text-white rounded-md disabled:opacity-50">
                            {isPending ? "Menyimpan..." : "Simpan"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Sub-komponen Modal Edit
function EditModal({ user, onClose }: { user: UserData; onClose: () => void }) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        startTransition(async () => {
            const res = await updateUserAccountAction(null, formData);
            if (res.success) {
                onClose();
            } else {
                setError(res.error || "Gagal menyimpan.");
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg w-full max-w-md p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-slate-900">Edit Pengguna: {user.name}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg">&times;</button>
                </div>

                {error && <p className="text-red-600 text-sm">{error}</p>}

                <form onSubmit={handleSubmit} className="space-y-3">
                    {/* userId harus selalu dikirim sebagai hidden field */}
                    <input type="hidden" name="userId" value={user.id} />

                    <div>
                        <label className="text-xs font-medium text-slate-600">Nama Lengkap</label>
                        <input name="name" defaultValue={user.name}
                            className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm mt-1" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-600">Email</label>
                        <input name="email" type="email" defaultValue={user.email}
                            className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm mt-1" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-600">Nomor HP</label>
                        <input name="phone" defaultValue={user.phone || ""}
                            className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm mt-1" />
                    </div>
                    {user.role === "tutor" && (
                        <div>
                            <label className="text-xs font-medium text-slate-600">Bio</label>
                            <textarea name="bio" defaultValue={user.bio || ""} rows={3}
                                className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm mt-1" />
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose}
                            className="text-sm px-4 py-1.5 border border-slate-200 rounded-md text-slate-600">
                            Batal
                        </button>
                        <button type="submit" disabled={isPending}
                            className="text-sm px-4 py-1.5 bg-blue-600 text-white rounded-md disabled:opacity-50">
                            {isPending ? "Menyimpan..." : "Simpan"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
