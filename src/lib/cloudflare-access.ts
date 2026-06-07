import { jwtVerify, createRemoteJWKSet, type JWTPayload } from "jose";

const defaultAdminEmail = "trevin@mixtapemosaic.com";

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let jwksIssuer = "";

function normalizeIssuer(teamDomain: string) {
  const trimmed = teamDomain.trim().replace(/\/+$/, "");
  if (!trimmed) {
    return "";
  }

  return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
}

function cloudflareAccessConfig() {
  const issuer = normalizeIssuer(process.env.CLOUDFLARE_ACCESS_TEAM_DOMAIN ?? "");
  const audience = process.env.CLOUDFLARE_ACCESS_AUD ?? "";
  const allowedEmails = (process.env.CLOUDFLARE_ACCESS_ALLOWED_EMAILS ?? defaultAdminEmail)
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return { issuer, audience, allowedEmails };
}

function cloudflareJwks(issuer: string) {
  if (!jwks || jwksIssuer !== issuer) {
    jwksIssuer = issuer;
    jwks = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
  }

  return jwks;
}

export function getCloudflareAccessToken(input: { headers: Headers; cookies?: { get(name: string): { value: string } | undefined } }) {
  return input.headers.get("cf-access-jwt-assertion") || input.cookies?.get("CF_Authorization")?.value || null;
}

function payloadEmail(payload: JWTPayload) {
  const email = payload.email;
  return typeof email === "string" ? email.toLowerCase() : "";
}

export async function isValidCloudflareAccessToken(token: string | null | undefined) {
  if (!token) {
    return false;
  }

  const { issuer, audience, allowedEmails } = cloudflareAccessConfig();
  if (!issuer || !audience || allowedEmails.length === 0) {
    return false;
  }

  try {
    const { payload } = await jwtVerify(token, cloudflareJwks(issuer), {
      issuer,
      audience
    });

    return allowedEmails.includes(payloadEmail(payload));
  } catch {
    return false;
  }
}

export async function isAdminAccessAllowed(input: { headers: Headers; cookies?: { get(name: string): { value: string } | undefined } }) {
  if (process.env.NODE_ENV !== "production" && process.env.ALLOW_LOCAL_ADMIN !== "false") {
    return true;
  }

  return isValidCloudflareAccessToken(getCloudflareAccessToken(input));
}
