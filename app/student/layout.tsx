import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/data/auth";

export default async function StudentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const dbUser = await getAuthenticatedUser();
    if (!dbUser) redirect("/login");

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
