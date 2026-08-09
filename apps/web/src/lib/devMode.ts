/**
 * DevMode utilities — exported separately to avoid react-refresh/only-export-components lint error
 */

import { useState } from "react";

type DevMode = "guest" | "registered";

export const isDevModeAvailable = import.meta.env.DEV;

export function useDevMode() {
  const [mode] = useState<DevMode>(() => {
    return (localStorage.getItem("m2p-dev-mode") as DevMode) || "guest";
  });

  return {
    isRegistered: mode === "registered",
    isGuest: mode === "guest",
    mode,
  };
}
