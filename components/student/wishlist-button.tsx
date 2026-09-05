"use client";

import { useState, useTransition } from "react";
import { Bookmark } from "lucide-react";
import { toggleWishlistAction } from "@/lib/actions/wishlist";
import { useRouter, usePathname } from "next/navigation";

interface WishlistButtonProps {
    courseId: string;
    initialIsWishlisted: boolean;
}

export function WishlistButton({ courseId, initialIsWishlisted }: WishlistButtonProps) {
    const [isPending, startTransition] = useTransition();
    const [isWishlisted, setIsWishlisted] = useState(initialIsWishlisted);
    const router = useRouter();
    const pathname = usePathname();

    const handleToggle = () => {
        // Optimistic UI update (ubah tampilan secara instan agar terasa cepat)
        setIsWishlisted(!isWishlisted);

        startTransition(async () => {
            // Gunakan pathname saat ini agar server action merevalidasi halaman yang benar
            const result = await toggleWishlistAction(courseId, pathname);
            
            if (!result.success) {
                // Kembalikan ke state awal jika request gagal
                setIsWishlisted(initialIsWishlisted);
                alert(result.error); 
            } else {
                // Refresh data next.js untuk memastikan konsistensi
                router.refresh();
            }
        });
    };

    return (
        <button
            onClick={handleToggle}
            disabled={isPending}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-md transition-all disabled:opacity-50 ${
                isWishlisted
                    ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
            }`}
        >
            <Bookmark 
                className={`w-4 h-4 ${isWishlisted ? "fill-blue-700" : ""}`} 
            />
            {isWishlisted ? "Tersimpan di Wishlist" : "Simpan ke Wishlist"}
        </button>
    );
}
