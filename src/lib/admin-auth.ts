const adminPayload = "mixtape-mosaic-admin";

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function adminPassword() {
  return process.env.ADMIN_PASSWORD ?? "admin";
}

export async function adminToken(secret = adminPassword()) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(adminPayload));
  return `admin.${bytesToHex(new Uint8Array(signature))}`;
}

export async function isValidAdminToken(token: string | undefined | null) {
  if (!token) {
    return false;
  }

  return token === (await adminToken());
}
