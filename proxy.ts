import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        return response;
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
            getAll() {
                return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value, options }) => {
                    request.cookies.set(name, value);
                });
                response = NextResponse.next({
                    request,
                });
                cookiesToSet.forEach(({ name, value, options }) => {
                    response.cookies.set(name, value);
                });
            },
        },
    });

    // Membaca sesi user dari Supabase Auth
    const {
        data: { user: authUser },
    } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;
    const isLoginPage = pathname === "/login";

    // Proteksi Dasar: Jika belum login & mencoba buka rute internal -> redirect ke /login
    if (!authUser && !isLoginPage) {
        if (
            pathname.startsWith("/admin") ||
            pathname.startsWith("/student") ||
            pathname.startsWith("/tutor") ||
            pathname.startsWith("/change-password")
        ) {
            return NextResponse.redirect(new URL("/login", request.url));
        }
    }

    // Jika sudah login & mencoba membuka halaman /login -> izinkan lewat (pengecekan role di-handle di layout/page)
    return response;
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
