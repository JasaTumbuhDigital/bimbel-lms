"use client";

import { useState, useRef, useEffect } from "react";
import { Share2, Copy, Check, MessageCircle, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

function XIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
    );
}

interface ShareButtonProps {
    title: string;
    slug: string;
    variant?: "compact" | "default";
}

export default function ShareButton({ title, slug, variant = "default" }: ShareButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Dapatkan URL lengkap artikel
    const getShareUrl = () => {
        if (typeof window !== "undefined") {
            return `${window.location.origin}/blog/${slug}`;
        }
        return `/blog/${slug}`;
    };

    // Tutup menu jika klik di luar area tombol
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    // 1. Salin Tautan ke Clipboard
    const handleCopy = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const url = getShareUrl();
        try {
            await navigator.clipboard.writeText(url);
            setIsCopied(true);
            toast.success("Tautan artikel berhasil disalin!");
            setTimeout(() => {
                setIsCopied(false);
                setIsOpen(false);
            }, 1500);
        } catch {
            toast.error("Gagal menyalin tautan.");
        }
    };

    // 2. Share ke WhatsApp
    const handleShareWhatsApp = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const url = getShareUrl();
        const text = encodeURIComponent(`*${title}*\n\nBaca selengkapnya di sini:\n${url}`);
        window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank", "noopener,noreferrer");
        setIsOpen(false);
    };

    // 3. Share ke Twitter / X
    const handleShareTwitter = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const url = getShareUrl();
        const text = encodeURIComponent(title);
        window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`, "_blank", "noopener,noreferrer");
        setIsOpen(false);
    };

    // 4. Native Web Share API (Bawaan HP Android/iOS)
    const handleNativeShare = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const url = getShareUrl();
        if (typeof navigator !== "undefined" && navigator.share) {
            try {
                await navigator.share({
                    title,
                    text: `Baca artikel: ${title}`,
                    url,
                });
                setIsOpen(false);
            } catch {
                // Pengguna membatalkan share dialog
            }
        } else {
            handleCopy(e);
        }
    };

    const toggleOpen = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation(); // Mencegah klik tembus jika tombol berada di dalam Card Link
        setIsOpen((prev) => !prev);
    };

    return (
        <div className="relative inline-block text-left" ref={menuRef}>
            {/* Tombol Pemicu (Trigger Button) */}
            {variant === "compact" ? (
                <button
                    type="button"
                    onClick={toggleOpen}
                    title="Bagikan artikel"
                    aria-label="Bagikan artikel"
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                >
                    <Share2 className="w-3.5 h-3.5" />
                </button>
            ) : (
                <button
                    type="button"
                    onClick={toggleOpen}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Bagikan</span>
                </button>
            )}

            {/* Menu Popover / Dropdown */}
            {isOpen && (
                <div className="absolute right-0 bottom-full mb-2 sm:bottom-auto sm:top-full sm:mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                        Bagikan Artikel
                    </div>

                    {/* Salin Tautan */}
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors text-left cursor-pointer"
                    >
                        {isCopied ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span>{isCopied ? "Tersalin!" : "Salin Tautan"}</span>
                    </button>

                    {/* WhatsApp */}
                    <button
                        type="button"
                        onClick={handleShareWhatsApp}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-emerald-600 transition-colors text-left cursor-pointer"
                    >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                        <span>WhatsApp</span>
                    </button>

                    {/* Twitter / X */}
                    <button
                        type="button"
                        onClick={handleShareTwitter}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors text-left cursor-pointer"
                    >
                        <XIcon className="w-3.5 h-3.5 text-slate-800" />
                        <span>Twitter / X</span>
                    </button>

                    {/* Web Share API jika didukung perangkat */}
                    {typeof navigator !== "undefined" && "share" in navigator && (
                        <button
                            type="button"
                            onClick={handleNativeShare}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900 border-t border-slate-100 transition-colors text-left cursor-pointer"
                        >
                            <MoreHorizontal className="w-3.5 h-3.5 text-slate-400" />
                            <span>Lainnya...</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
