"use client";

import { useEffect, useState } from "react";

function adminHref() {
  const origin = (process.env.NEXT_PUBLIC_ADMIN_ORIGIN || "https://admin.mixtapemosaic.com").replace(/\/+$/, "");
  return `${origin}/admin`;
}

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
          <h2>Admin tools</h2>
          <p>Continue if your account has access.</p>
          <a href={adminHref()} onClick={() => setOpen(false)}>
            <strong>Continue</strong>
            <span>Open internal tools.</span>
          </a>
        </div>
      </div>
    </div>
  );
}
