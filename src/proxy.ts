import { NextRequest, NextResponse } from "next/server";
import { isAdminAccessAllowed } from "@/lib/cloudflare-access";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const protectsAdminPage = pathname.startsWith("/admin") || pathname.startsWith("/studio");
  const protectsCalibrationWrite = pathname === "/api/calibration" && request.method !== "GET";
  const protectsAdminApi = pathname.startsWith("/api/admin");

  if (!protectsAdminPage && !protectsCalibrationWrite && !protectsAdminApi) {
    return NextResponse.next();
  }

  const isAdmin = await isAdminAccessAllowed({
    headers: request.headers,
    cookies: request.cookies
  });

  if (isAdmin) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Cloudflare Access admin login required." }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.searchParams.set("admin", "locked");
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/studio/:path*", "/api/calibration", "/api/admin/:path*"]
};
