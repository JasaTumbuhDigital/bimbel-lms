import type { MetadataRoute } from "next";
import { institutionConfig } from "@/config/institution";

export default function robots(): MetadataRoute.Robots {
    const baseUrl = institutionConfig.url;

    return {
        rules: [
            {
                userAgent: "*",
                allow: ["/", "/blog", "/login"],
                disallow: ["/admin/", "/student/", "/tutor/", "/api/"],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
