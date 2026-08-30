import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";

export default async function AdminLayout({
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

    if (!dbUser || !dbUser.isActive || dbUser.role !== "admin") {
        // Jika bukan admin, lempar ke rute role-nya masing-masing
        if (dbUser?.role === "tutor") redirect("/tutor");
        else redirect("/student");
    }

    return <>{children}</>;
}
