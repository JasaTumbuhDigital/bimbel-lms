import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/data/auth";

export default async function TutorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const dbUser = await getAuthenticatedUser();
    if (!dbUser) redirect("/login");

    // Hanya tutor dan admin yang boleh berada di sini
    if (dbUser.role !== "tutor" && dbUser.role !== "admin") {
        redirect("/student");
    }

    return <>{children}</>;
}
