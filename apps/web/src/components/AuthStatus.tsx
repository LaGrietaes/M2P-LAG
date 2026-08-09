/**
 * AuthStatus — shows current user state and register/sign-out (spec §4).
 *
 * Register redirects to LaGrieta's auth (VITE_LAGRIETA_AUTH_URL); disabled
 * with a "Coming soon" state until that URL is configured, since LAG-Bridge
 * is not yet live on the LaGrieta side (docs/LAG-BRIDGE.md).
 */

import { useState, useEffect } from "react";
import { getQuota, getMe } from "../lib/api";
import { setAuthToken } from "../lib/guestToken";
import type { Session } from "../types";

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
    return <div className="text-sm text-gray-400">Loading...</div>;
  }

  if (!session || session.role === "guest") {
    return (
      <div className="flex items-center gap-4 text-sm text-gray-400">
        <span>
          <span className="text-brand-red font-medium">Guest:</span> 20s clip limit
        </span>
        <a
          href={LAGRIETA_AUTH_URL || "#"}
          aria-disabled={!LAGRIETA_AUTH_URL}
          title={!LAGRIETA_AUTH_URL ? "Coming soon" : undefined}
          onClick={(e) => {
            if (!LAGRIETA_AUTH_URL) e.preventDefault();
          }}
          className={`px-3 py-1 text-sm text-white bg-gray-800 border border-gray-700 rounded hover:bg-gray-700 ${
            !LAGRIETA_AUTH_URL ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          Sign in with LaGrieta
        </a>
      </div>
    );
  }

  return (
    <div className="text-sm text-gray-300">
      <span className="text-green-400 font-medium">
        {session.name || session.email || session.user_id}
      </span>
      <span className="ml-2 text-gray-500">({session.role})</span>
      <span className="ml-2 text-gray-500">b1t$: {session.b1t_balance}</span>
      <button
        className="ml-4 px-3 py-1 text-sm text-gray-300 bg-gray-800 border border-gray-700 rounded hover:bg-gray-700"
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
