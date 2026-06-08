"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function AdminLauncher() {
  const [open, setOpen] = useState(false);

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

        <div className="admin-launcher-options">
          <h2>Admin access</h2>
          <p>
            Open the protected admin hub. If your Cloudflare Access session is not active, Cloudflare will
            ask for an email code before the tools load.
          </p>
          <Link href="/admin" onClick={() => setOpen(false)}>
            <strong>Open admin hub</strong>
            <span>Authenticate with Cloudflare Access and choose a production mode.</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
