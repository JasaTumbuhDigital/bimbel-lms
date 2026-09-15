export interface InstitutionConfig {
    name: string;
    shortName: string;
    url: string;
    tagline: string;
    description: string;
    logo: {
        src: string;
        alt: string;
        width: number;
        height: number;
    };
    contact: {
        whatsapp: string;
        email: string;
        address: string;
    };
    hero: {
        title: string;
        subtitle: string;
    };
    theme: {
        primaryColor: string;
        secondaryColor: string;
    };
}

export const institutionConfig: InstitutionConfig = {
    name: "Zest Collage",
    shortName: "Zest",
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    tagline: "Belajar Ser, Gapai Mimpi Besarmu",
    description: "Bersama ZEST, belajar nyaman dengan metode yang menyenangkan. Kami bantu kamu tumbuh percaya diri, berkembang dan melangkah pasti menuju mimpi besarmu.",
    logo: {
        src: "/images/logo.svg",
        alt: "Zest Collage Logo",
        width: 180,
        height: 48,
    },
    contact: {
        whatsapp: "085792707099",
        email: "zestcolleges@gmail.com",
        address: "Mojokerto, Bangsal",
    },
    hero: {
        title: "Selamat Datang di Portal Belajar",
        subtitle: "Akses materi pembelajaran, latihan soal, dan pemantauan progress kamu di sini.",
    },
    theme: {
        primaryColor: "#2563eb", // Royal Blue
        secondaryColor: "#0f172a", // Slate 900
    },
};