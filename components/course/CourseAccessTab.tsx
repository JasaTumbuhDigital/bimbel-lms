"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateCourseAccessAction } from "@/lib/actions/course";

export default function CourseAccessTab({ 
    course, 
    availableClassLevels,
    availableTutors 
}: { 
    course: any;
    availableClassLevels: any[];
    availableTutors: any[];
}) {
    const [isPending, startTransition] = useTransition();

    const [isPublished, setIsPublished] = useState(course.isPublished);
    const [visibleToAllLevels, setVisibleToAllLevels] = useState(course.visibleToAllLevels);
    
    // Existing selected levels and tutors from course data
    const existingLevelIds = course.classLevels?.map((cl: any) => cl.classLevelId) || [];
    const [selectedLevelIds, setSelectedLevelIds] = useState<string[]>(existingLevelIds);

    const existingTutorIds = course.tutors?.map((t: any) => t.tutorProfileId) || [];
    const [selectedTutorIds, setSelectedTutorIds] = useState<string[]>(existingTutorIds);

    const handleLevelToggle = (id: string) => {
        setSelectedLevelIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleTutorToggle = (id: string) => {
        setSelectedTutorIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        startTransition(async () => {
            const formData = new FormData();
            formData.append("isPublished", isPublished ? "true" : "false");
            formData.append("visibleToAllLevels", visibleToAllLevels ? "true" : "false");
            
            selectedLevelIds.forEach(id => formData.append("classLevelIds", id));
            selectedTutorIds.forEach(id => formData.append("tutorProfileIds", id));

            const res = await updateCourseAccessAction(course.id, null, formData);
            if (res.success) {
                toast.success(res.message);
            } else {
                toast.error(res.error);
            }
        });
    };

    return (
        <form onSubmit={handleSubmit} className="max-w-3xl space-y-8 bg-white border border-slate-200 p-6 rounded-md shadow-sm">
            
            {/* Publikasi */}
            <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-3 border-b pb-2">Status Publikasi</h3>
                <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={isPublished}
                            onChange={(e) => setIsPublished(e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        <span className="ml-3 text-sm font-medium text-slate-700">
                            {isPublished ? "Terpublikasi (Bisa dilihat & diikuti)" : "Draft (Disembunyikan dari siswa)"}
                        </span>
                    </label>
                </div>
            </div>

            {/* Target Kelas */}
            <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-3 border-b pb-2">Akses Tingkatan Kelas</h3>
                <p className="text-sm text-slate-600 mb-4">Pilih tingkatan kelas mana saja yang dapat mengakses kursus ini.</p>
                
                <label className="flex items-center gap-2 mb-4 bg-slate-50 p-3 rounded-md border border-slate-200">
                    <input 
                        type="checkbox" 
                        checked={visibleToAllLevels}
                        onChange={(e) => setVisibleToAllLevels(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-slate-800">Buka untuk Semua Tingkatan (Universal)</span>
                </label>

                {!visibleToAllLevels && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-2">
                        {availableClassLevels.map(cl => (
                            <label key={cl.id} className="flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    checked={selectedLevelIds.includes(cl.id)}
                                    onChange={() => handleLevelToggle(cl.id)}
                                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                />
                                <span className="text-sm text-slate-700">{cl.name}</span>
                            </label>
                        ))}
                        {availableClassLevels.length === 0 && (
                            <p className="text-sm text-slate-500 italic">Belum ada data tingkatan kelas.</p>
                        )}
                    </div>
                )}
            </div>

            {/* Tutor Pengampu */}
            <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-3 border-b pb-2">Penugasan Tutor (Co-teaching)</h3>
                <p className="text-sm text-slate-600 mb-4">Tutor yang dipilih di sini akan memiliki hak untuk mengubah modul dan materi pada kursus ini.</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-2">
                    {availableTutors.map(tutor => (
                        <label key={tutor.id} className="flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                checked={selectedTutorIds.includes(tutor.id)}
                                disabled={tutor.user.id === course.createdBy}
                                onChange={() => handleTutorToggle(tutor.id)}
                                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 disabled:opacity-50"
                            />
                            <span className={`text-sm ${tutor.user.id === course.createdBy ? 'text-slate-500 font-medium' : 'text-slate-700'}`}>
                                {tutor.user.name} {tutor.user.id === course.createdBy && "(Tutor Utama)"}
                            </span>
                        </label>
                    ))}
                    {availableTutors.length === 0 && (
                        <p className="text-sm text-slate-500 italic">Belum ada akun Tutor yang terdaftar.</p>
                    )}
                </div>
            </div>

            <div className="pt-4 flex gap-3">
                <button 
                    type="submit" 
                    disabled={isPending}
                    className="bg-blue-600 text-white px-5 py-2 text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                    {isPending ? "Menyimpan..." : "Simpan Pengaturan Akses"}
                </button>
            </div>
        </form>
    );
}
