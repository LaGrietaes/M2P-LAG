/**
 * AuthStatus — shows current user state and register/sign-out (spec §4).
 * Restyled: identity/balance readout moves into the persistent sidebar (spec §4).
 */

import { useState, useEffect } from "react";
import { getQuota, getMe } from "../lib/api";
import { setAuthToken } from "../lib/guestToken";
import type { Session } from "../types";
import { StatusBadge } from "./ui/StatusBadge";

const LAGRIETA_AUTH_URL = import.meta.env.VITE_LAGRIETA_AUTH_URL as
  | string
  | undefined;

export function AuthStatus() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const [me, quota] = await Promise.all([getMe(), getQuota()]);
        setSession({
          ...me,
          quota,
          b1t_balance: quota.b1t_balance,
        });
      } catch {
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, []);

  if (loading) {
    return <div className="text-sm text-text-secondary font-mono">LOADING…</div>;
  }

  if (!session || session.role === "guest") {
    return (
      <div className="flex flex-col gap-3 text-sm text-text-secondary font-mono">
        <div className="flex items-center gap-2">
          <StatusBadge tone="accent">Guest</StatusBadge>
          <span>20s clip limit</span>
        </div>
        <a
          href={LAGRIETA_AUTH_URL || "#"}
          aria-disabled={!LAGRIETA_AUTH_URL}
          title={!LAGRIETA_AUTH_URL ? "Coming soon" : undefined}
          onClick={(e) => {
            if (!LAGRIETA_AUTH_URL) e.preventDefault();
          }}
          className={`px-3 py-1 text-sm text-text-primary bg-transparent border border-border-subtle hover:bg-surface-elevated transition-colors ${
            !LAGRIETA_AUTH_URL ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          Sign in with LaGrieta
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 text-sm text-text-primary font-mono">
      <div className="flex items-center gap-2">
        <StatusBadge tone="success">
          {session.name || session.email || session.user_id}
        </StatusBadge>
        <span className="text-text-secondary">({session.role})</span>
      </div>
      <div className="text-text-secondary">
        b1t$: <span className="text-text-primary tabular-nums">{session.b1t_balance}</span>
      </div>
      <button
        className="px-3 py-1 text-sm text-text-primary bg-transparent border border-border-subtle hover:bg-surface-elevated transition-colors"
        onClick={() => {
          setAuthToken(null);
          setSession(null);
        }}
      >
        Sign out
      </button>
    </div>
  );
}