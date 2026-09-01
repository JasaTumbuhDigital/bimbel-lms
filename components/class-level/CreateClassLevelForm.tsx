"use client";

import { useActionState, useEffect, useRef } from "react";
import { createClassLevelAction } from "@/lib/actions/class-level";
import { ActionResult } from "@/types/action";

export default function CreateClassLevelForm() {
  const [state, formAction, isPending] = useActionState<ActionResult, FormData>(
    createClassLevelAction,
    { success: false }
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success && formRef.current) {
      formRef.current.reset();
    }
  }, [state.success]);

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
      <h2 className="text-base font-semibold text-slate-900">
        Tambah Tingkatan Kelas Baru
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

      <form ref={formRef} action={formAction} className="space-y-4 max-w-lg">
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
            Nama Kelas / Tingkatan *
          </label>
          <input
            name="name"
            type="text"
            required
            placeholder="Contoh: 10 SMA, 11 SMA, 12 UTBK"
            className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          {state.fieldErrors?.name && (
            <p className="text-xs text-red-600">{state.fieldErrors.name[0]}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
            Deskripsi (Opsional)
          </label>
          <input
            name="description"
            type="text"
            placeholder="Contoh: Kurikulum Merdeka Fase E"
            className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            id="isDefault"
            name="isDefault"
            type="checkbox"
            value="true"
            className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="isDefault" className="text-xs text-slate-700 font-medium">
            Jadikan kelas bawaan default saat pendaftaran siswa baru
          </label>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors text-sm disabled:opacity-50"
        >
          {isPending ? "Menyimpan..." : "Simpan Tingkatan Kelas"}
        </button>
      </form>
    </section>
  );
}
