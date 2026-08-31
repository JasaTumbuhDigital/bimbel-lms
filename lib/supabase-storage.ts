import { createClient } from "@/utils/supabase/server";
import { institutionConfig } from "@/config/institution";

export const STORAGE_BUCKET = institutionConfig.shortName.toLowerCase();

/**
 * Menghapus file dari Supabase Storage tunggal aplikasi.
 * 
 * @param path - Path file di storage (misal: "courses/course-id/documents/uuid-filename.pdf")
 */
export async function deleteFileFromStorage(path: string): Promise<boolean> {
    if (!path) return false;
    
    try {
        const supabase = await createClient();
        
        const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path]);
        
        if (error) {
            console.error(`Gagal menghapus file dari bucket ${STORAGE_BUCKET}:`, error.message);
            return false;
        }
        
        return true;
    } catch (error) {
        console.error("Exception saat menghapus file storage:", error);
        return false;
    }
}
