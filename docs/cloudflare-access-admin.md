# Cloudflare Access Admin Gate

Mixtape Mosaic uses Cloudflare Access as the production admin identity layer. Admin pages do not use an in-app password. The app verifies Cloudflare's signed Access JWT before serving admin routes or admin APIs.

## Routes To Protect In Cloudflare

Create a self-hosted Access application for `www.mixtapemosaic.com` and protect:

- `/admin/*`
- `/studio/*`
- `/api/admin/*`
- `/api/calibration`

## Access Policy

Create an allow policy:

- Action: `Allow`
- Include: `Emails`
- Email: `trevin@mixtapemosaic.com`

For the identity provider, Cloudflare One-Time PIN is enough for V1. It sends a login code to the allowed email address.

## Vercel Env Vars

Set these in Vercel for Production and Preview:

- `CLOUDFLARE_ACCESS_TEAM_DOMAIN`: your Zero Trust team domain, for example `https://your-team.cloudflareaccess.com`.
- `CLOUDFLARE_ACCESS_AUD`: the Access application's Audience Tag / AUD value.
- `CLOUDFLARE_ACCESS_ALLOWED_EMAILS`: `trevin@mixtapemosaic.com`.

Optional local development value:

- `ALLOW_LOCAL_ADMIN=true`

Local development is allowed by default unless `ALLOW_LOCAL_ADMIN=false`. Production always requires a valid Cloudflare Access JWT.

## Where To Find The Values

In Cloudflare Zero Trust:

1. Open **Access > Applications**.
2. Open the Mixtape Mosaic admin application.
3. Copy the **Application Audience (AUD) Tag** into `CLOUDFLARE_ACCESS_AUD`.
4. Use your team domain as `CLOUDFLARE_ACCESS_TEAM_DOMAIN`.

## Important Notes

- Do not trust request headers alone. The app validates the JWT signature against Cloudflare's Access certs.
- Direct Vercel URLs and preview deployments will not pass production admin checks unless they come with a valid Cloudflare Access token.
- If a new admin is added later, add their email to both the Cloudflare Access policy and `CLOUDFLARE_ACCESS_ALLOWED_EMAILS`.
