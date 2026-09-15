import { Logo } from "./Logo";
import { useDevMode, isDevModeAvailable } from "../lib/devMode";
import type { QuotaResponse } from "../types";

interface HeaderHUDProps {
  quota: QuotaResponse | null;
  onOpenBuyModal: () => void;
  onOpenLoginModal: () => void;
  onLogout?: () => void;
}

export function HeaderHUD({
  quota,
  onOpenBuyModal,
  onOpenLoginModal,
  onLogout,
}: HeaderHUDProps) {
  const { isDeveloper, isRegistered } = useDevMode();

  const isUserLoggedIn = quota?.role === "registered" || quota?.role === "user";

  const roleText = (isDevModeAvailable && isDeveloper)
    ? "DEVELOPER [UNLIMITED]"
    : (isDevModeAvailable && isRegistered)
    ? "REGISTERED [DEV]"
    : isUserLoggedIn
    ? (quota?.name || quota?.email?.split("@")[0] || "REGISTERED").toUpperCase()
    : "GUEST";

  const balanceText = (isDevModeAvailable && isDeveloper)
    ? "∞ B1T$ [OVERRIDE]"
    : isUserLoggedIn
    ? `${quota?.b1t_balance ?? 0} B1T$`
    : quota?.free_download_used
    ? "0 FREE DL"
    : "1 FREE DL";

  return (
    <header className="relative z-10 border-b border-border-subtle bg-[#040508]/90 backdrop-blur-md px-4 sm:px-8 py-3 flex items-center justify-between">
      {/* Brand Group */}
      <div className="flex items-center gap-3">
        <Logo className="w-7 h-7" />
        <span className="font-display font-black text-xl tracking-tight text-white">
          M2P
        </span>
        <span className="hidden sm:inline-block font-mono text-[10px] tracking-[0.15em] text-text-secondary uppercase border-l border-border-subtle pl-3">
          MEDIA 2 PEER // TACTICAL
        </span>
      </div>

      {/* Right HUD Status */}
      <div className="flex items-center gap-2 sm:gap-4 font-mono text-xs">
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-surface border border-border-subtle text-text-secondary">
          <span>SIGNAL:</span>
          <span className="text-[#10b981] font-bold">LOCKED</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border-subtle text-text-secondary">
          <span className="hidden sm:inline">IDENTITY:</span>
          <strong className={isDeveloper && isDevModeAvailable ? "text-accent-bright font-bold" : isUserLoggedIn ? "text-white font-bold" : "text-text-secondary"}>
            {roleText}
          </strong>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border-subtle text-text-secondary">
          <span className="hidden sm:inline">BALANCE:</span>
          <strong className="text-accent-bright font-extrabold">{balanceText}</strong>
        </div>

        {/* In-app Direct Login Button for Guests */}
        {!isUserLoggedIn && !(isDevModeAvailable && (isDeveloper || isRegistered)) && (
          <button
            onClick={onOpenLoginModal}
            className="px-3 py-1.5 text-xs font-mono font-bold tracking-wider uppercase text-white bg-white/5 border border-border-subtle hover:border-accent hover:text-accent transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <span>LOG IN</span>
          </button>
        )}

        {/* Logout Button for Logged-In Users */}
        {isUserLoggedIn && onLogout && (
          <button
            onClick={onLogout}
            className="px-2.5 py-1.5 text-xs font-mono tracking-wider uppercase text-text-secondary hover:text-white border border-transparent hover:border-border-subtle transition-colors cursor-pointer"
            title="Log out"
          >
            LOG OUT
          </button>
        )}

        <button
          onClick={onOpenBuyModal}
          className="glitch-text-hover relative px-4 py-1.5 text-xs font-mono font-bold tracking-wider uppercase text-white bg-accent border border-accent-bright shadow-[0_0_12px_rgba(160,0,0,0.4)] hover:bg-accent-bright transition-colors"
        >
          <span className="glitch-target">
            {isDeveloper && isDevModeAvailable ? "BUY B1T$ (0 B1T$)" : "BUY B1T$"}
          </span>
        </button>
      </div>
    </header>
  );
}
