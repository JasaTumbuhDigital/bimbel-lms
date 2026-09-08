"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { submitReviewAction, deleteReviewAction } from "@/lib/actions/review";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/skeletons";

interface ReviewData {
    id: string;
    rating: number;
    comment: string | null;
    student: {
        user: {
            name: string;
            avatarUrl: string | null;
        };
    };
    createdAt: Date;
}

interface CourseReviewSectionProps {
    courseId: string;
    isEnrolled: boolean;
    // studentReview kini juga menyertakan 'id' agar bisa dipakai untuk delete
    studentReview: { id: string; rating: number; comment: string | null } | null;
    reviews: ReviewData[];
}

export function CourseReviewSection({ courseId, isEnrolled, studentReview, reviews }: CourseReviewSectionProps) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    
    // State untuk form ulasan pengguna saat ini
    const [rating, setRating] = useState(studentReview?.rating || 0);
    const [hoveredRating, setHoveredRating] = useState(0);
    const [comment, setComment] = useState(studentReview?.comment || "");
    const [isEditing, setIsEditing] = useState(!studentReview);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Hitung rata-rata rating
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0 
        ? (reviews.reduce((sum, rev) => sum + rev.rating, 0) / totalReviews).toFixed(1)
        : "0";

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (rating === 0) {
            toast.warning("Silakan berikan rating bintang terlebih dahulu.");
            return;
        }

        startTransition(async () => {
            const formData = new FormData();
            formData.append("courseId", courseId);
            formData.append("rating", rating.toString());
            formData.append("comment", comment);

            const result = await submitReviewAction(formData);
            
            if (!result.success) {
                toast.error(result.error);
            } else {
                toast.success("Ulasan berhasil disimpan!");
                setIsEditing(false);
                router.refresh(); // Refresh halaman agar ulasan baru muncul di daftar bawah
            }
        });
    };

    const handleDelete = async () => {
        if (!studentReview?.id) return;

        const result = await deleteReviewAction(studentReview.id);
        if (!result.success) {
            toast.error(result.error);
        } else {
            toast.success("Ulasan berhasil dihapus!");
            setRating(0);
            setComment("");
            setIsEditing(true); // Kembali ke mode form kosong
            setShowDeleteConfirm(false);
            router.refresh();
        }
    };

    return (
        <div className="mt-12 border-t border-slate-200 pt-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-6">Ulasan Siswa</h2>

            {/* Ringkasan Ulasan */}
            {totalReviews > 0 && (
                <div className="flex items-center gap-6 mb-8 bg-white border border-slate-200 shadow-sm rounded-xl p-6">
                    <div className="text-center">
                        <div className="text-5xl font-bold text-slate-900">{averageRating}</div>
                        <div className="text-sm text-slate-500 font-medium mt-1">dari 5</div>
                    </div>
                    <div className="border-l border-slate-200 pl-6">
                        <div className="flex items-center gap-1 mb-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star 
                                    key={star} 
                                    className={`w-6 h-6 ${
                                        star <= Math.round(Number(averageRating))
                                            ? "fill-yellow-400 text-yellow-400" 
                                            : "text-slate-200"
                                    }`} 
                                />
                            ))}
                        </div>
                        <p className="text-sm text-slate-600">Berdasarkan total <strong>{totalReviews}</strong> ulasan</p>
                    </div>
                </div>
            )}

            {/* Bagian Input Form (Hanya jika siswa sudah Enroll) */}
            {isEnrolled && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 mb-8">
                    <h3 className="text-sm font-medium text-slate-900 mb-3">
                        {studentReview ? "Ulasan Kamu" : "Berikan Ulasan"}
                    </h3>

                    {isEditing ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setRating(star)}
                                        onMouseEnter={() => setHoveredRating(star)}
                                        onMouseLeave={() => setHoveredRating(0)}
                                        className="focus:outline-none"
                                    >
                                        <Star 
                                            className={`w-6 h-6 transition-colors ${
                                                star <= (hoveredRating || rating) 
                                                    ? "fill-yellow-400 text-yellow-400" 
                                                    : "text-slate-300"
                                            }`} 
                                        />
                                    </button>
                                ))}
                            </div>
                            
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Bagaimana pendapatmu tentang kursus ini? (Opsional)"
                                rows={3}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={isPending}
                            />

                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    disabled={isPending || rating === 0}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isPending ? <><Spinner /> Menyimpan...</> : "Simpan Ulasan"}
                                </button>
                                {studentReview && (
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(false)}
                                        disabled={isPending}
                                        className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-300 px-4 py-2 text-sm font-medium rounded-md transition-colors"
                                    >
                                        Batal
                                    </button>
                                )}
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star 
                                        key={star} 
                                        className={`w-4 h-4 ${
                                            star <= rating 
                                                ? "fill-yellow-400 text-yellow-400" 
                                                : "text-slate-300"
                                        }`} 
                                    />
                                ))}
                            </div>
                            {comment && <p className="text-sm text-slate-700">{comment}</p>}
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                >
                                    Edit Ulasan
                                </button>
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    disabled={isPending}
                                    className="text-sm text-red-500 hover:text-red-600 font-medium disabled:opacity-50"
                                >
                                    Hapus Ulasan
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Daftar Ulasan Lainnya */}
            {reviews.length === 0 ? (
                <p className="text-sm text-slate-500">Belum ada ulasan untuk kursus ini.</p>
            ) : (
                <div className="space-y-6">
                    {reviews.map((rev) => (
                        <div key={rev.id} className="border-b border-slate-100 pb-6 last:border-0">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold overflow-hidden">
                                    {rev.student.user.avatarUrl ? (
                                        <img src={rev.student.user.avatarUrl} alt={rev.student.user.name} className="w-full h-full object-cover" />
                                    ) : (
                                        rev.student.user.name.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium text-slate-900">{rev.student.user.name}</h4>
                                    <div className="flex items-center gap-1 mt-0.5">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <Star 
                                                key={star} 
                                                className={`w-3 h-3 ${
                                                    star <= rev.rating 
                                                        ? "fill-yellow-400 text-yellow-400" 
                                                        : "text-slate-300"
                                                }`} 
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            {rev.comment && (
                                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                                    {rev.comment}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {showDeleteConfirm && (
                <ConfirmModal
                    title="Hapus Ulasan"
                    message="Yakin ingin menghapus ulasanmu? Tindakan ini tidak bisa dibatalkan."
                    onConfirm={handleDelete}
                    onClose={() => setShowDeleteConfirm(false)}
                />
            )}
        </div>
    );
}

// Sub-komponen Modal Konfirmasi
function ConfirmModal({ title, message, onConfirm, onClose }: { title: string; message: string; onConfirm: () => Promise<void>; onClose: () => void }) {
    const [isPending, setIsPending] = useState(false);

    const handleConfirm = async () => {
        setIsPending(true);
        await onConfirm();
        setIsPending(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg w-full max-w-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-slate-900">{title}</h2>
                    <button onClick={onClose} disabled={isPending} className="text-slate-400 hover:text-slate-600 text-lg">&times;</button>
                </div>
                <p className="text-sm text-slate-600">{message}</p>
                <div className="flex justify-end gap-2 pt-2">
                    <button onClick={onClose} disabled={isPending} className="text-sm px-4 py-1.5 border border-slate-200 rounded-md text-slate-600">
                        Batal
                    </button>
                    <button onClick={handleConfirm} disabled={isPending} className="text-sm px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                        {isPending ? <><Spinner /> Menghapus...</> : "Hapus"}
                    </button>
                </div>
            </div>
        </div>
    );
}
