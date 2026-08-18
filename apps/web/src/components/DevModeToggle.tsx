/**
 * DevModeToggle — dev-only HUD to switch between guest, registered, and developer accounts.
 * Fixed bottom-right corner, hidden in production builds.
 */

import { useState } from "react";
import { getMe } from "../lib/api";
import { useDevMode, setDevRole } from "../lib/devMode";
import type { DevRole } from "../lib/devMode";

export function DevModeToggle() {
  const { mode, isDeveloper } = useDevMode();
  const [checking, setChecking] = useState(false);
  const [backendOff, setBackendOff] = useState(false);

  const cycleMode = async () => {
    if (mode === "guest") {
      setChecking(true);
      setBackendOff(false);
      try {
        localStorage.setItem("m2p-dev-mode", "registered");
        const me = await getMe();
        if (me.role === "user" && me.provider === "dev") {
          setDevRole("registered");
          window.location.reload();
        } else {
          setDevRole("guest");
          setBackendOff(true);
        }
      } catch {
        setDevRole("guest");
        setBackendOff(true);
      } finally {
        setChecking(false);
      }
    } else if (mode === "registered") {
      setDevRole("developer" as DevRole);
      window.location.reload();
    } else {
      setDevRole("guest");
      window.location.reload();
    }
  };

  const modeLabel: Record<DevRole, string> = {
    guest: "GUEST",
    registered: "REGISTERED",
    developer: "DEVELOPER [∞]",
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-[#040508] border border-border-subtle p-3 shadow-lg">
        <div className="font-mono text-[9px] text-text-secondary mb-2 tracking-widest uppercase">
          Dev Mode HUD
        </div>
        <button
          onClick={cycleMode}
          disabled={checking}
          className={`px-3 py-1.5 text-xs font-mono font-bold border transition-colors w-full text-left disabled:opacity-50 ${
            isDeveloper
              ? "border-accent-bright bg-accent/20 text-accent-bright"
              : mode === "registered"
              ? "border-accent bg-accent/10 text-accent"
              : "border-border-subtle text-text-secondary hover:text-white"
          }`}
        >
          {checking ? "Checking…" : modeLabel[mode]}
        </button>
        <div className="font-mono text-[9px] text-text-secondary mt-1 tracking-wider">
          Click to cycle →
        </div>
        {backendOff && (
          <div className="mt-2 font-mono text-[9px] text-accent-error max-w-[160px]">
            Backend M2P_DEV_MODE not enabled.
          </div>
        )}
      </div>
    </div>
  );
}
