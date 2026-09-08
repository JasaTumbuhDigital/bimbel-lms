import { prisma } from "@/lib/prisma";
import { checkAdminPermission } from "@/lib/data/auth";
import { UserRole } from "@prisma/client";

/**
 * Fetch Tutor profiles for dropdowns/selection (Admin & Tutor)
 */
export async function getTutorsForSelect() {
    try {
        return await prisma.tutorProfile.findMany({
            select: {
                id: true,
                user: { select: { id: true, name: true } }
            },
            orderBy: { user: { name: "asc" } }
        });
    } catch {
        return [];
    }
}

/**
 * Fetch daftar user berdasarkan role, dengan search & filter (Admin Only)
 */
export async function listUsers(params: {
    role: UserRole;
    search?: string;
    classLevelId?: string;
    page?: number;
    pageSize?: number;
}) {
    const admin = await checkAdminPermission();
    if (!admin) return { users: [], total: 0 };

    const { role, search, classLevelId, page = 1, pageSize = 50 } = params;

    // Bangun klausa WHERE secara dinamis
    const where: any = {
        role,
        ...(search
            ? {
                OR: [
                    { name: { contains: search, mode: "insensitive" as const } },
                    { email: { contains: search, mode: "insensitive" as const } },
                ],
            }
            : {}),
        ...(role === "student" && classLevelId
            ? { studentProfile: { classLevelId } }
            : {}),
    };

    // Optimasi Select: Hanya ambil field yang dibutuhkan saja (tidak mengambil seluruh kolom)
    const selectByRole = {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        role: true,
        authId: true,
        mustChangePassword: true,
        createdAt: true,
        ...(role === "student"
            ? { studentProfile: { select: { id: true, classLevel: { select: { name: true } } } } }
            : role === "tutor"
                ? { tutorProfile: { select: { bio: true, _count: { select: { courseTutors: true } } } } }
                : {}),
    };

    try {
        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: selectByRole,
                orderBy: { createdAt: "desc" },
                take: pageSize,
                skip: (page - 1) * pageSize,
            }),
            prisma.user.count({ where }),
        ]);
        return { users, total };
    } catch (error) {
        console.error("Gagal mengambil daftar user:", error);
        return { users: [], total: 0 };
    }
}
