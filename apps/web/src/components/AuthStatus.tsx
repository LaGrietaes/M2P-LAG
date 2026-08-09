/**
 * AuthStatus — shows current user state and login/logout (§20, §J).
 *
 * Phase 4: integrates with LaGrieta LAG-Bridge.
 * For now, shows guest state and a placeholder login button.
 */

import { useState, useEffect } from "react";
import { getQuota, getMe } from "../lib/api";
import type { Session } from "../types";

export function AuthStatus() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const [me, quota] = await Promise.all([getMe(), getQuota()]);
        setSession({
          ...me,
          quota: {
            max_clip_seconds: quota.max_clip_seconds,
            max_file_size: quota.max_file_size,
            daily_jobs: quota.daily_jobs_remaining,
            storage_quota: 0,
          },
          b1t_balance: quota.b1t_balance,
        } as Session);
      } catch {
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, []);

  if (loading) {
    return (
      <div className="text-sm text-gray-400">
        Loading...
      </div>
    );
  }

  if (!session || session.role === "guest") {
    return (
      <div className="text-sm text-gray-400">
        <span className="text-red-400 font-medium">Guest:</span>{" "}
        20s clip limit
        <button
          className="ml-4 px-3 py-1 text-sm text-white bg-gray-800 border border-gray-700 rounded hover:bg-gray-700"
          onClick={() => {
            /* Phase 4: open LaGrieta login flow */
            alert("LaGrieta login integration pending (Phase 4)");
          }}
        >
          Sign in with LaGrieta
        </button>
      </div>
    );
  }

  return (
    <div className="text-sm text-gray-300">
      <span className="text-green-400 font-medium">
        {session.name || session.email || session.user_id}
      </span>
      <span className="ml-2 text-gray-500">({session.role})</span>
      <span className="ml-2 text-gray-500">
        b1t$: {session.b1t_balance}
      </span>
      <button
        className="ml-4 px-3 py-1 text-sm text-gray-300 bg-gray-800 border border-gray-700 rounded hover:bg-gray-700"
        onClick={() => {
          /* Phase 4: logout */
          alert("Logout pending (Phase 4)");
        }}
      >
        Sign out
      </button>
    </div>
  );
}
