import { Logo } from "./Logo";
import { useDevMode, isDevModeAvailable } from "../lib/devMode";
import type { QuotaResponse } from "../types";

interface HeaderHUDProps {
  quota: QuotaResponse | null;
  onOpenLoginModal: () => void;
  onOpenB1tInfo?: () => void;
  onLogout?: () => void;
}

export function HeaderHUD({
  quota,
  onOpenLoginModal,
  onOpenB1tInfo,
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
        <div className="flex items-baseline gap-2">
          <span className="font-display font-black text-xl tracking-tight text-white">
            M2P
          </span>
          <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold tracking-widest uppercase bg-accent/20 border border-accent/40 text-accent-bright">
            OPEN BETA
          </span>
        </div>
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

        {/* Consolidated Identity & Balance Status Capsule */}
        <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-surface border border-border-subtle text-text-secondary text-[11px] sm:text-xs">
          {isUserLoggedIn && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" title="Conectado a La Grieta" />
          )}
          <span className="hidden sm:inline">ID:</span>
          <strong className={isDeveloper && isDevModeAvailable ? "text-accent-bright font-bold" : isUserLoggedIn ? "text-white font-bold" : "text-text-secondary"}>
            {roleText}
          </strong>
          <span className="text-border-subtle">·</span>
          <strong className="text-accent-bright font-extrabold">{balanceText}</strong>
          {onOpenB1tInfo && (
            <button
              type="button"
              onClick={onOpenB1tInfo}
              className="text-[10px] text-text-secondary hover:text-white px-1 ml-0.5 border border-border-subtle/60 hover:border-accent transition-colors cursor-pointer"
              title="¿Qué son los B1T$?"
              aria-label="Información sobre créditos B1T$"
            >
              ?
            </button>
          )}
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
      </div>
    </header>
  );
}
