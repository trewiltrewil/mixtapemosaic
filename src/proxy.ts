import { NextRequest, NextResponse } from "next/server";
import { isValidAdminToken } from "@/lib/admin-auth";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const protectsAdminPage = pathname.startsWith("/admin") || pathname.startsWith("/studio");
  const protectsCalibrationWrite = pathname === "/api/calibration" && request.method !== "GET";
  const protectsAdminApi = pathname.startsWith("/api/admin") && pathname !== "/api/admin/login";

  if (!protectsAdminPage && !protectsCalibrationWrite && !protectsAdminApi) {
    return NextResponse.next();
  }

  const isAdmin = await isValidAdminToken(request.cookies.get("mtm_admin")?.value);

  if (isAdmin) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Admin password required." }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.searchParams.set("admin", "locked");
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/studio/:path*", "/api/calibration", "/api/admin/:path*"]
};
