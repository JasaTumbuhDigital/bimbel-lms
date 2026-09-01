"use client";

import { useTransition, useState } from "react";
import { deleteClassLevelAction } from "@/lib/actions/class-level";

export default function DeleteClassLevelButton({
  id,
  name,
  studentCount,
}: {
  id: string;
  name: string;
  studentCount: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    if (studentCount > 0) {
      alert(
        `Gagal menghapus! Masih terdapat ${studentCount} siswa aktif yang terdaftar di tingkatan kelas "${name}". Pindahkan siswa ke kelas lain terlebih dahulu.`
      );
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus tingkatan kelas "${name}"?`)) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const res = await deleteClassLevelAction(id);
      if (!res.success) {
        setError(res.error || "Gagal menghapus tingkatan kelas.");
      }
    });
  };

  return (
    <div className="inline-flex flex-col items-end">
      <button
        type="button"
        disabled={isPending}
        onClick={handleDelete}
        className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
      >
        {isPending ? "Hapus..." : "Hapus"}
      </button>
      {error && (
        <span className="text-[10px] text-red-600 mt-1 max-w-[150px] text-right">
          {error}
        </span>
      )}
    </div>
  );
}
