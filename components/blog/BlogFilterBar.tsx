"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Search, X } from "lucide-react";

interface Category {
    id: string;
    name: string;
    slug: string;
}

interface BlogFilterBarProps {
    categories: Category[];
    activeCategory?: string;
    activeTag?: string;
    activeSearch?: string;
}

export default function BlogFilterBar({
    categories,
    activeCategory = "",
    activeTag = "",
    activeSearch = "",
}: BlogFilterBarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [searchTerm, setSearchTerm] = useState(activeSearch);
    const [, startTransition] = useTransition();

    const updateQueryParams = (newParams: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());

        Object.entries(newParams).forEach(([key, val]) => {
            if (val === null || val === "") {
                params.delete(key);
            } else {
                params.set(key, val);
            }
        });

        startTransition(() => {
            router.push(`${pathname}?${params.toString()}`);
        });
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateQueryParams({ search: searchTerm.trim() || null });
    };

    const handleCategoryClick = (categorySlug: string | null) => {
        updateQueryParams({ category: categorySlug });
    };

    const handleClearTag = () => {
        updateQueryParams({ tag: null });
    };

    const handleClearAll = () => {
        setSearchTerm("");
        startTransition(() => {
            router.push(pathname);
        });
    };

    const hasActiveFilters = Boolean(activeCategory || activeTag || activeSearch);

    return (
        <div className="space-y-4">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative max-w-lg">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari judul artikel..."
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-xs"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                {searchTerm && (
                    <button
                        type="button"
                        onClick={() => {
                            setSearchTerm("");
                            updateQueryParams({ search: null });
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </form>

            {/* Category Pills */}
            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={() => handleCategoryClick(null)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        !activeCategory
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                    }`}
                >
                    Semua Kategori
                </button>

                {categories.map((cat) => {
                    const isSelected = activeCategory === cat.slug;
                    return (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => handleCategoryClick(isSelected ? null : cat.slug)}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                isSelected
                                    ? "bg-blue-600 text-white shadow-xs"
                                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                            }`}
                        >
                            {cat.name}
                        </button>
                    );
                })}
            </div>

            {/* Active Tag or Filters Notice */}
            {(activeTag || hasActiveFilters) && (
                <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                    <span className="text-slate-500">Filter aktif:</span>
                    {activeTag && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                            Tag: #{activeTag}
                            <button
                                type="button"
                                onClick={handleClearTag}
                                className="hover:text-blue-900 font-bold"
                            >
                                &times;
                            </button>
                        </span>
                    )}
                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={handleClearAll}
                            className="text-red-600 hover:underline ml-2"
                        >
                            Reset semua filter
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
