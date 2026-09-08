import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "./auth";

export async function getStudentWishlist() {
    const user = await getAuthenticatedUser();

    if (!user || user.role !== "student" || !user.studentProfile) {
        return [];
    }

    const wishlists = await prisma.wishlist.findMany({
        where: {
            studentId: user.studentProfile.id,
            course: {
                isPublished: true,
                isArchived: false
            }
        },
        include: {
            course: {
                select: {
                    id: true,
                    title: true,
                    thumbnailUrl: true,
                    classLevels: {
                        select: {
                            classLevel: {
                                select: { name: true }
                            }
                        }
                    }
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    return wishlists;
}
