import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { cache } from "react";

/**
 * Helper internal untuk mengecek user yang sedang login dan profil spesifiknya
 */
export const getAuthenticatedUser = cache(async () => {
    const supabase = await createClient();
    const {
        data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) return null;

    const dbUser = await prisma.user.findUnique({
        where: { authId: authUser.id },
        include: {
            studentProfile: true,
            tutorProfile: true,
            adminProfile: true,
        },
    });

    if (!dbUser || !dbUser.isActive) return null;
    return dbUser;
});

/**
 * Helper internal untuk mengamankan bahwa pemanggil action adalah Admin
 */
export async function checkAdminPermission() {
    const dbUser = await getAuthenticatedUser();

    if (!dbUser || dbUser.role !== "admin") {
        return null;
    }

    return dbUser;
}

