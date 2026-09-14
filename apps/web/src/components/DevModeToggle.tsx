/**
 * DevModeToggle — dev-only HUD to switch between guest, registered, and developer accounts.
 * Fixed bottom-right corner, hidden in production builds.
 */

import { useState } from "react";
import { useDevMode, setDevRole } from "../lib/devMode";
import type { DevRole } from "../lib/devMode";

const ROLES: DevRole[] = ["guest", "registered", "developer"];

const ROLE_LABELS: Record<DevRole, string> = {
  guest: "GUEST",
  registered: "REGISTERED",
  developer: "DEVELOPER [∞]",
};

export function DevModeToggle() {
  const { mode, isDeveloper } = useDevMode();
  const [expanded, setExpanded] = useState(false);

  const handleSelect = (role: DevRole) => {
    setDevRole(role);
    setExpanded(false);
    window.location.reload();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-[#040508] border border-border-subtle p-3 shadow-lg min-w-[160px]">
        <div className="font-mono text-[9px] text-text-secondary mb-2 tracking-widest uppercase">
          Dev Mode
        </div>

        {/* Current role button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className={`w-full px-3 py-1.5 text-xs font-mono font-bold border transition-colors text-left ${
            isDeveloper
              ? "border-accent-bright bg-accent/20 text-accent-bright"
              : mode === "registered"
              ? "border-accent bg-accent/10 text-accent"
              : "border-border-subtle text-text-secondary hover:text-white"
          }`}
        >
          {ROLE_LABELS[mode]} ▾
        </button>

        {/* Role selector */}
        {expanded && (
          <div className="mt-1 border border-border-subtle bg-[#0a0e14]">
            {ROLES.filter((r) => r !== mode).map((role) => (
              <button
                key={role}
                onClick={() => handleSelect(role)}
                className="block w-full px-3 py-1.5 text-xs font-mono text-left text-text-secondary hover:text-white hover:bg-surface-elevated transition-colors"
              >
                {ROLE_LABELS[role]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
