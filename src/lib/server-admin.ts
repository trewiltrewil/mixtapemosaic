import { cookies, headers } from "next/headers";
import { isAdminAccessAllowed } from "./cloudflare-access";

export async function isAdminRequest() {
  const cookieStore = await cookies();
  const headerStore = await headers();

  return isAdminAccessAllowed({
    headers: headerStore,
    cookies: cookieStore
  });
}
