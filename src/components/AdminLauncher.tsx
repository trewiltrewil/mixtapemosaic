"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

export function AdminLauncher() {
  const [open, setOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [seedStatus, setSeedStatus] = useState("");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      const target = event.target as HTMLElement | null;
      const isTextEntry =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;

      if (isTextEntry && !open) {
        return;
      }

      event.preventDefault();
      setOpen((current) => !current);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    fetch("/api/admin/login", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ password })
    }).then((response) => {
      if (response.ok) {
        setUnlocked(true);
        return;
      }

      setError("Wrong password.");
    }).catch(() => setError("Could not unlock admin."));
  }

  function seedSanity() {
    setSeedStatus("Seeding starter content...");
    fetch("/api/admin/sanity/seed", { method: "POST" })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error || "Seed failed.");
        }

        setSeedStatus(`Seed complete: ${payload.created} created, ${payload.skipped} already existed.`);
      })
      .catch((seedError) => {
        setSeedStatus(seedError instanceof Error ? seedError.message : "Could not seed Sanity.");
      });
  }

  if (!open) {
    return null;
  }

  return (
    <div className="admin-launcher-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
      <div
        className="admin-launcher"
        role="dialog"
        aria-modal="true"
        aria-label="Admin access"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="admin-launcher-header">
          <p className="eyebrow">Internal</p>
          <button type="button" aria-label="Close admin access" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>

        {!unlocked ? (
          <form onSubmit={submit}>
            <h2>Admin access</h2>
            <p>Enter the local admin password to choose a production mode.</p>
            <label>
              Password
              <input
                autoFocus
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="admin"
              />
            </label>
            {error ? <p className="admin-launcher-error">{error}</p> : null}
            <button type="submit" className="primary-button">
              Unlock
            </button>
          </form>
        ) : (
          <div className="admin-launcher-options">
            <h2>Choose admin mode</h2>
            <Link href="/admin/production" onClick={() => setOpen(false)}>
              <strong>Decal PDF production</strong>
              <span>Export transparent artwork and optimized gang-sheet PDFs.</span>
            </Link>
            <Link href="/admin/calibrate" onClick={() => setOpen(false)}>
              <strong>Photo mapping editor</strong>
              <span>Align tape polygons, holes, raised sections, and public preview crop.</span>
            </Link>
            <Link href="/admin/images" onClick={() => setOpen(false)}>
              <strong>Customizer artwork library</strong>
              <span>Upload approved cassette-configurator artwork and web preview derivatives.</span>
            </Link>
            <Link href="/studio" onClick={() => setOpen(false)}>
              <strong>Sanity content studio</strong>
              <span>Edit pages, journal posts, FAQ, gallery items, and live product variants.</span>
            </Link>
            <button type="button" onClick={seedSanity}>
              <strong>Seed Sanity starter content</strong>
              <span>Populate Studio with the current starter pages, posts, FAQs, gallery items, and product variants.</span>
            </button>
            {seedStatus ? <p className="admin-launcher-error">{seedStatus}</p> : null}
          </div>
        )}
      </div>
    </div>
  );
}
