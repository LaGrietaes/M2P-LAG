/**
 * LoginModal — direct member authentication for LaGrieta.
 */

import { useState } from "react";
import { loginWithEmail } from "../lib/api";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoggedIn: () => void;
}

export function LoginModal({ isOpen, onClose, onLoggedIn }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid member email address.");
      return;
    }

    setPending(true);
    setError(null);

    try {
      await loginWithEmail(email.trim());
      onLoggedIn();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-[#040508] border border-border-strong p-0 overflow-hidden shadow-[0_0_60px_rgba(160,0,0,0.25)]">
        {/* Corner brackets */}
        <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-accent-bright pointer-events-none" />
        <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-accent-bright pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-accent-bright pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-accent-bright pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <div>
            <p className="font-mono text-label-caps text-text-secondary tracking-widest mb-0.5">
              IDENTITY PROTOCOL
            </p>
            <h2 className="font-display font-black text-xl text-white tracking-tight">
              MEMBER AUTHENTICATION
            </h2>
          </div>
          <button
            onClick={onClose}
            className="font-mono text-text-secondary hover:text-white transition-colors text-lg leading-none px-2 py-1"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <p className="font-mono text-xs text-text-secondary leading-relaxed">
            Link your LaGrieta member account to spend your B1T$ balance and unlock high-throughput extractions.
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] text-text-secondary uppercase tracking-widest">
              MEMBER EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. name@lagrieta.es"
              autoFocus
              disabled={pending}
              className="w-full px-3 py-2.5 bg-surface border border-border-subtle focus:border-accent-bright text-white font-mono text-sm outline-none transition-colors"
            />
          </div>

          {error && (
            <div className="p-3 text-xs font-mono text-accent-error bg-accent-error/10 border border-accent-error/40">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono tracking-wider uppercase text-text-secondary hover:text-white transition-colors"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={pending}
              className="glitch-text-hover px-5 py-2 text-xs font-mono font-bold tracking-wider uppercase text-white bg-accent border border-accent-bright shadow-[0_0_12px_rgba(160,0,0,0.4)] hover:bg-accent-bright transition-colors disabled:opacity-50"
            >
              <span className="glitch-target">
                {pending ? "AUTHENTICATING…" : "AUTHENTICATE"}
              </span>
            </button>
          </div>
        </form>

        <div className="px-6 pb-4 text-center font-mono text-[10px] text-text-secondary tracking-widest uppercase border-t border-border-subtle pt-3">
          SHARED SINERGIA IDENTITY // MEDUSA_DB
        </div>
      </div>
    </div>
  );
}
