/**
 * LoginModal — Tactical in-app authentication against LaGrieta network (medusa_db).
 */

import { useState } from "react";
import { loginDirectly } from "../lib/api";
import { useTranslation } from "../lib/i18n/I18nContext";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoggedIn: () => void;
}

export function LoginModal({ isOpen, onClose, onLoggedIn }: LoginModalProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError(t('login_modal.err_invalid_email'));
      return;
    }

    setPending(true);
    setError(null);

    try {
      await loginDirectly(cleanEmail);
      onLoggedIn();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login_modal.err_failed'));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-md mx-4 bg-[#040508] border border-border-strong p-0 overflow-hidden shadow-[0_0_60px_rgba(160,0,0,0.35)]">
        {/* Corner brackets */}
        <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-accent-bright pointer-events-none" />
        <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-accent-bright pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-accent-bright pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-accent-bright pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-surface/40">
          <div>
            <p className="font-mono text-label-caps text-text-secondary tracking-widest mb-0.5">
              {t('login_modal.protocol_tag')}
            </p>
            <h2 className="font-display font-black text-xl text-white tracking-tight">
              {t('login_modal.title')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="font-mono text-text-secondary hover:text-white transition-colors text-lg leading-none px-2 py-1 cursor-pointer"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="block font-mono text-xs text-text-secondary tracking-wider uppercase">
              MEMBER EMAIL / IDENTITY
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@lagrieta.es"
                disabled={pending}
                autoFocus
                className="w-full bg-[#080b11] border border-border-subtle focus:border-accent text-white font-mono text-sm px-4 py-3 outline-none transition-colors placeholder:text-text-secondary/40"
              />
            </div>
            <p className="font-mono text-[11px] text-text-secondary leading-relaxed">
              Authenticate directly with your LaGrieta account to sync your live B1T$ balance and unlock high-speed extractions.
            </p>
          </div>

          {error && (
            <div className="p-3 text-xs font-mono text-accent-error bg-accent-error/10 border border-accent-error/40">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="px-4 py-2 text-xs font-mono tracking-wider uppercase text-text-secondary hover:text-white transition-colors cursor-pointer"
            >
              {t('login_modal.btn_cancel').toUpperCase()}
            </button>
            <button
              type="submit"
              disabled={pending || !email.trim()}
              className="relative px-6 py-2.5 text-xs font-mono font-bold tracking-wider uppercase text-white bg-accent border border-accent-bright shadow-[0_0_12px_rgba(160,0,0,0.4)] hover:bg-accent-bright disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {pending ? t('login_modal.btn_pending') : t('login_modal.btn_login')}
            </button>
          </div>
        </form>

        {/* Footer info */}
        <div className="px-6 py-3 border-t border-border-subtle/50 bg-[#06080e] text-center font-mono text-[10px] text-text-secondary/70 tracking-widest uppercase">
          CONNECTED TO LAGRIETA SINERGIA NETWORK
        </div>
      </div>
    </div>
  );
}
