import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";

export default async function StudentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const {
        data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
        redirect("/login");
    }

    const dbUser = await prisma.user.findUnique({
        where: { authId: authUser.id },
        include: { studentProfile: true },
    });

    if (!dbUser || !dbUser.isActive) {
        redirect("/login");
    }

    // Jika siswa belum mengganti password default -> paksa ke /change-password
    if (dbUser.role === "student" && dbUser.studentProfile?.mustChangePassword) {
        redirect("/change-password");
    }

    // Hanya student dan admin yang boleh berada di sini
    if (dbUser.role !== "student" && dbUser.role !== "admin") {
        redirect("/tutor");
    }

    return <>{children}</>;
}
