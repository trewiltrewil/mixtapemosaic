# Cloudflare Access Admin Gate

Mixtape Mosaic uses Cloudflare Access as the production admin identity layer. Admin pages do not use an in-app password. The app verifies Cloudflare's signed Access JWT before serving admin routes or admin APIs.

## Routes To Protect In Cloudflare

Create a self-hosted Access application for the dedicated admin hostname:

- Hostname: `admin.mixtapemosaic.com`
- Path: blank / entire hostname

The public site still has an `Esc` launcher, but that launcher does not authenticate by itself. It links to `https://admin.mixtapemosaic.com/admin`. If Cloudflare Access is configured correctly and the browser does not already have a valid Access session, that navigation should show the Cloudflare Access one-time PIN screen.

## Access Policy

Create an allow policy:

- Action: `Allow`
- Include: `Emails`
- Email: `trevin@mixtapemosaic.com`

For the identity provider, Cloudflare One-Time PIN is enough for V1. It sends a login code to the allowed email address.

## Vercel Env Vars

Set these in Vercel for Production and Preview:

- `NEXT_PUBLIC_ADMIN_ORIGIN`: `https://admin.mixtapemosaic.com`.
- `CLOUDFLARE_ACCESS_TEAM_DOMAIN`: your Zero Trust team domain, for example `https://your-team.cloudflareaccess.com`.
- `CLOUDFLARE_ACCESS_AUD`: the Access application's Audience Tag / AUD value.
- `CLOUDFLARE_ACCESS_ALLOWED_EMAILS`: `trevin@mixtapemosaic.com`.

Optional local development value:

- `ALLOW_LOCAL_ADMIN=true`

Local development is allowed by default unless `ALLOW_LOCAL_ADMIN=false`. Production always requires a valid Cloudflare Access JWT.

## Where To Find The Values

In Cloudflare Zero Trust:

1. Open **Access > Applications**.
2. Open the `admin.mixtapemosaic.com` admin application.
3. Copy the **Application Audience (AUD) Tag** into `CLOUDFLARE_ACCESS_AUD`.
4. Use your team domain as `CLOUDFLARE_ACCESS_TEAM_DOMAIN`.

## DNS And Vercel

Add `admin.mixtapemosaic.com` to the same Vercel project as the public site. This was added to the `mixtapemosaic` Vercel project on June 8, 2026.

In Cloudflare DNS, create:

- Type: `A`
- Name: `admin`
- Target: `76.76.21.21`
- Proxy status: Proxied / orange cloud

## Important Notes

- Do not trust request headers alone. The app validates the JWT signature against Cloudflare's Access certs.
- Direct Vercel URLs and preview deployments will not pass production admin checks unless they come with a valid Cloudflare Access token.
- If a new admin is added later, add their email to both the Cloudflare Access policy and `CLOUDFLARE_ACCESS_ALLOWED_EMAILS`.
- If incognito can open `https://admin.mixtapemosaic.com/admin` without a Cloudflare screen, the admin DNS record is not proxied or the Access application is not covering the admin hostname.
- If `https://www.mixtapemosaic.com/admin` does not redirect to `https://admin.mixtapemosaic.com/admin`, check `NEXT_PUBLIC_ADMIN_ORIGIN` and the deployed proxy.
