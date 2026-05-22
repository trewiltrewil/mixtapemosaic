"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const anonymousIdKey = "mixtape-mosaic-anonymous-id";

function getAnonymousId() {
  let id = window.localStorage.getItem(anonymousIdKey);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(anonymousIdKey, id);
  }
  return id;
}

export function VisitorTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const anonymousId = getAnonymousId();
    void fetch("/api/events", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        eventName: "page_view",
        anonymousId,
        path: pathname
      })
    });
  }, [pathname]);

  return null;
}
