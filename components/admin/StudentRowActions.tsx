"use client";

import { useTransition, useState } from "react";
import {
  updateStudentClassLevelAction,
  resetStudentPasswordAction,
} from "@/lib/actions/auth";

type ClassLevelOption = {
  id: string;
  name: string;
};

export default function StudentRowActions({
  studentId,
  authId,
  studentProfileId,
  currentClassLevelId,
  classLevels,
}: {
  studentId: string;
  authId: string;
  studentProfileId: string;
  currentClassLevelId: string;
  classLevels: ClassLevelOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClassChange = (newClassLevelId: string) => {
    if (newClassLevelId === currentClassLevelId) return;

    setMessage(null);
    setError(null);

    startTransition(async () => {
      const res = await updateStudentClassLevelAction(
        studentProfileId,
        newClassLevelId
      );
      if (res.success) {
        setMessage("Kelas diperbarui");
        setTimeout(() => setMessage(null), 3000);
      } else {
        setError(res.error || "Gagal memperbarui kelas");
      }
    });
  };

  const handleResetPassword = () => {
    if (
      !confirm(
        "Apakah Anda yakin ingin mereset password siswa ini menjadi 'Password123'?"
      )
    ) {
      return;
    }

    setMessage(null);
    setError(null);

    startTransition(async () => {
      const res = await resetStudentPasswordAction(studentId, authId);
      if (res.success) {
        setMessage(res.message || "Password direset");
        setTimeout(() => setMessage(null), 4000);
      } else {
        setError(res.error || "Gagal mereset password");
      }
    });
  };

  return (
    <div className="flex flex-col gap-1 items-end">
      <div className="flex items-center gap-2">
        {/* Dropdown Pindah Kelas */}
        <select
          disabled={isPending}
          value={currentClassLevelId}
          onChange={(e) => handleClassChange(e.target.value)}
          className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:opacity-50"
        >
          {classLevels.map((lvl) => (
            <option key={lvl.id} value={lvl.id}>
              {lvl.name}
            </option>
          ))}
        </select>

        {/* Tombol Reset Password */}
        <button
          type="button"
          disabled={isPending}
          onClick={handleResetPassword}
          className="text-xs text-amber-700 hover:text-amber-900 border border-amber-300 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded transition-colors disabled:opacity-50 font-medium"
        >
          Reset PW
        </button>
      </div>

      {/* Feedback Pesan */}
      {message && (
        <span className="text-[10px] text-emerald-600 font-medium">
          {message}
        </span>
      )}
      {error && (
        <span className="text-[10px] text-red-600 font-medium">{error}</span>
      )}
    </div>
  );
}
