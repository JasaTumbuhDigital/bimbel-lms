"use client";

import { useState, useTransition } from "react";
import { submitQuizAttemptAction } from "@/lib/actions/quiz";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function StudentQuizClient({ quiz, courseId }: { quiz: any, courseId: string }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    // Map untuk menyimpan jawaban { questionId: string[] } (array of selected option IDs)
    const [answers, setAnswers] = useState<Record<string, string[]>>({});
    
    // Status setelah disubmit
    const [result, setResult] = useState<any>(null);

    const handleOptionToggle = (questionId: string, optionId: string) => {
        if (result) return; // Kalau sudah disubmit, tidak bisa diubah

        setAnswers(prev => {
            const currentSelected = prev[questionId] || [];
            if (currentSelected.includes(optionId)) {
                return { ...prev, [questionId]: currentSelected.filter(id => id !== optionId) };
            } else {
                return { ...prev, [questionId]: [...currentSelected, optionId] };
            }
        });
    };

    const handleSubmit = async () => {
        // Validasi: pastikan semua soal dijawab minimal 1 opsi
        const unanswered = quiz.questions.filter((q: any) => !answers[q.id] || answers[q.id].length === 0);
        if (unanswered.length > 0) {
            toast.error(`Masih ada ${unanswered.length} soal yang belum dijawab.`);
            return;
        }

        if (!confirm("Kumpulkan jawaban sekarang? Anda tidak bisa mengubah jawaban setelah ini.")) return;

        startTransition(async () => {
            const payload = {
                quizId: quiz.id,
                answers: Object.entries(answers).map(([questionId, selectedOptionIds]) => ({
                    questionId,
                    selectedOptionIds
                }))
            };

            const res = await submitQuizAttemptAction(null, payload);
            if (res.success) {
                toast.success(res.message);
                setResult(res.data);
                // Refresh data background agar sidebar update progres kuis (checklist hijau)
                router.refresh();
            } else {
                toast.error(res.error || "Gagal mengumpulkan kuis");
            }
        });
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8">
            <div className="mb-8 border-b pb-6">
                <h1 className="text-2xl font-bold text-slate-900 mb-2">{quiz.title}</h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                    <div className="bg-purple-50 text-purple-700 px-3 py-1 rounded-md font-medium border border-purple-200">
                        KKM: {quiz.passingScorePercent}%
                    </div>
                    <div className="font-medium bg-slate-100 px-3 py-1 rounded-md">
                        {quiz.questions.length} Soal
                    </div>
                    
                    {quiz.userProgress && (
                        <div className="flex items-center gap-2 border-l pl-4 ml-2">
                            <span>Status Terakhir:</span>
                            {quiz.userProgress.isPassed ? (
                                <span className="text-green-600 font-semibold">Lulus (Nilai: {quiz.userProgress.bestScore}%)</span>
                            ) : (
                                <span className="text-red-600 font-semibold">Belum Lulus (Nilai Terbaik: {quiz.userProgress.bestScore}%)</span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {result ? (
                <div className={`p-8 rounded-xl border-2 text-center mb-8 animate-in fade-in zoom-in duration-300 ${result.passedThisAttempt ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <h2 className={`text-2xl font-bold mb-2 ${result.passedThisAttempt ? 'text-green-800' : 'text-red-800'}`}>
                        {result.passedThisAttempt ? '🎉 Selamat! Anda Lulus Kuis Ini' : '😔 Maaf, Anda Belum Lulus'}
                    </h2>
                    <p className="text-slate-700 mb-4">Nilai Akhir Anda: <span className="font-bold text-2xl ml-1">{result.score}%</span></p>
                    
                    <div className="flex flex-col sm:flex-row justify-center gap-4 mt-6">
                        <Link href={`/student/courses/${courseId}`} className="bg-white px-6 py-2.5 rounded-lg border border-slate-300 shadow-sm font-medium hover:bg-slate-50 transition-colors">
                            Kembali ke Menu Modul
                        </Link>
                        {!result.passedThisAttempt && (
                            <button 
                                onClick={() => {
                                    setResult(null);
                                    setAnswers({});
                                }} 
                                className="bg-purple-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-purple-700 shadow-sm transition-colors"
                            >
                                Coba Kuis Lagi
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="space-y-8 animate-in fade-in duration-300">
                    {quiz.questions.map((q: any, i: number) => (
                        <div key={q.id} className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 shadow-sm">
                            <p className="font-semibold text-slate-800 mb-4 whitespace-pre-wrap leading-relaxed text-[15px]">
                                {i + 1}. {q.questionText}
                            </p>
                            <div className="space-y-2.5 pl-2 md:pl-4 border-l-2 border-purple-200">
                                {q.options.map((opt: any) => {
                                    const isSelected = (answers[q.id] || []).includes(opt.id);
                                    return (
                                        <label 
                                            key={opt.id} 
                                            className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                                                isSelected ? 'bg-purple-100 border-purple-300 shadow-sm ring-1 ring-purple-300' : 'bg-white border-slate-200 hover:bg-slate-50'
                                            }`}
                                        >
                                            <input 
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleOptionToggle(q.id, opt.id)}
                                                className="mt-0.5 w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500 transition-colors"
                                            />
                                            <span className={`text-sm md:text-[15px] leading-relaxed ${isSelected ? 'text-purple-900 font-medium' : 'text-slate-700'}`}>
                                                {opt.optionText}
                                            </span>
                                        </label>
                                    )
                                })}
                            </div>
                        </div>
                    ))}

                    <div className="pt-8 border-t border-slate-200 flex justify-end">
                        <button 
                            onClick={handleSubmit}
                            disabled={isPending}
                            className="bg-purple-600 text-white px-8 py-3.5 rounded-xl font-bold shadow-md hover:bg-purple-700 hover:shadow-lg transition-all disabled:opacity-70 flex items-center gap-2"
                        >
                            {isPending ? 'Sedang Memeriksa Jawaban...' : 'Kumpulkan Kuis Sekarang'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
