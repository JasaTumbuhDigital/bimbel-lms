import { Loader2 } from "lucide-react";

export function TableSkeleton() {
    return (
        <div className="w-full bg-white border border-slate-200 rounded-lg shadow-sm p-4 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="h-6 bg-slate-200 rounded w-1/4 animate-pulse"></div>
                <div className="h-8 bg-slate-200 rounded w-24 animate-pulse"></div>
            </div>
            <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex gap-4">
                        <div className="h-10 bg-slate-100 rounded flex-1 animate-pulse"></div>
                        <div className="h-10 bg-slate-100 rounded w-24 animate-pulse"></div>
                    </div>
                ))}
            </div>
            <div className="pt-4 flex justify-center">
                 <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
            </div>
        </div>
    );
}

export function DashboardStatsSkeleton() {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col items-center justify-center space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-24 animate-pulse"></div>
                    <div className="h-8 bg-slate-200 rounded w-12 animate-pulse"></div>
                </div>
            ))}
        </div>
    );
}

export function CardGridSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
                    <div className="w-full aspect-video bg-slate-200 animate-pulse"></div>
                    <div className="p-5 flex flex-col space-y-3">
                        <div className="h-5 bg-slate-200 rounded w-3/4 animate-pulse"></div>
                        <div className="h-4 bg-slate-100 rounded w-full animate-pulse"></div>
                        <div className="h-4 bg-slate-100 rounded w-5/6 animate-pulse"></div>
                        <div className="pt-4 border-t border-slate-100 mt-auto flex justify-between">
                            <div className="h-3 bg-slate-200 rounded w-16 animate-pulse"></div>
                            <div className="h-3 bg-slate-200 rounded w-20 animate-pulse"></div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export function CurriculumSkeleton() {
    return (
        <div className="max-w-3xl mx-auto px-6 py-12 space-y-6">
            <div className="h-6 bg-slate-200 rounded w-48 animate-pulse mb-6"></div>
            {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                        <div className="h-5 bg-slate-200 rounded w-1/3 animate-pulse"></div>
                    </div>
                    <div className="p-4 space-y-4">
                        <div className="flex gap-4">
                            <div className="h-10 w-10 bg-slate-100 rounded-full animate-pulse"></div>
                            <div className="space-y-2 flex-1">
                                <div className="h-4 bg-slate-100 rounded w-1/2 animate-pulse"></div>
                                <div className="h-3 bg-slate-50 rounded w-1/4 animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export function LessonSkeleton() {
    return (
        <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50 w-full">
            <div className="p-4 md:p-8 max-w-7xl mx-auto w-full flex-1 flex flex-col">
                <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2 w-full md:w-1/2">
                        <div className="h-3 bg-slate-200 rounded w-32 animate-pulse"></div>
                        <div className="h-8 bg-slate-200 rounded w-3/4 animate-pulse"></div>
                    </div>
                    <div className="h-10 bg-slate-200 rounded w-32 animate-pulse shrink-0"></div>
                </div>
                <div className="flex-1 bg-slate-200 rounded-xl animate-pulse min-h-125"></div>
                <div className="mt-6 flex items-center justify-between">
                    <div className="h-10 bg-slate-200 rounded w-32 animate-pulse"></div>
                    <div className="h-10 bg-slate-200 rounded w-32 animate-pulse"></div>
                </div>
            </div>
        </div>
    );
}

export function CourseBuilderSkeleton() {
    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="flex border-b px-6 py-4 space-x-8">
                <div className="h-5 bg-slate-200 rounded w-32 animate-pulse"></div>
                <div className="h-5 bg-slate-200 rounded w-32 animate-pulse"></div>
                <div className="h-5 bg-slate-200 rounded w-32 animate-pulse"></div>
            </div>
            <div className="p-6 space-y-6">
                <div className="space-y-2">
                    <div className="h-5 bg-slate-200 rounded w-48 animate-pulse"></div>
                    <div className="h-10 bg-slate-100 rounded w-full animate-pulse border border-slate-200"></div>
                </div>
                <div className="space-y-2">
                    <div className="h-5 bg-slate-200 rounded w-48 animate-pulse"></div>
                    <div className="h-24 bg-slate-100 rounded w-full animate-pulse border border-slate-200"></div>
                </div>
                <div className="h-40 bg-slate-50 rounded w-full animate-pulse border border-slate-200"></div>
            </div>
        </div>
    );
}

export function Spinner({ className = "w-4 h-4" }: { className?: string }) {
    return <Loader2 className={`animate-spin ${className}`} />;
}
