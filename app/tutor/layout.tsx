import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";

export default async function TutorLayout({
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
    });

    if (!dbUser || !dbUser.isActive) {
        redirect("/login");
    }

    // Hanya tutor dan admin yang boleh berada di sini
    if (dbUser.role !== "tutor" && dbUser.role !== "admin") {
        redirect("/student");
    }

    return <>{children}</>;
}
