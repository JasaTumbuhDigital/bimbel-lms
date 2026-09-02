import { institutionConfig } from "@/config/institution";

export const STORAGE_BUCKET = institutionConfig.shortName.toLowerCase();

/**
 * Mendapatkan URL publik untuk file di Supabase Storage secara sinkron
 */
export function getPublicUrl(path: string | null): string | null {
    if (!path) return null;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return null;
    return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
}

