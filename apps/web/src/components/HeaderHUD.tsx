import { useState, useEffect, useRef } from "react";
import { Logo } from "./Logo";
import { useDevMode, isDevModeAvailable } from "../lib/devMode";
import { useTranslation } from "../lib/i18n/I18nContext";
import { LanguageSelector } from "./LanguageSelector";
import type { QuotaResponse } from "../types";
import {
  InfoIcon,
  ChevronDownIcon,
  UserIcon,
  HistoryIcon,
  ExternalLinkIcon,
} from "./ui/Icons";

interface HeaderHUDProps {
  quota: QuotaResponse | null;
  onOpenLoginModal: () => void;
  onOpenB1tInfo?: () => void;
  // onOpenBoosters?: (tab?: "boosters" | "passes" | "protocol") => void; // Payments disabled until further notice
  onLogout?: () => void;
}

interface DownloadHistoryItem {
  id: string;
  title: string;
  filename: string;
  timestamp: number;
}

export function HeaderHUD({
  quota,
  onOpenLoginModal,
  onOpenB1tInfo,
  // onOpenBoosters, // Payments disabled until further notice
  onLogout,
}: HeaderHUDProps) {
  const { isDeveloper, isRegistered } = useDevMode();
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [downloads, setDownloads] = useState<DownloadHistoryItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isUserLoggedIn =
    quota?.role === "registered" ||
    quota?.role === "user" ||
    (isDevModeAvailable && (isDeveloper || isRegistered));

  const userName = (isDevModeAvailable && isDeveloper)
    ? "DEVELOPER"
    : (isDevModeAvailable && isRegistered)
    ? "DEV_OPERATOR"
    : isUserLoggedIn
    ? (quota?.name || quota?.email?.split("@")[0] || "OPERADOR")
    : "GUEST";

  const balanceText = (isDevModeAvailable && isDeveloper)
    ? "∞ B1T$"
    : isUserLoggedIn
    ? `${quota?.b1t_balance ?? 0} B1T$`
    : quota?.free_download_used
    ? "0 FREE DL"
    : "1 FREE DL";

  // Status colors matching La Grieta HUD island
  const statusColor = isUserLoggedIn
    ? "bg-[#10b981]" // online green
    : "bg-[#ffb04e]"; // guest amber

  // Load download history
  useEffect(() => {
    const loadHistory = () => {
      try {
        const raw = localStorage.getItem("m2p_download_history");
        if (raw) {
          setDownloads(JSON.parse(raw));
        }
      } catch {}
    };
    loadHistory();

    window.addEventListener("m2p_download_history_updated", loadHistory);
    return () => {
      window.removeEventListener("m2p_download_history_updated", loadHistory);
    };
  }, []);

  // Handle click outside to collapse
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsExpanded(false);
      }
    };
    if (isExpanded) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isExpanded]);

  const clearHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      localStorage.removeItem("m2p_download_history");
      setDownloads([]);
      window.dispatchEvent(new Event("m2p_download_history_updated"));
    } catch {}
  };

  return (
    <header className="relative z-20 border-b border-border-subtle bg-[#040508]/90 backdrop-blur-md px-3 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between">
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

      {/* Right HUD Controls */}
      <div className="flex items-center gap-2 sm:gap-3 font-mono">
        {/* Tactical Language Selector */}
        <LanguageSelector />
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-surface border border-border-subtle text-text-secondary text-xs">
          <span>{t('header.signal')}</span>
          <span className="text-[#10b981] font-bold">{t('header.locked')}</span>
        </div>

        {/* ─── LA GRIETA STYLE USER NAV PILL ─── */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            className={`
              group relative flex items-center gap-2.5 sm:gap-3 py-1.5 pl-3 pr-2
              bg-black/80 hover:bg-[#0c1017]
              border ${isExpanded ? "border-accent-bright shadow-[0_0_15px_rgba(217,4,41,0.25)]" : "border-white/15 hover:border-white/30"}
              shadow-[0_0_20px_rgba(0,0,0,0.8),inset_0_0_15px_rgba(255,255,255,0.02)]
              transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
              cursor-pointer select-none text-left
            `}
            style={{
              clipPath:
                "polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)",
            }}
          >
            {/* CRT Screen Scanline Overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-30 mix-blend-overlay">
              <div className="absolute inset-0 crt-scanlines" />
            </div>

            {/* User Identity & Balance Stack */}
            <div className="flex flex-col items-end justify-center leading-none gap-1">
              <div className="text-[10px] font-mono text-white flex items-center gap-1.5 font-bold tracking-tight">
                <span>[{userName.substring(0, 10).toUpperCase()}]</span>
                <span
                  className="flex items-center gap-1 px-1 py-[1px] bg-white/5 border border-white/10 text-[8px] tracking-wider text-text-secondary"
                  style={{
                    clipPath:
                      "polygon(2px 0, 100% 0, 100% calc(100% - 2px), calc(100% - 2px) 100%, 0 100%, 0 2px)",
                  }}
                >
                  <span
                    className={`w-1 h-1 rounded-full ${statusColor} ${isUserLoggedIn ? "animate-pulse" : ""}`}
                  />
                  <span>{isDeveloper ? "DEV" : isUserLoggedIn ? "OP" : "GUEST"}</span>
                </span>
              </div>

              <div className="text-[9px] font-mono tracking-tight text-accent-bright font-black">
                B!T$ [{balanceText}]
              </div>
            </div>

            {/* Expansion Arrow Indicator */}
            <div
              className={`text-text-secondary group-hover:text-white transition-transform duration-300 ${isExpanded ? "rotate-180 text-white" : ""}`}
            >
              <ChevronDownIcon className="w-3.5 h-3.5" />
            </div>

            {/* Avatar HUD - Edge aligned with diagonal cut & corner status slash */}
            <div
              className="relative flex items-center justify-center shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-white/5 border border-white/20"
              style={{
                clipPath:
                  "polygon(0 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%)",
              }}
            >
              <UserIcon className="w-4 h-4 text-white/70" />

              {/* Status Slash across bottom-right chamfer */}
              <div
                className={`absolute bottom-0 right-0 w-[10px] h-[3px] ${statusColor}`}
                style={{
                  transform: "rotate(-45deg)",
                  transformOrigin: "bottom right",
                }}
              />
            </div>
          </button>

          {/* ─── EXPANDED PANEL (LA GRIETA STYLE TACTICAL DRAWER) ─── */}
          {isExpanded && (
            <div
              className={`
                absolute right-0 top-full mt-2 w-80 sm:w-96
                bg-[#07090e]/95 backdrop-blur-xl
                border border-white/15
                shadow-[0_15px_50px_rgba(0,0,0,0.9),inset_0_0_20px_rgba(255,255,255,0.02)]
                p-4 z-50 overflow-hidden
                animate-in fade-in zoom-in-95 duration-200
              `}
              style={{
                clipPath:
                  "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)",
              }}
            >
              {/* Scanline overlay */}
              <div className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay">
                <div className="absolute inset-0 crt-scanlines" />
              </div>

              {/* ── Zone 1: Operator Dossier ── */}
              <div className="relative pb-3 border-b border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 bg-accent/20 border border-accent/40 flex items-center justify-center text-accent-bright font-mono font-bold shrink-0"
                    style={{
                      clipPath:
                        "polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)",
                    }}
                  >
                    LG
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${statusColor} ${isUserLoggedIn ? "animate-pulse" : ""}`} />
                      <span className="font-mono text-[9px] tracking-widest text-[#10b981] uppercase font-bold truncate">
                        {isUserLoggedIn ? t('header.operator_connected') : t('header.guest_mode')}
                      </span>
                    </div>
                    <p className="font-mono text-xs sm:text-sm text-white font-bold truncate">
                      {isUserLoggedIn ? (quota?.name || quota?.email || userName) : "GUEST OPERATOR"}
                    </p>
                    <p className="font-mono text-[10px] text-text-secondary truncate">
                      {isUserLoggedIn ? "LaGrieta.es ID Verified" : "20s clips · 1 free download"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0">
                  <div className="flex items-center gap-1 text-[9px] font-mono text-text-secondary">
                    <span>SALDO</span>
                    {onOpenB1tInfo && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenB1tInfo();
                        }}
                        className="text-text-secondary hover:text-accent-bright transition-colors cursor-pointer p-0.5 inline-flex items-center"
                        title="¿Qué son los B1T$?"
                        aria-label="Información sobre créditos B1T$"
                      >
                        <InfoIcon className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <span className="font-mono text-xs font-black text-accent-bright">
                    {balanceText}
                  </span>
                  {/* Payments / Boosters disabled until further notice:
                  {onOpenBoosters && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(false);
                        onOpenBoosters("boosters");
                      }}
                      className="mt-1 px-1.5 py-0.5 text-[8px] font-mono font-bold bg-accent/20 hover:bg-accent/40 text-accent-bright border border-accent/40 transition-colors uppercase cursor-pointer"
                      title="Desbloquear boosters de cómputo y pases"
                    >
                      + BOOST
                    </button>
                  )}
                  */}
                </div>
              </div>

              {/* ── Zone 2: Historial de Descargas (Future Expandable Slot) ── */}
              <div className="relative py-3 border-b border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-wider text-text-secondary uppercase">
                    <HistoryIcon className="w-3 h-3 text-accent-bright" />
                    <span>{t('header.downloads_title')}</span>
                  </div>
                  {downloads.length > 0 && (
                    <button
                      type="button"
                      onClick={clearHistory}
                      className="text-[9px] font-mono text-text-secondary hover:text-accent-error transition-colors cursor-pointer uppercase"
                    >
                      {t('header.clear').toUpperCase()}
                    </button>
                  )}
                </div>

                {/* History Content */}
                {downloads.length > 0 ? (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {downloads.map((item) => (
                      <div
                        key={item.id}
                        className="p-2 bg-black/40 border border-white/5 hover:border-white/15 flex items-center justify-between gap-2 text-xs font-mono transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-white text-[11px] truncate font-medium">
                            {item.title}
                          </p>
                          <p className="text-text-secondary text-[9px]">
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {item.filename}
                          </p>
                        </div>
                        <span className="text-[9px] text-[#10b981] font-bold shrink-0">
                          OK
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-black/40 border border-white/5 text-center">
                    <p className="font-mono text-[10px] text-text-secondary uppercase tracking-wider mb-1">
                      [ REGISTRO DE SEÑALES ]
                    </p>
                    <p className="font-mono text-[10px] text-text-secondary/80 leading-relaxed">
                      {isUserLoggedIn
                        ? "Aún no hay descargas en esta sesión. Los clips y vídeos extraídos se registrarán aquí."
                        : "Inicia sesión con tu cuenta de LaGrieta.es para conservar el historial de clips y descargas."}
                    </p>
                  </div>
                )}
              </div>

              {/* ── Zone 3: Actions & Quick Links ── */}
              <div className="relative pt-3 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <a
                    href="https://lagrieta.es"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text-secondary hover:text-white transition-colors inline-flex items-center gap-1 text-[11px] tracking-wider uppercase"
                  >
                    <span>PORTAL LAGRIETA.ES</span>
                    <ExternalLinkIcon className="w-2.5 h-2.5" />
                  </a>
                  {/* Payments / Boosters disabled until further notice:
                  {onOpenBoosters && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsExpanded(false);
                        onOpenBoosters("passes");
                      }}
                      className="text-accent-bright hover:underline text-[10px] font-bold tracking-wider uppercase cursor-pointer"
                    >
                      ⚡ PASES
                    </button>
                  )}
                  */}
                </div>

                {isUserLoggedIn ? (
                  onLogout && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsExpanded(false);
                        onLogout();
                      }}
                      className="px-2.5 py-1 text-[11px] text-accent-error hover:bg-accent-error/10 border border-transparent hover:border-accent-error/40 transition-colors cursor-pointer uppercase font-bold"
                    >
                      {t('header.logout')}
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsExpanded(false);
                      onOpenLoginModal();
                    }}
                    className="px-2.5 py-1 text-[11px] text-accent-bright hover:bg-accent/10 border border-accent/40 transition-colors cursor-pointer uppercase font-bold"
                  >
                    {t('header.login_lagrieta')} →
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
