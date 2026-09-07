import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/data/auth";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const dbUser = await getAuthenticatedUser();

    if (!dbUser || !dbUser.isActive || dbUser.role !== "admin") {
        // Jika bukan admin, lempar ke rute role-nya masing-masing
        if (dbUser?.role === "tutor") redirect("/tutor");
        else redirect("/student");
    }

    // Jika user belum mengganti password default -> paksa ke /change-password
    if (dbUser.mustChangePassword) {
        redirect("/change-password");
    }

    return <>{children}</>;
}
