/**
 * DevMode utilities — supports guest, registered, and developer accounts.
 */

import { useState, useEffect } from "react";

export type DevRole = "guest" | "registered" | "developer";

export const isDevModeAvailable = import.meta.env.DEV;

export function getDevRole(): DevRole {
  return (localStorage.getItem("m2p-dev-mode") as DevRole) || "guest";
}

export function setDevRole(role: DevRole): void {
  localStorage.setItem("m2p-dev-mode", role);
  window.dispatchEvent(new Event("m2p-dev-mode-changed"));
}

export function useDevMode() {
  const [mode, setMode] = useState<DevRole>(getDevRole);

  useEffect(() => {
    const handleRoleChange = () => setMode(getDevRole());
    window.addEventListener("m2p-dev-mode-changed", handleRoleChange);
    window.addEventListener("storage", handleRoleChange);
    return () => {
      window.removeEventListener("m2p-dev-mode-changed", handleRoleChange);
      window.removeEventListener("storage", handleRoleChange);
    };
  }, []);

  return {
    isDeveloper: mode === "developer",
    isRegistered: mode === "registered" || mode === "developer",
    isGuest: mode === "guest",
    mode,
    setRole: (newRole: DevRole) => {
      setDevRole(newRole);
      setMode(newRole);
    },
  };
}
