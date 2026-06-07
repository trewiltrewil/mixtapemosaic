# Cloudflare Access Admin Gate

Use Cloudflare Access as the public production gate for Mixtape Mosaic internal tools. This protects admin routes before they reach Vercel.

## Routes To Protect

Create a self-hosted Access application for `www.mixtapemosaic.com` and protect:

- `/admin/*`
- `/studio/*`
- `/api/admin/*`
- `/api/calibration`

Keep the existing in-app admin password enabled as a second lock and as a fallback for direct Vercel preview testing.

## Policy

Create an allow policy:

- Action: `Allow`
- Include: `Emails`
- Email: `trevin@mixtapemosaic.com`

For the identity provider, Cloudflare One-Time PIN is enough for V1. It sends a login code to the allowed email address and avoids building our own authentication flow.

## Vercel Env Vars

Set these in Vercel for Production and Preview:

- `ADMIN_PASSWORD`: a strong password for the in-app secondary lock.
- `ADMIN_SESSION_SECRET`: a long random string used to sign the admin cookie.

Do not leave either value empty in production. The app now fails closed if `ADMIN_PASSWORD` is missing.

## Important Notes

- Cloudflare Access only protects traffic that comes through the Cloudflare-managed domain.
- Keep the app's password gate because direct Vercel URLs and preview deployments can still exist outside Cloudflare Access.
- If we later want no password prompt after Cloudflare login, add server-side validation for Cloudflare Access JWTs instead of trusting request headers directly.
