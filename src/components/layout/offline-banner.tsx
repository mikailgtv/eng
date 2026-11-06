"use client";

import { useEffect, useState } from "react";

/** Keeps the current screen visible when the network drops. Does not sign the user out. */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  if (!offline) return null;
  return (
    <p role="status" className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-950">
      You are offline. This page stays open. Try again when the connection returns.
    </p>
  );
}
