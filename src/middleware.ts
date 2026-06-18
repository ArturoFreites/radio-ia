import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest): Promise<NextResponse> {
  if (request.nextUrl.pathname === "/aire" || request.nextUrl.pathname.startsWith("/aire/")) {
    const tokenParam = request.nextUrl.searchParams.get("token");
    if (tokenParam) {
      const cabinaUrl = new URL("/cabina", request.url);
      cabinaUrl.searchParams.set("token", tokenParam);
      return NextResponse.redirect(cabinaUrl);
    }
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/spotify",
    "/spotify/:path*",
    "/voces/:path*",
    "/anunciantes/:path*",
    "/publicidad",
    "/publicidad/:path*",
    "/locutores/:path*",
    "/configuracion/:path*",
    "/grilla/:path*",
    "/almacenamiento/:path*",
    "/aire",
    "/aire/:path*",
  ],
};
