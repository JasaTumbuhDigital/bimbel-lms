"use client";

import { useTransition, useState } from "react";
import { toast } from "sonner";
import { deleteClassLevelAction } from "@/lib/actions/class-level";
import { Spinner } from "@/components/ui/skeletons";

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
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = () => {
    if (studentCount > 0) {
      toast.error(
        `Gagal menghapus! Masih terdapat ${studentCount} siswa aktif yang terdaftar di tingkatan kelas "${name}". Pindahkan siswa ke kelas lain terlebih dahulu.`
      );
      return;
    }

    setShowConfirm(true);
  };

  const executeDelete = () => {
    startTransition(async () => {
      const res = await deleteClassLevelAction(id);
      if (!res.success) {
        toast.error(res.error || "Gagal menghapus tingkatan kelas.");
      } else {
        toast.success("Tingkatan kelas berhasil dihapus");
        setShowConfirm(false);
      }
    });
  };

  return (
    <div className="inline-flex flex-col items-end relative">
      <button
        type="button"
        disabled={isPending}
        onClick={handleDelete}
        className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
      >
        Hapus
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg w-full max-w-sm p-6 space-y-4 shadow-xl border border-slate-200">
            <h2 className="font-semibold text-slate-900">Hapus Tingkatan Kelas</h2>
            <p className="text-sm text-slate-600">
              Apakah Anda yakin ingin menghapus tingkatan kelas &quot;{name}&quot;?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isPending}
                className="text-sm px-4 py-1.5 border border-slate-200 rounded-md text-slate-600"
              >
                Batal
              </button>
              <button
                onClick={executeDelete}
                disabled={isPending}
                className="text-sm px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isPending ? <><Spinner className="w-3 h-3" /> Menghapus...</> : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
