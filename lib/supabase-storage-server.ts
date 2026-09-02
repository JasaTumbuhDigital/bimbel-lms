import { createClient } from "@/utils/supabase/server";
import { STORAGE_BUCKET } from "@/lib/supabase-storage";

/**
 * Menghapus file dari Supabase Storage tunggal aplikasi.
 * (Server-side only)
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
