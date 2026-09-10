"use client";

import { useState, useTransition, useMemo } from "react";
import { toast } from "sonner";
import {
    adminEnrollStudentsAction,
    adminBulkEnrollByClassAction,
    adminUnenrollStudentAction,
} from "@/lib/actions/enrollment";
import { Spinner } from "@/components/ui/skeletons";
import { Users, UserPlus, Trash2, Search, ChevronDown, ChevronUp } from "lucide-react";

type Student = {
    studentProfileId: string;
    userId: string;
    name: string;
    email: string;
    classLevelId: string;
    classLevelName: string;
};

type ClassLevel = {
    id: string;
    name: string;
    unenrolledCount: number;
};

type EnrollmentData = {
    courseId: string;
    enrolledStudents: Student[];
    unenrolledStudents: Student[];
    classLevels: ClassLevel[];
};

export default function CourseEnrollmentTab({
    initialData,
}: {
    initialData: EnrollmentData;
}) {
    const [data, setData] = useState<EnrollmentData>(initialData);

    // --- Bulk Enroll by Class ---
    const [selectedBulkClassIds, setSelectedBulkClassIds] = useState<string[]>([]);
    const [isBulkPending, startBulkTransition] = useTransition();

    // --- Individual Enroll ---
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [studentSearch, setStudentSearch] = useState("");
    const [isEnrollPending, startEnrollTransition] = useTransition();

    // --- Unenroll ---
    const [unenrollPendingId, setUnenrollPendingId] = useState<string | null>(null);
    const [enrolledSearch, setEnrolledSearch] = useState("");

    // --- Collapse states ---
    const [showEnrollSection, setShowEnrollSection] = useState(false);

    // Filter unenrolled students by search
    const filteredUnenrolled = useMemo(() => {
        if (!studentSearch) return data.unenrolledStudents;
        const q = studentSearch.toLowerCase();
        return data.unenrolledStudents.filter(
            (s) =>
                s.name.toLowerCase().includes(q) ||
                s.email.toLowerCase().includes(q) ||
                s.classLevelName.toLowerCase().includes(q)
        );
    }, [data.unenrolledStudents, studentSearch]);

    // Filter enrolled students by search
    const filteredEnrolled = useMemo(() => {
        if (!enrolledSearch) return data.enrolledStudents;
        const q = enrolledSearch.toLowerCase();
        return data.enrolledStudents.filter(
            (s) =>
                s.name.toLowerCase().includes(q) ||
                s.email.toLowerCase().includes(q) ||
                s.classLevelName.toLowerCase().includes(q)
        );
    }, [data.enrolledStudents, enrolledSearch]);

    const handleBulkClassToggle = (id: string) => {
        setSelectedBulkClassIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const handleStudentToggle = (id: string) => {
        setSelectedStudentIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const handleBulkEnrollByClass = () => {
        if (selectedBulkClassIds.length === 0) {
            toast.error("Pilih minimal satu kelas terlebih dahulu.");
            return;
        }

        startBulkTransition(async () => {
            const res = await adminBulkEnrollByClassAction(data.courseId, selectedBulkClassIds);
            if (res.success) {
                toast.success(res.message);
                // Reload data setelah enroll berhasil
                window.location.reload();
            } else {
                toast.error(res.error);
            }
        });
    };

    const handleEnrollSelected = () => {
        if (selectedStudentIds.length === 0) {
            toast.error("Pilih minimal satu siswa terlebih dahulu.");
            return;
        }

        startEnrollTransition(async () => {
            const res = await adminEnrollStudentsAction(data.courseId, selectedStudentIds);
            if (res.success) {
                toast.success(res.message);
                window.location.reload();
            } else {
                toast.error(res.error);
            }
        });
    };

    const handleUnenroll = (student: Student) => {
        if (!confirm(`Yakin ingin mengeluarkan "${student.name}" dari kursus ini?\nProgres belajarnya tetap akan tersimpan.`)) return;

        setUnenrollPendingId(student.studentProfileId);
        adminUnenrollStudentAction(data.courseId, student.studentProfileId).then((res) => {
            setUnenrollPendingId(null);
            if (res.success) {
                toast.success(res.message);
                // Update local state tanpa reload penuh
                setData((prev) => ({
                    ...prev,
                    enrolledStudents: prev.enrolledStudents.filter(
                        (s) => s.studentProfileId !== student.studentProfileId
                    ),
                    unenrolledStudents: [...prev.unenrolledStudents, student].sort((a, b) =>
                        a.name.localeCompare(b.name)
                    ),
                    classLevels: prev.classLevels.map((cl) =>
                        cl.id === student.classLevelId
                            ? { ...cl, unenrolledCount: cl.unenrolledCount + 1 }
                            : cl
                    ),
                }));
            } else {
                toast.error(res.error);
            }
        });
    };

    const classesWithUnenrolled = data.classLevels.filter((cl) => cl.unenrolledCount > 0);

    return (
        <div className="space-y-8">
            {/* ── SECTION 1: PESERTA AKTIF ── */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        <h3 className="font-semibold text-slate-800 text-sm">
                            Peserta Aktif
                        </h3>
                        <span className="ml-1 bg-blue-100 text-blue-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                            {data.enrolledStudents.length}
                        </span>
                    </div>
                    {/* Search enrolled */}
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Cari siswa..."
                            value={enrolledSearch}
                            onChange={(e) => setEnrolledSearch(e.target.value)}
                            className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300 w-48"
                        />
                    </div>
                </div>

                {filteredEnrolled.length === 0 ? (
                    <div className="px-6 py-10 text-center text-slate-400 text-sm">
                        {data.enrolledStudents.length === 0
                            ? "Belum ada siswa yang terdaftar di kursus ini."
                            : "Tidak ada siswa yang cocok dengan pencarian."}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nama</th>
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Kelas</th>
                                    <th className="px-4 py-2.5"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredEnrolled.map((student) => (
                                    <tr key={student.studentProfileId} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-3 font-medium text-slate-800">{student.name}</td>
                                        <td className="px-4 py-3 text-slate-500">{student.email}</td>
                                        <td className="px-4 py-3">
                                            <span className="bg-slate-100 text-slate-600 text-[11px] font-medium px-2 py-0.5 rounded-full">
                                                {student.classLevelName}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => handleUnenroll(student)}
                                                disabled={unenrollPendingId === student.studentProfileId}
                                                className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors disabled:opacity-50"
                                                title="Keluarkan siswa dari kursus"
                                            >
                                                {unenrollPendingId === student.studentProfileId ? (
                                                    <Spinner />
                                                ) : (
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                )}
                                                Keluarkan
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── SECTION 2: DAFTARKAN SISWA ── */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                <button
                    type="button"
                    onClick={() => setShowEnrollSection((v) => !v)}
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors border-b border-slate-100"
                >
                    <div className="flex items-center gap-2">
                        <UserPlus className="w-4 h-4 text-green-600" />
                        <h3 className="font-semibold text-slate-800 text-sm">Daftarkan Siswa Baru</h3>
                        {data.unenrolledStudents.length > 0 && (
                            <span className="ml-1 bg-green-100 text-green-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                                {data.unenrolledStudents.length} tersedia
                            </span>
                        )}
                    </div>
                    {showEnrollSection ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                </button>

                {showEnrollSection && (
                    <div className="p-6 space-y-6">
                        {/* ─ 2a: Bulk Enroll by Class ─ */}
                        <div>
                            <h4 className="text-sm font-semibold text-slate-700 mb-1">Daftarkan Satu Kelas Sekaligus</h4>
                            <p className="text-xs text-slate-500 mb-3">
                                Pilih tingkatan kelas — semua siswa di kelas tersebut yang belum terdaftar akan didaftarkan secara otomatis.
                            </p>

                            {classesWithUnenrolled.length === 0 ? (
                                <p className="text-xs text-slate-400 italic">Semua siswa dari kelas yang terhubung sudah terdaftar.</p>
                            ) : (
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {classesWithUnenrolled.map((cl) => {
                                        const isSelected = selectedBulkClassIds.includes(cl.id);
                                        return (
                                            <button
                                                key={cl.id}
                                                type="button"
                                                onClick={() => handleBulkClassToggle(cl.id)}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${isSelected
                                                    ? "bg-green-600 text-white border-green-600"
                                                    : "bg-white text-slate-700 border-slate-300 hover:border-green-400"
                                                    }`}
                                            >
                                                {cl.name}
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isSelected ? "bg-green-500 text-white" : "bg-slate-100 text-slate-500"}`}>
                                                    {cl.unenrolledCount}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {classesWithUnenrolled.length > 0 && (
                                <button
                                    type="button"
                                    onClick={handleBulkEnrollByClass}
                                    disabled={isBulkPending || selectedBulkClassIds.length === 0}
                                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                                >
                                    {isBulkPending ? <Spinner /> : <UserPlus className="w-3.5 h-3.5" />}
                                    Daftarkan Kelas Terpilih
                                    {selectedBulkClassIds.length > 0 && (
                                        <span className="bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                                            {selectedBulkClassIds.length} kelas
                                        </span>
                                    )}
                                </button>
                            )}
                        </div>

                        <div className="border-t border-slate-100 pt-6">
                            {/* ─ 2b: Individual Enroll ─ */}
                            <h4 className="text-sm font-semibold text-slate-700 mb-1">Daftarkan Siswa Individu</h4>
                            <p className="text-xs text-slate-500 mb-3">
                                Cari dan centang siswa yang ingin didaftarkan, lalu klik tombol daftarkan.
                            </p>

                            {/* Search */}
                            <div className="relative mb-3">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Cari nama, email, atau kelas..."
                                    value={studentSearch}
                                    onChange={(e) => setStudentSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                                />
                            </div>

                            {filteredUnenrolled.length === 0 ? (
                                <p className="text-xs text-slate-400 italic py-4 text-center">
                                    {data.unenrolledStudents.length === 0
                                        ? "Semua siswa yang tersedia sudah terdaftar di kursus ini."
                                        : "Tidak ada siswa yang cocok dengan pencarian."}
                                </p>
                            ) : (
                                <>
                                    {/* Select all toggle */}
                                    <div className="flex items-center gap-2 mb-2 px-2">
                                        <input
                                            type="checkbox"
                                            id="selectAll"
                                            checked={
                                                filteredUnenrolled.length > 0 &&
                                                filteredUnenrolled.every((s) =>
                                                    selectedStudentIds.includes(s.studentProfileId)
                                                )
                                            }
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedStudentIds((prev) => [
                                                        ...new Set([
                                                            ...prev,
                                                            ...filteredUnenrolled.map((s) => s.studentProfileId),
                                                        ]),
                                                    ]);
                                                } else {
                                                    const filteredIds = new Set(filteredUnenrolled.map((s) => s.studentProfileId));
                                                    setSelectedStudentIds((prev) =>
                                                        prev.filter((id) => !filteredIds.has(id))
                                                    );
                                                }
                                            }}
                                            className="accent-blue-600"
                                        />
                                        <label htmlFor="selectAll" className="text-xs text-slate-500 cursor-pointer">
                                            Pilih semua ({filteredUnenrolled.length} siswa)
                                        </label>
                                    </div>

                                    {/* Student list */}
                                    <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-50">
                                        {filteredUnenrolled.map((student) => {
                                            const isChecked = selectedStudentIds.includes(student.studentProfileId);
                                            return (
                                                <label
                                                    key={student.studentProfileId}
                                                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors ${isChecked ? "bg-blue-50" : ""}`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => handleStudentToggle(student.studentProfileId)}
                                                        className="accent-blue-600 shrink-0"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-slate-800 truncate">{student.name}</p>
                                                        <p className="text-xs text-slate-400 truncate">{student.email}</p>
                                                    </div>
                                                    <span className="text-[11px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full shrink-0">
                                                        {student.classLevelName}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </>
                            )}

                            {selectedStudentIds.length > 0 && (
                                <div className="mt-4 flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={handleEnrollSelected}
                                        disabled={isEnrollPending}
                                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                                    >
                                        {isEnrollPending ? <Spinner /> : <UserPlus className="w-3.5 h-3.5" />}
                                        Daftarkan {selectedStudentIds.length} Siswa
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedStudentIds([])}
                                        className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
                                    >
                                        Batal pilih
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
