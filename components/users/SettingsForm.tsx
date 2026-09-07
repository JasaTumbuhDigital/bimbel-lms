"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/lib/actions/user";
import { ActionResult } from "@/types/action";

type SettingsFormProps = {
    user: {
        name: string;
        phone: string | null;
    }
};

export default function SettingsForm({ user }: SettingsFormProps) {
    const [state, formAction, isPending] = useActionState<ActionResult, FormData>(
        updateProfileAction,
        { success: false }
    );

    return (
        <form action={formAction} className="space-y-4 max-w-md">
            {state.message && (
                <div className="p-3 bg-green-100 text-green-700 rounded-md text-sm">
                    {state.message}
                </div>
            )}

            {state.error && (
                <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">
                    {state.error}
                </div>
            )}

            <div className="space-y-1">
                <label htmlFor="name" className="text-sm font-medium">Nama Lengkap</label>
                <input
                    type="text"
                    id="name"
                    name="name"
                    defaultValue={user.name}
                    className="w-full p-2 border rounded-md"
                    required
                />
                {state.fieldErrors?.name && (
                    <p className="text-red-500 text-xs">{state.fieldErrors.name[0]}</p>
                )}
            </div>

            <div className="space-y-1">
                <label htmlFor="phone" className="text-sm font-medium">Nomor HP</label>
                <input
                    type="text"
                    id="phone"
                    name="phone"
                    defaultValue={user.phone || ""}
                    className="w-full p-2 border rounded-md"
                />
                {state.fieldErrors?.phone && (
                    <p className="text-red-500 text-xs">{state.fieldErrors.phone[0]}</p>
                )}
            </div>

            <button
                type="submit"
                disabled={isPending}
                className="w-full bg-blue-600 text-white p-2 rounded-md disabled:opacity-50"
            >
                {isPending ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
        </form>
    );
}
