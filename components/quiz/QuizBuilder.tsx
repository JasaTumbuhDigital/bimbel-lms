"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveQuizQuestionAction, deleteQuizQuestionAction } from "@/lib/actions/quiz";

export default function QuizBuilderModal({
    quiz,
    onClose
}: {
    quiz: any,
    onClose: () => void
}) {
    const [isPending, startTransition] = useTransition();

    // State untuk visibility Form Soal
    const [isFormOpen, setIsFormOpen] = useState(false);

    // State untuk isi Form Soal
    const [editQuestionId, setEditQuestionId] = useState<string | null>(null);
    const [questionText, setQuestionText] = useState("");
    const [options, setOptions] = useState<{ id?: string; optionText: string; isCorrect: boolean }[]>([
        { optionText: "", isCorrect: false },
        { optionText: "", isCorrect: false }
    ]);

    // --- HANDLERS UNTUK MEMBUKA FORM ---
    const openAddForm = () => {
        setEditQuestionId(null);
        setQuestionText("");
        setOptions([
            { optionText: "", isCorrect: false },
            { optionText: "", isCorrect: false }
        ]);
        setIsFormOpen(true);
    };

    const openEditForm = (q: any) => {
        setEditQuestionId(q.id);
        setQuestionText(q.questionText);
        // Copy array agar tidak merubah state props secara langsung
        setOptions(q.options.map((opt: any) => ({ ...opt })));
        setIsFormOpen(true);
    };

    // --- HANDLERS UNTUK OPSI JAWABAN (DINAMIS) ---
    const handleAddOption = () => {
        setOptions([...options, { optionText: "", isCorrect: false }]);
    };

    const handleRemoveOption = (indexToRemove: number) => {
        if (options.length <= 2) {
            toast.error("Setiap soal minimal harus memiliki 2 opsi jawaban.");
            return;
        }
        setOptions(options.filter((_, idx) => idx !== indexToRemove));
    };

    const handleOptionChange = (index: number, field: "optionText" | "isCorrect", value: any) => {
        const newOptions = [...options];
        newOptions[index] = { ...newOptions[index], [field]: value };
        setOptions(newOptions);
    };

    // --- HANDLERS UNTUK MENYIMPAN/MENGHAPUS SOAL KE DB ---
    const handleSaveQuestion = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validasi sederhana di sisi client
        if (!questionText.trim()) return toast.error("Soal tidak boleh kosong");
        if (options.some(opt => !opt.optionText.trim())) return toast.error("Ada opsi jawaban yang masih kosong");
        if (!options.some(opt => opt.isCorrect)) return toast.error("Pilih minimal 1 jawaban yang benar");

        startTransition(async () => {
            const payload = {
                quizId: quiz.id,
                questionId: editQuestionId || undefined,
                questionText,
                options
            };

            const formData = new FormData();
            formData.append("payload", JSON.stringify(payload)); // Kita kirim sebagai JSON string

            const res = await saveQuizQuestionAction(null, formData);
            if (res.success) {
                toast.success(res.message);
                setIsFormOpen(false); // Tutup form kalau sukses
            } else {
                toast.error(res.error || "Gagal menyimpan soal");
            }
        });
    };

    const handleDeleteQuestion = async (id: string) => {
        if (!confirm("Yakin ingin menghapus soal ini beserta semua opsinya?")) return;
        startTransition(async () => {
            const res = await deleteQuizQuestionAction(id);
            if (res.success) {
                toast.success(res.message);
            } else {
                toast.error(res.error || "Gagal menghapus soal");
            }
        });
    };

    return (
        <div className="flex flex-col relative w-full bg-white">
            {!isFormOpen ? (
                /* Konten (List Soal) */
                <div className="p-5 flex-1 relative">
                    <div className="flex justify-between items-center mb-5 border-b border-gray-100 pb-3">
                        <h3 className="font-semibold text-gray-800 text-sm">Daftar Soal ({quiz.questions?.length || 0})</h3>
                        <button
                            onClick={openAddForm}
                            type="button"
                            className="bg-purple-600 text-white px-3 py-1.5 rounded text-xs hover:bg-purple-700 font-medium transition-colors"
                        >
                            + Tambah Soal
                        </button>
                    </div>

                    {quiz.questions?.length === 0 ? (
                        <div className="text-center p-12 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 bg-white">
                            Belum ada soal. Klik "+ Tambah Soal" untuk mulai membuat.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {quiz.questions?.map((q: any, i: number) => (
                                <div key={q.id} className="border border-gray-200 p-5 rounded-md shadow-sm bg-white">
                                    <div className="flex justify-between items-start mb-3">
                                        <p className="font-medium text-sm text-gray-800 whitespace-pre-wrap">
                                            <span className="text-gray-400 mr-2">{i + 1}.</span>
                                            {q.questionText}
                                        </p>
                                        <div className="flex gap-3 ml-4 shrink-0">
                                            <button onClick={() => openEditForm(q)} disabled={isPending} className="text-xs font-medium text-blue-600 hover:underline">Edit</button>
                                            <button onClick={() => handleDeleteQuestion(q.id)} disabled={isPending} className="text-xs font-medium text-red-600 hover:underline">Hapus</button>
                                        </div>
                                    </div>

                                    {/* List Opsi Jawaban */}
                                    <div className="pl-6 space-y-1.5 mt-4">
                                        {q.options?.map((opt: any) => (
                                            <div key={opt.id} className={`text-xs p-2.5 rounded-md flex items-start gap-2 ${opt.isCorrect ? 'bg-green-50 border border-green-200 text-green-900 font-medium' : 'bg-gray-50 border border-gray-100 text-gray-600'}`}>
                                                <span>{opt.isCorrect ? "✅" : "⚪"}</span>
                                                <span className="mt-0.5">{opt.optionText}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                /* Form Editor Soal */
                <div className="flex flex-col w-full animate-in fade-in duration-200">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-purple-50/30">
                        <h3 className="font-semibold text-sm text-gray-800">{editQuestionId ? "Edit Soal" : "Buat Soal Baru"}</h3>
                        <button type="button" onClick={() => setIsFormOpen(false)} className="text-gray-500 hover:text-gray-800 font-medium text-xs">
                            ✕ Batal
                        </button>
                    </div>

                    <form onSubmit={handleSaveQuestion} className="p-5 flex flex-col w-full">
                            <div className="space-y-6">

                                {/* Input Teks Soal */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Pertanyaan</label>
                                    <textarea
                                        required
                                        rows={4}
                                        value={questionText}
                                        onChange={(e) => setQuestionText(e.target.value)}
                                        placeholder="Ketik pertanyaan di sini..."
                                        className="w-full p-3 border border-gray-300 rounded-md text-sm focus:ring-purple-500 focus:border-purple-500"
                                    />
                                </div>

                                {/* Dynamic Opsi Jawaban */}
                                <div>
                                    <div className="flex justify-between items-end mb-2">
                                        <label className="block text-sm font-medium text-gray-700">Opsi Jawaban</label>
                                        <span className="text-xs text-gray-500">Centang kotak untuk opsi yang benar (Bisa lebih dari 1)</span>
                                    </div>

                                    <div className="space-y-3">
                                        {options.map((opt, index) => (
                                            <div key={index} className={`flex items-start gap-3 p-3 border rounded-md ${opt.isCorrect ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'}`}>

                                                {/* Checkbox Benar/Salah */}
                                                <div className="pt-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={opt.isCorrect}
                                                        onChange={(e) => handleOptionChange(index, "isCorrect", e.target.checked)}
                                                        className="w-5 h-5 text-green-600 rounded border-gray-300 focus:ring-green-500 cursor-pointer"
                                                    />
                                                </div>

                                                {/* Textarea Opsi */}
                                                <div className="flex-1">
                                                    <textarea
                                                        required
                                                        rows={2}
                                                        value={opt.optionText}
                                                        onChange={(e) => handleOptionChange(index, "optionText", e.target.value)}
                                                        placeholder={`Opsi ${String.fromCharCode(65 + index)}`}
                                                        className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-purple-500 focus:border-purple-500"
                                                    />
                                                </div>

                                                {/* Tombol Hapus Opsi */}
                                                <div className="pt-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveOption(index)}
                                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                                                        title="Hapus opsi ini"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleAddOption}
                                        className="mt-3 text-sm text-purple-600 font-medium hover:text-purple-800 flex items-center gap-1"
                                    >
                                        <span>+</span> Tambah Opsi Jawaban Lainnya
                                    </button>
                                </div>
                            </div>

                            {/* Tombol Aksi Form */}
                            <div className="mt-8 pt-4 border-t flex justify-end gap-3 shrink-0 pb-10">
                                <button
                                    type="button"
                                    disabled={isPending}
                                    onClick={() => setIsFormOpen(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium text-sm"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="px-4 py-2 bg-purple-600 rounded-md text-white hover:bg-purple-700 font-medium text-sm flex items-center gap-2 disabled:opacity-70"
                                >
                                    {isPending ? "Menyimpan..." : "Simpan Soal"}
                                </button>
                            </div>
                        </form>
                    </div>
            )}
        </div>
    );
}
