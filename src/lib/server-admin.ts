import { cookies } from "next/headers";
import { isValidAdminToken } from "./admin-auth";

export async function isAdminRequest() {
  const cookieStore = await cookies();
  return isValidAdminToken(cookieStore.get("mtm_admin")?.value);
}

