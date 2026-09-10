"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
    updateCourseAccessAction,
    archiveCourseAction,
    unarchiveCourseAction,
} from "@/lib/actions/course";
import { Spinner } from "@/components/ui/skeletons";

export default function CourseAccessTab({
    course,
    availableClassLevels,
    availableTutors
}: {
    course: any;
    availableClassLevels: any[];
    availableTutors: any[];
}) {
    const [isPending, startTransition] = useTransition();
    const [isArchivePending, startArchiveTransition] = useTransition();

    const [isPublished, setIsPublished] = useState(course.isPublished);
    const [isArchived, setIsArchived] = useState(course.isArchived ?? false);
    const [visibleToAllLevels, setVisibleToAllLevels] = useState(course.visibleToAllLevels);

    // Existing selected levels and tutors from course data
    const existingLevelIds = course.classLevels?.map((cl: any) => cl.classLevelId) || [];
    const [selectedLevelIds, setSelectedLevelIds] = useState<string[]>(existingLevelIds);

    const existingTutorIds = course.tutors?.map((t: any) => t.tutorProfileId) || [];
    const [selectedTutorIds, setSelectedTutorIds] = useState<string[]>(existingTutorIds);

    const handleLevelToggle = (id: string) => {
        setSelectedLevelIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleTutorToggle = (id: string) => {
        setSelectedTutorIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        startTransition(async () => {
            const formData = new FormData();
            formData.append("isPublished", isPublished ? "true" : "false");
            formData.append("visibleToAllLevels", visibleToAllLevels ? "true" : "false");

            selectedLevelIds.forEach(id => formData.append("classLevelIds", id));
            selectedTutorIds.forEach(id => formData.append("tutorProfileIds", id));

            const res = await updateCourseAccessAction(course.id, null, formData);
            if (res.success) {
                toast.success(res.message);
            } else {
                toast.error(res.error);
            }
        });
    };

    const handleToggleArchive = () => {
        const isCurrentlyArchived = isArchived;
        const confirmMessage = isCurrentlyArchived
            ? "Yakin ingin memulihkan kursus ini dari arsip?"
            : "Yakin ingin mengarsipkan kursus ini? Kursus akan disembunyikan dari siswa dan katalog publik.";

        if (!confirm(confirmMessage)) return;

        startArchiveTransition(async () => {
            const res = isCurrentlyArchived
                ? await unarchiveCourseAction(course.id)
                : await archiveCourseAction(course.id);

            if (res.success) {
                setIsArchived(!isCurrentlyArchived);
                toast.success(res.message);
            } else {
                toast.error(res.error);
            }
        });
    };

    return (
        <div className="max-w-3xl space-y-8">
            <form onSubmit={handleSubmit} className="space-y-8 bg-white border border-slate-200 p-6 rounded-md shadow-sm">
                {/* Publikasi */}
                <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-3 border-b pb-2">Status Publikasi</h3>
                    <div className="flex items-center gap-3">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={isPublished}
                                onChange={(e) => setIsPublished(e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            <span className="ml-3 text-sm font-medium text-slate-700">
                                {isPublished ? "Terpublikasi (Bisa dilihat & diikuti)" : "Draft (Disembunyikan dari siswa)"}
                            </span>
                        </label>
                    </div>
                </div>

                {/* Target Kelas */}
                <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-3 border-b pb-2">Akses Tingkatan Kelas</h3>
                    <p className="text-sm text-slate-600 mb-4">Pilih tingkatan kelas mana saja yang dapat mengakses kursus ini.</p>

                    <label className="flex items-center gap-2 mb-4 bg-slate-50 p-3 rounded-md border border-slate-200">
                        <input
                            type="checkbox"
                            checked={visibleToAllLevels}
                            onChange={(e) => setVisibleToAllLevels(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-slate-800">Buka untuk Semua Tingkatan (Universal)</span>
                    </label>

                    {!visibleToAllLevels && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-2">
                            {availableClassLevels.map(cl => (
                                <label key={cl.id} className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={selectedLevelIds.includes(cl.id)}
                                        onChange={() => handleLevelToggle(cl.id)}
                                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-slate-700">{cl.name}</span>
                                </label>
                            ))}
                            {availableClassLevels.length === 0 && (
                                <p className="text-sm text-slate-500 italic">Belum ada data tingkatan kelas.</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Tutor Pengampu */}
                <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-3 border-b pb-2">Penugasan Tutor (Co-teaching)</h3>
                    <p className="text-sm text-slate-600 mb-4">Tutor yang dipilih di sini akan memiliki hak untuk mengubah modul dan materi pada kursus ini.</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-2">
                        {availableTutors.map(tutor => (
                            <label key={tutor.id} className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={selectedTutorIds.includes(tutor.id)}
                                    disabled={tutor.user.id === course.createdBy}
                                    onChange={() => handleTutorToggle(tutor.id)}
                                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 disabled:opacity-50"
                                />
                                <span className={`text-sm ${tutor.user.id === course.createdBy ? 'text-slate-500 font-medium' : 'text-slate-700'}`}>
                                    {tutor.user.name} {tutor.user.id === course.createdBy && "(Tutor Utama)"}
                                </span>
                            </label>
                        ))}
                        {availableTutors.length === 0 && (
                            <p className="text-sm text-slate-500 italic">Belum ada akun Tutor yang terdaftar.</p>
                        )}
                    </div>
                </div>

                <div className="pt-4 flex gap-3 border-t border-slate-100">
                    <button
                        type="submit"
                        disabled={isPending}
                        className="bg-blue-600 text-white px-5 py-2 text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                    >
                        {isPending ? <><Spinner /> Menyimpan...</> : "Simpan Pengaturan Akses"}
                    </button>
                </div>
            </form>

            {/* Zona Arsip Kursus */}
            <div className="bg-white border border-slate-200 p-6 rounded-md shadow-sm">
                <h3 className="text-base font-semibold text-slate-800 mb-2">Manajemen Status Kursus</h3>
                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                    {isArchived
                        ? "Kursus ini saat ini berstatus DIARSIPKAN. Kursus disembunyikan dari katalog publik dan proses pembelajaran siswa dihentikan."
                        : "Mengarsipkan kursus akan menyembunyikannya dari siswa dan katalog publik tanpa menghapus data modul maupun materi. Kursus dapat dipulihkan sewaktu-waktu."}
                </p>

                <div className="p-4 rounded-lg border bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="text-sm font-semibold text-slate-800">
                            Status Saat Ini:{" "}
                            <span className={isArchived ? "text-amber-600" : "text-green-600"}>
                                {isArchived ? "Diarsipkan" : "Aktif"}
                            </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                            {isArchived
                                ? "Klik tombol pulihkan untuk mengaktifkan kembali kursus ini."
                                : "Arsipkan kursus jika sudah tidak lagi diajarkan pada periode ini."}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleToggleArchive}
                        disabled={isArchivePending}
                        className={`text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-50 shrink-0 ${isArchived
                                ? "bg-green-600 hover:bg-green-700 text-white"
                                : "bg-red-600 hover:bg-red-700 text-white"
                            }`}
                    >
                        {isArchivePending
                            ? (isArchived ? "Memulihkan..." : "Mengarsipkan...")
                            : (isArchived ? "Pulihkan Kursus" : "Arsipkan Kursus Ini")}
                    </button>
                </div>
            </div>
        </div>
    );
}
