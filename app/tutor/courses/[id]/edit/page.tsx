import { notFound } from "next/navigation";
import { getCourseById } from "@/lib/data/course";
import CourseBuilder from "@/components/course/CourseBuilder";

import { getAuthenticatedUser } from "@/lib/data/auth";
import { getClassLevelsForSelect } from "@/lib/data/class-level";
import { getTutorsForSelect } from "@/lib/data/user";
import { getReviewsForTutorCourse } from "@/lib/data/review";
import { Star } from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
    return { title: "Kelola Kursus - Tutor" };
}

export default async function TutorEditCoursePage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const course = await getCourseById(params.id);
    const user = await getAuthenticatedUser();

    if (!course || !user) {
        notFound();
    }

    const isOwner = course.createdBy === user.id;

    let availableClassLevels: any[] = [];
    let availableTutors: any[] = [];
    
    // Jika owner, ia berhak mengubah setting (perlu data class levels dan tutors)
    if (isOwner) {
        availableClassLevels = await getClassLevelsForSelect();
        availableTutors = await getTutorsForSelect();
    }

    const reviews = await getReviewsForTutorCourse(course.id);
    const averageRating = reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
        : null;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                <header className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">Course Builder (Tutor)</h1>
                        <p className="text-xs text-slate-600">Edit modul dan materi kursus</p>
                    </div>
                </header>
                
                <CourseBuilder 
                    course={course} 
                    role="tutor" 
                    isOwner={isOwner}
                    availableClassLevels={availableClassLevels}
                    availableTutors={availableTutors}
                />

                {/* Ulasan Siswa - Read Only untuk Tutor */}
                <section className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-semibold text-slate-900">Ulasan Siswa</h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Feedback dari siswa yang telah mengikuti kursus ini (hanya bisa dibaca)
                            </p>
                        </div>
                        {averageRating && (
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                <span>{averageRating}</span>
                                <span className="font-normal text-slate-400">({reviews.length} ulasan)</span>
                            </div>
                        )}
                    </div>

                    {reviews.length === 0 ? (
                        <p className="px-6 py-8 text-center text-sm text-slate-400 italic">
                            Belum ada ulasan untuk kursus ini.
                        </p>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {reviews.map((review) => (
                                <div key={review.id} className="px-6 py-4 flex items-start gap-4">
                                    {/* Avatar */}
                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold flex-shrink-0 overflow-hidden">
                                        {review.student.user.avatarUrl ? (
                                            <img src={review.student.user.avatarUrl} alt={review.student.user.name} className="w-full h-full object-cover" />
                                        ) : (
                                            review.student.user.name.charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-medium text-slate-800">{review.student.user.name}</span>
                                            <div className="flex items-center gap-0.5">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <Star
                                                        key={star}
                                                        className={`w-3 h-3 ${
                                                            star <= review.rating
                                                                ? "fill-yellow-400 text-yellow-400"
                                                                : "text-slate-200"
                                                        }`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        {review.comment ? (
                                            <p className="text-sm text-slate-600 leading-relaxed">{review.comment}</p>
                                        ) : (
                                            <p className="text-xs text-slate-400 italic">Tidak ada komentar</p>
                                        )}
                                        <p className="text-xs text-slate-400 mt-1">
                                            {new Date(review.createdAt).toLocaleDateString("id-ID", {
                                                day: "numeric", month: "long", year: "numeric"
                                            })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
