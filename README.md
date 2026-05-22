# Mixtape Mosaic

A Next.js App Router prototype for personalized cassette tape wall art. It keeps the original DTF production workflow while adding a customer-facing customizer and photo-mapped product preview.

## Run

```powershell
npm install
npm run dev
```

Open http://localhost:4173.

On Windows, `start-server.cmd` launches the same local Next.js dev server in the background.

Copy `.env.example` to `.env.local` when enabling hosted services. The app runs without service keys, then turns on Supabase, Stripe, and Sanity behavior as the matching env vars are added.

## Hosted Services

- Vercel hosts the Next.js demo from the GitHub `main` branch.
- Supabase stores visitor events, customization sessions, proof requests, Stripe-backed orders, uploaded artwork, preview snapshots, and deployed calibration JSON.
- Stripe Checkout handles V1 payments in test mode.
- Sanity content is read through `@sanity/client`; `/studio` is an admin-protected schema guide for the external Sanity Studio setup. The embedded Studio packages were avoided so `npm audit --audit-level=moderate` stays clean.

## Routes

- `/customize` - Customer-facing customizer with sample artwork, upload-ready image selection, a realistic product preview, and a real empty-by-default cart.
- `/admin/production` - Production export flow with transparent PNG export and optimized 22 inch gang sheet PDFs.
- `/admin/calibrate` - Photo calibration editor for the prototype wall-unit image. Run the per-tape vision estimate, zoom/pan for manual corner cleanup, import/export JSON, and save calibration used by customer previews.
- `/studio` - Admin-protected Sanity schema guide for CMS content once `NEXT_PUBLIC_SANITY_PROJECT_ID` and `NEXT_PUBLIC_SANITY_DATASET` are configured.

## Production Defaults

- Tape size: 100 mm x 64 mm
- Gap to the right of each tape: 3.5 mm
- Gap below each tape: 14.5 mm
- Default array: 6 columns x 9 rows
- Raised lower section break: enabled by default with 1.5 mm transparent clearance
- Raised lower section height: 15.5 mm

The PNG export leaves inter-tape gaps and bottom raised-section separators transparent. The gang sheet export preserves exact tape sizing, reflows five tapes across a 22 inch sheet, compares the available print tiers, and downloads separate `_partX` PDFs when splitting saves money. Each PDF stamps its rounded full sheet size in the top-left margin for printer calibration.

## Preview Renderer

The realistic preview uses the prototype product photo as a base, warps the selected artwork onto each calibrated tape quadrilateral, restores the original photo through drive holes, screw holes, raised-section alignment holes, and the raised-section edge gap, and keeps tape unevenness visible so the customer preview stays honest about the vintage materials. The cassette window between the drive holes is intentionally not cut out.

## Calibration

The V1 calibrator uses a practical per-tape pipeline: each cassette starts from a perspective seed, then the four edges are refined independently from local image contrast. This is not a hosted SAM/YOLO model yet, but it keeps the data model ready for instance masks later: every tape is still stored as its own quadrilateral and rendered through its own homography-style warp.

Use `/admin/calibrate`, click `Vision estimate`, zoom in to correct corners, then click `Save JSON`. When Supabase is configured, calibration is saved in the `site_settings` table; otherwise local development falls back to `public/calibration/prototype-wall-unit-calibration.json`.

Each tape now stores its own editable feature geometry:
- transparent drive holes and corner screw holes
- rounded cassette-face corners
- raised lower-section polygon with a 0.5 mm edge gap
- raised-section alignment holes that cut through to the photo
