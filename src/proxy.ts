import { NextRequest, NextResponse } from "next/server";
import { isAdminAccessAllowed } from "@/lib/cloudflare-access";

function adminOrigin() {
  return (process.env.NEXT_PUBLIC_ADMIN_ORIGIN || "https://admin.mixtapemosaic.com").replace(/\/+$/, "");
}

function requestHost(request: NextRequest) {
  return request.headers.get("x-forwarded-host") || request.headers.get("host") || request.nextUrl.host;
}

function isAdminHost(request: NextRequest) {
  try {
    return requestHost(request).toLowerCase() === new URL(adminOrigin()).host.toLowerCase();
  } catch {
    return false;
  }
}

function redirectToAdminOrigin(request: NextRequest) {
  const url = new URL(request.nextUrl.pathname + request.nextUrl.search, adminOrigin());
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const protectsAdminPage = pathname.startsWith("/admin") || pathname.startsWith("/studio");
  const protectsCalibrationWrite = pathname === "/api/calibration" && request.method !== "GET";
  const protectsAdminApi = pathname.startsWith("/api/admin");

  if (!protectsAdminPage && !protectsCalibrationWrite && !protectsAdminApi) {
    return NextResponse.next();
  }

  if (protectsAdminPage && !isAdminHost(request)) {
    return redirectToAdminOrigin(request);
  }

  const isAdmin = await isAdminAccessAllowed({
    headers: request.headers,
    cookies: request.cookies
  });

  if (isAdmin) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  return new NextResponse("Admin access required.", {
    status: 401,
    headers: {
      "content-type": "text/plain; charset=utf-8"
    }
  });
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/studio", "/studio/:path*", "/api/calibration", "/api/admin/:path*"]
};
