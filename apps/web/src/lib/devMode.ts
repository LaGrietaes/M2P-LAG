/**
 * DevMode utilities — exported separately to avoid react-refresh/only-export-components lint error
 */

import { useState } from "react";

type DevMode = "guest" | "registered";

export const isDevModeAvailable = import.meta.env.DEV;

/**
 * Plain (non-hook) accessor so api.ts's authHeaders() can read the current
 * dev-mode choice outside React — mirrors getGuestToken()/getAuthToken() in
 * guestToken.ts. Only meaningful when the backend also has M2P_DEV_MODE=true
 * (services/api/config.py); the header is otherwise ignored.
 */
export function getDevRole(): DevMode {
  return (localStorage.getItem("m2p-dev-mode") as DevMode) || "guest";
}

export function useDevMode() {
  const [mode] = useState<DevMode>(getDevRole);

  return {
    isRegistered: mode === "registered",
    isGuest: mode === "guest",
    mode,
  };
}
