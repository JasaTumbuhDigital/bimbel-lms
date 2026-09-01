import CreateCourseForm from "@/components/course/CreateCourseForm";

export const metadata = {
    title: "Buat Kursus Baru - Tutor",
};

export default function NewTutorCoursePage() {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
            <div className="max-w-3xl mx-auto space-y-6">
                <header className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">Buat Kursus Baru</h1>
                        <p className="text-xs text-slate-600">Lengkapi informasi dasar kursus di bawah ini. Anda akan secara otomatis ditugaskan sebagai pengampu untuk kursus ini.</p>
                    </div>
                </header>
                
                <CreateCourseForm role="tutor" />
            </div>
        </div>
    );
}
