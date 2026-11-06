"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Keep client telemetry free of exception text and learner content.
    console.error("[global-ui-error]", { referenceId: error.digest ?? "unavailable" });
  }, [error.digest]);
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", fontFamily: "system-ui, sans-serif", background: "#f7f9fc", color: "#172033" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
          <section style={{ width: "100%", maxWidth: 480, border: "1px solid #dce3ee", borderRadius: 20, background: "white", padding: 32, boxShadow: "0 16px 48px #1d31520d" }}>
            <p style={{ margin: 0, color: "#b45309", fontSize: 12, fontWeight: 800, letterSpacing: ".12em" }}>ENGLISHBRIDGE · RECOVERY</p>
            <h1 style={{ margin: "12px 0 8px", fontSize: 24 }}>This page could not load</h1>
            <p style={{ margin: 0, color: "#5b6474", lineHeight: 1.6 }}>This screen did not finish loading. If you just submitted work, check your progress before retrying.</p>
            {error.digest && <p style={{ margin: "16px 0 0", color: "#6b7280", fontSize: 12 }}>Reference: {error.digest}</p>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 24 }}>
              <button onClick={reset} style={{ border: 0, borderRadius: 10, padding: "11px 16px", background: "#2457cc", color: "white", fontWeight: 700, cursor: "pointer" }}>Retry</button>
              <a href="/" style={{ border: "1px solid #dce3ee", borderRadius: 10, padding: "10px 16px", color: "#172033", fontWeight: 700, textDecoration: "none" }}>Go home</a>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
