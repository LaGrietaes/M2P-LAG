/**
 * DevModeToggle — allows previewing registered-user features during development.
 *
 * Sends X-M2P-Dev-Role: user on every request (via lib/devMode.ts +
 * lib/api.ts's authHeaders()) so the backend's dev-only bypass
 * (M2P_DEV_MODE=true, see services/api/middleware.py) resolves a real
 * registered Session with a real, ledger-backed B1T$ balance — not a
 * frontend-only mock. Requires the backend to also have M2P_DEV_MODE=true;
 * otherwise the header is ignored and the app behaves as a normal guest.
 */

import { useState } from "react";
import { getMe } from "../lib/api";

type DevMode = "guest" | "registered";

export function DevModeToggle() {
  const [mode] = useState<DevMode>(() => {
    return (localStorage.getItem("m2p-dev-mode") as DevMode) || "guest";
  });
  const [backendDevModeOff, setBackendDevModeOff] = useState(false);
  const [checking, setChecking] = useState(false);

  const toggleMode = async () => {
    if (mode === "registered") {
      localStorage.setItem("m2p-dev-mode", "guest");
      // Every fetch (AuthStatus, Landing's quota poll, etc.) reads the dev
      // header fresh from lib/devMode.ts on each call, but those components
      // don't otherwise know to refetch when this toggle changes — a full
      // reload is the simplest way to make every already-mounted fetch see
      // the new identity consistently. Dev-only tooling, so this is fine.
      window.location.reload();
      return;
    }

    // Verify the backend actually honors the dev bypass BEFORE persisting
    // "registered" — writing it first and rolling back on failure would
    // leave a window where getDevRole() reports "registered" while nothing
    // has confirmed the backend agrees.
    setChecking(true);
    setBackendDevModeOff(false);
    try {
      localStorage.setItem("m2p-dev-mode", "registered");
      const me = await getMe();
      if (me.role !== "user" || me.provider !== "dev") {
        localStorage.setItem("m2p-dev-mode", "guest");
        setBackendDevModeOff(true);
        return;
      }
      window.location.reload();
    } catch {
      localStorage.setItem("m2p-dev-mode", "guest");
      setBackendDevModeOff(true);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="glass-panel-active p-4 border border-border-subtle">
        <div className="text-xs font-mono text-text-secondary mb-2 uppercase tracking-widest">
          Dev Mode
        </div>
        <button
          onClick={toggleMode}
          disabled={checking}
          className={`px-3 py-1 text-sm font-mono border transition-colors disabled:opacity-50 ${
            mode === "registered"
              ? "border-accent bg-accent/10 text-accent"
              : "border-border-subtle text-text-secondary hover:text-text-primary"
          }`}
        >
          {checking
            ? "Checking…"
            : mode === "registered"
              ? "Registered User"
              : "Guest"}
        </button>
        {backendDevModeOff && (
          <div className="mt-2 text-xs font-mono text-accent-error max-w-[200px]">
            Backend M2P_DEV_MODE is not enabled — still resolving as guest.
          </div>
        )}
      </div>
    </div>
  );
}
