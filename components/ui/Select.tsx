"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Check, Search } from "lucide-react";

export interface SelectOption {
    value: string;
    label: string;
    description?: string;
    icon?: React.ReactNode;
}

export interface SelectProps {
    options: SelectOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    searchable?: boolean;
    searchPlaceholder?: string;
    emptyText?: string;
    clearable?: boolean;
    clearLabel?: string;
    disabled?: boolean;
    className?: string;
}

export default function Select({
    options,
    value,
    onChange,
    placeholder = "-- Pilih --",
    searchable,
    searchPlaceholder = "Cari...",
    emptyText = "Tidak ada hasil ditemukan.",
    clearable = true,
    clearLabel = "-- Pilih --",
    disabled = false,
    className = "",
}: SelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Otomatis aktifkan pencarian jika opsi lebih dari 7, atau jika diaktifkan eksplisit
    const isSearchEnabled = searchable ?? options.length > 7;

    const selectedOption = useMemo(
        () => options.find((opt) => opt.value === value),
        [options, value]
    );

    // Filter opsi berdasarkan input pencarian
    const filteredOptions = useMemo(() => {
        if (!searchQuery.trim()) return options;
        const query = searchQuery.toLowerCase();
        return options.filter(
            (opt) =>
                opt.label.toLowerCase().includes(query) ||
                opt.description?.toLowerCase().includes(query)
        );
    }, [options, searchQuery]);

    // Fokus otomatis ke input pencarian saat dropdown dibuka
    useEffect(() => {
        if (isOpen && isSearchEnabled) {
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 50);
        }
        if (!isOpen) {
            setSearchQuery("");
        }
    }, [isOpen, isSearchEnabled]);

    // Menutup dropdown jika user klik di luar area atau tekan Escape
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setIsOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    const handleSelect = (val: string) => {
        onChange(val);
        setIsOpen(false);
    };

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-3 py-2 border rounded-md text-sm bg-white text-slate-800 flex items-center justify-between transition-colors shadow-xs outline-none ${
                    disabled
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200"
                        : isOpen
                        ? "border-blue-500 ring-2 ring-blue-500/20"
                        : "border-slate-300 hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                }`}
            >
                <div className="flex items-center gap-2 truncate">
                    {selectedOption?.icon && (
                        <span className="shrink-0">{selectedOption.icon}</span>
                    )}
                    <span className={selectedOption ? "text-slate-900 font-medium truncate" : "text-slate-400 truncate"}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                </div>
                <ChevronDown
                    className={`w-4 h-4 text-slate-500 shrink-0 ml-2 transition-transform duration-150 ${
                        isOpen ? "rotate-180" : ""
                    }`}
                />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-64 flex flex-col py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    {/* Input Pencarian (jika aktif) */}
                    {isSearchEnabled && (
                        <div className="p-2 border-b border-slate-100">
                            <div className="relative flex items-center">
                                <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={searchPlaceholder}
                                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-500"
                                />
                            </div>
                        </div>
                    )}

                    {/* List Opsi */}
                    <div className="overflow-y-auto max-h-52 py-1">
                        {clearable && !searchQuery && (
                            <button
                                type="button"
                                onClick={() => handleSelect("")}
                                className={`w-full text-left px-3.5 py-2 text-sm flex items-center justify-between transition-colors hover:bg-slate-50 ${
                                    !value ? "text-blue-600 font-medium bg-blue-50/50" : "text-slate-500"
                                }`}
                            >
                                <span>{clearLabel}</span>
                                {!value && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                            </button>
                        )}

                        {filteredOptions.length === 0 ? (
                            <div className="px-3.5 py-4 text-xs text-slate-400 text-center">
                                {emptyText}
                            </div>
                        ) : (
                            filteredOptions.map((opt) => {
                                const isSelected = opt.value === value;
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => handleSelect(opt.value)}
                                        className={`w-full text-left px-3.5 py-2 text-sm flex items-center justify-between transition-colors hover:bg-blue-50/70 hover:text-blue-700 ${
                                            isSelected
                                                ? "text-blue-600 font-semibold bg-blue-50"
                                                : "text-slate-800"
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 truncate pr-2">
                                            {opt.icon && (
                                                <span className="shrink-0">{opt.icon}</span>
                                            )}
                                            <div className="truncate">
                                                <div className="truncate">{opt.label}</div>
                                                {opt.description && (
                                                    <div className="text-xs text-slate-400 font-normal truncate">
                                                        {opt.description}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <Check className="w-4 h-4 text-blue-600 shrink-0" />
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
