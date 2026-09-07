import { getAuthenticatedUser } from "@/lib/data/auth";
import SettingsForm from "@/components/users/SettingsForm";

export default async function StudentSettingsPage() {
    // Ambil data user beserta profilnya menggunakan helper yang sudah di-cache
    const user = await getAuthenticatedUser();

    if (!user) {
        return null; // Keamanan tambahan, biarkan layout yang menangani redirect
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Pengaturan Profil</h1>
            <SettingsForm user={user} />
        </div>
    );
}
