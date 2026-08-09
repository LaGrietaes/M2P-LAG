/**
 * DevModeToggle — allows previewing registered-user features during development.
 *
 * Toggles between "Guest" and "Registered User" view to test:
 * - Source download button
 * - Longer clip extraction limits
 * - Audio/transcript extraction modes
 * - b1t$ balance display
 */

import { useState, useEffect } from "react";

export const isDevModeAvailable = import.meta.env.DEV;

type DevMode = "guest" | "registered";

export function DevModeToggle() {
  const [mode, setMode] = useState<DevMode>(() => {
    return (localStorage.getItem("m2p-dev-mode") as DevMode) || "guest";
  });

  useEffect(() => {
    localStorage.setItem("m2p-dev-mode", mode);
  }, [mode]);

  const simulateRegisteredUser = () => {
    setMode(mode === "guest" ? "registered" : "guest");
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-xl">
        <div className="text-xs text-gray-400 mb-2">Dev Mode</div>
        <button
          onClick={simulateRegisteredUser}
          className={`px-3 py-1 text-sm rounded ${
            mode === "registered"
              ? "bg-green-600 text-white"
              : "bg-gray-800 text-gray-300 border border-gray-700"
          }`}
        >
          {mode === "registered" ? "Registered User" : "Guest"}
        </button>
        {mode === "registered" && (
          <div className="mt-2 text-xs text-gray-400">
            <div>b1t$: 100</div>
            <div>Max clip: 300s</div>
            <div>Source download: enabled</div>
          </div>
        )}
      </div>
    </div>
  );
}

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
