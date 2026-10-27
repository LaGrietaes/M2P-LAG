import { useState, useEffect } from "react";
import { LogoFull } from "../components/Logo";
import { UrlInput } from "../components/UrlInput";
import { SourceCard } from "../features/source/SourceCard";
import { ClipEditor } from "../features/extractor/ClipEditor";
import { DevModeToggle } from "../components/DevModeToggle";
import { isDevModeAvailable } from "../lib/devMode";
import { useDevMode } from "../lib/devMode";
import { useTranslation } from "../lib/i18n/I18nContext";
import { ProgressRail } from "../components/ProgressRail";
import { LoginModal } from "../components/LoginModal";
import { B1tInfoModal } from "../components/B1tInfoModal";
// import { BoosterCheckoutModal } from "../components/BoosterCheckoutModal"; // Payments disabled until further notice
import { ExtractionProgress } from "../components/ExtractionProgress";
import { DeliverPanel } from "../components/DeliverPanel";
import { HeaderHUD } from "../components/HeaderHUD";
import { AmbientBackground } from "../components/AmbientBackground";
import { LaGrietaFooter } from "../components/LaGrietaFooter";
import { InfoIcon } from "../components/ui/Icons";
import { useMutation } from "@tanstack/react-query";
import { extractClip, downloadSource, getQuota, logoutUser } from "../lib/api";
import { setAuthToken } from "../lib/guestToken";
import type { InspectResponse, ExtractResponse, QuotaResponse } from "../types";

type ViewState = "input" | "source" | "configure" | "extracting" | "result";

export default function Landing() {
  const [view, setView] = useState<ViewState>("input");
  const [media, setMedia] = useState<InspectResponse | null>(null);
  const [extractResult, setExtractResult] = useState<ExtractResponse | null>(null);
  const [quota, setQuota] = useState<QuotaResponse | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isB1tInfoOpen, setIsB1tInfoOpen] = useState(false);
  // Payments / Boosters disabled until further notice:
  // const [isBoosterModalOpen, setIsBoosterModalOpen] = useState(false);
  // const [boosterTab, setBoosterTab] = useState<"boosters" | "passes" | "protocol">("boosters");
  // const handleOpenBoosters = (tab: "boosters" | "passes" | "protocol" = "boosters") => {
  //   setBoosterTab(tab);
  //   setIsBoosterModalOpen(true);
  // };
  const [selectedFormatId, setSelectedFormatId] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<"clip" | "full">("clip");

  const { isDeveloper, isRegistered } = useDevMode();
  const { t } = useTranslation();

  useEffect(() => {
    // 1. Process SSO callback token if present in URL
    const params = new URLSearchParams(window.location.search);
    const ssoToken = params.get("token");
    if (ssoToken) {
      setAuthToken(ssoToken);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // 2. Fetch live quota and B1T$ balance
    getQuota()
      .then(setQuota)
      .catch(() => setQuota(null));
  }, [view]);

  const recordDownload = (title: string, filename?: string) => {
    try {
      const raw = localStorage.getItem("m2p_download_history");
      const list = raw ? JSON.parse(raw) : [];
      const item = {
        id: Date.now().toString(),
        title: title || filename || "Media extraction",
        timestamp: Date.now(),
        filename: filename || "media",
      };
      const updated = [item, ...list.slice(0, 19)];
      localStorage.setItem("m2p_download_history", JSON.stringify(updated));
      window.dispatchEvent(new Event("m2p_download_history_updated"));
    } catch {}
  };

  const extractMutation = useMutation({
    mutationFn: extractClip,
    onSuccess: (data) => {
      setExtractResult(data);
      recordDownload(
        media?.title || "Clip extraction",
        data.format ? `${data.file_id}.${data.format}` : data.file_id,
      );
      setView("result");
      getQuota().then(setQuota).catch(() => {});
    },
    onError: () => {
      setView("configure");
      getQuota().then(setQuota).catch(() => {});
    },
  });

  const downloadMutation = useMutation({
    mutationFn: downloadSource,
    onSuccess: (data) => {
      setExtractResult(data);
      recordDownload(
        media?.title || "Full source download",
        data.format ? `${data.file_id}.${data.format}` : data.file_id,
      );
      setView("result");
      getQuota().then(setQuota).catch(() => {});
    },
    onError: () => {
      setView("configure");
      getQuota().then(setQuota).catch(() => {});
    },
  });

  const handleInspectSuccess = (data: InspectResponse) => {
    setMedia(data);
    const validVideoFormats = (data.formats || [])
      .filter((f) => f.height && f.height > 0 && f.ext !== "mhtml" && !f.format_id?.startsWith("sb"))
      .sort((a, b) => (b.height ?? 0) - (a.height ?? 0) || (b.tbr ?? 0) - (a.tbr ?? 0));
    if (validVideoFormats.length > 0) {
      setSelectedFormatId(validVideoFormats[0].format_id);
    } else {
      setSelectedFormatId(null);
    }
    setView("source");
  };

  const handleExtract = (
    start: number,
    end: number,
    format: "mp4" | "mp3" | "mov" | "webm" | "wav" = "mp4",
    preset: string = "compatible",
  ) => {
    if (!media) return;
    setView("extracting");
    const isAudio = format === "mp3" || format === "wav";
    extractMutation.mutate({
      url: media.webpage_url || media.id,
      start,
      end,
      format,
      preset,
      format_id: isAudio ? undefined : (selectedFormatId ?? undefined),
    });
  };

  const handleDownloadSource = (
    _start: number = 0,
    _end: number = 0,
    format: "mp4" | "mp3" | "mov" | "webm" | "wav" = "mp4",
    preset: string = "compatible",
  ) => {
    if (!media) return;
    setView("extracting");
    const isAudio = format === "mp3" || format === "wav";
    downloadMutation.mutate({
      url: media.webpage_url || media.id,
      format,
      preset,
      format_id: isAudio ? undefined : (selectedFormatId ?? undefined),
    });
  };

  const handleBackToInput = () => {
    setMedia(null);
    setExtractResult(null);
    setSelectedFormatId(null);
    setView("input");
  };

  const handleBackToSource = () => setView("source");

  const handleStepClick = (targetView: ViewState) => {
    if (targetView === "input") {
      handleBackToInput();
    } else if (targetView === "source" && media) {
      setView("source");
    } else if (targetView === "configure" && media) {
      setView("configure");
    }
  };

  const freeDownloadBadge =
    quota && quota.role === "guest"
      ? quota.free_download_used
        ? "used"
        : "available"
      : null;

  const handleLogout = async () => {
    await logoutUser();
    getQuota().then(setQuota).catch(() => {});
  };

  const isUserLoggedIn =
    quota?.role === "registered" ||
    quota?.role === "user" ||
    (isDevModeAvailable && (isDeveloper || isRegistered));

  const isExtracting = extractMutation.isPending || downloadMutation.isPending;

  return (
    <div className="relative min-h-screen lg:h-screen bg-[#040508] text-white flex flex-col justify-between overflow-x-hidden">
      {/* Dynamic CRT ambient background */}
      <AmbientBackground
        thumbnailUrl={media?.thumbnail}
        stage={view}
      />

      {/* Fixed header HUD */}
      <HeaderHUD
        quota={quota}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onOpenB1tInfo={() => setIsB1tInfoOpen(true)}
        // onOpenBoosters={handleOpenBoosters} // Payments disabled until further notice
        onLogout={handleLogout}
      />

      {/* Progress breadcrumb rail */}
      <div className="relative z-10 border-b border-border-subtle shrink-0">
        <ProgressRail current={view} orientation="horizontal" onStepClick={handleStepClick} />
      </div>

      {/* Main content area */}
      <main className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-8 py-3 sm:py-4 lg:py-3 flex-1 flex flex-col justify-center min-h-0 overflow-y-auto">

        {/* ─── STAGE: INPUT ─────────────────────────────────────────── */}
        {view === "input" && (
          <div className="w-full flex-1 flex flex-col items-center justify-center gap-5 sm:gap-6 my-auto py-1">
            {/* Hero */}
            <div className="text-center">
              <LogoFull className="h-12 sm:h-14 lg:h-16 w-auto mx-auto mb-2 drop-shadow-[0_0_20px_rgba(255,0,0,0.15)]" />
              <p className="font-mono text-xs sm:text-sm text-text-secondary tracking-[0.25em] uppercase">
                {t('landing.subtitle')}
              </p>
            </div>

            {/* URL Input panel */}
            <div className="w-full max-w-2xl relative">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-accent-bright pointer-events-none" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-accent-bright pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-accent-bright pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-accent-bright pointer-events-none" />
              <div className="bg-surface/80 border border-border-subtle p-5 sm:p-6 backdrop-blur-xl">
                <p className="font-mono text-label-caps text-text-secondary tracking-widest mb-3.5 uppercase">
                  {t('landing.paste_url_label')}
                </p>
                <UrlInput onInspectSuccess={handleInspectSuccess} />
              </div>
            </div>

            {/* Role info for guest users */}
            {!isUserLoggedIn && (
              <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-px bg-border-subtle">
                <div className="bg-[#040508] px-4 sm:px-5 py-2.5 sm:py-3 flex flex-col justify-between">
                  <div>
                    <p className="font-mono text-label-caps text-accent tracking-widest mb-0.5">GUEST</p>
                    <p className="font-mono text-xs text-text-secondary">{t('landing.guest_desc')}</p>
                  </div>
                  {/* Payments / Boosters disabled until further notice:
                  <div className="mt-2 pt-1.5 border-t border-border-subtle/50 flex items-center justify-between text-[11px] font-mono">
                    <button
                      type="button"
                      onClick={() => handleOpenBoosters("boosters")}
                      className="text-accent-bright hover:underline font-bold tracking-wider inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>⚡ BOOSTERS Y PASES →</span>
                    </button>
                  </div>
                  */}
                </div>
                <div className="bg-[#040508] px-4 sm:px-5 py-2.5 sm:py-3 flex flex-col justify-between border-t sm:border-t-0 sm:border-l border-border-subtle">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <p className="font-mono text-label-caps text-white tracking-widest">REGISTERED</p>
                        <span className="text-[9px] font-mono text-accent-bright bg-accent/20 px-1 py-0.2 border border-accent/40 tracking-wider">
                          LAGRIETA.ES
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsB1tInfoOpen(true)}
                        className="text-text-secondary hover:text-accent-bright transition-colors cursor-pointer p-0.5 inline-flex items-center shrink-0"
                        title={t('landing.info_bit_tooltip')}
                        aria-label="Información sobre créditos B1T$"
                      >
                        <InfoIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="font-mono text-xs text-text-secondary mt-0.5">
                      {t('landing.registered_desc')}
                    </p>
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-border-subtle/50 flex items-center justify-between text-[11px] font-mono">
                    <button
                      type="button"
                      onClick={() => setIsLoginModalOpen(true)}
                      className="text-accent-bright hover:underline font-bold tracking-wider inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>{t('landing.login_cta')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsB1tInfoOpen(true)}
                      className="text-text-secondary hover:text-white transition-colors cursor-pointer"
                    >
                      {t('landing.info_bit_btn')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── STAGE: SOURCE (PREVIEW) ──────────────────────────────── */}
        {view === "source" && media && (
          <div className="space-y-6">
            <button
              onClick={handleBackToInput}
              className="font-mono text-xs text-text-secondary hover:text-white tracking-wider uppercase transition-colors"
            >
              {t('landing.back_to_url')}
            </button>
            <SourceCard
              media={media}
              onExtract={() => {
                setEditorMode("clip");
                setView("configure");
              }}
              onPreview={() => {}}
              onDownloadSource={() => {
                setEditorMode("full");
                setView("configure");
              }}
              freeDownloadBadge={freeDownloadBadge}
            />
            {downloadMutation.isError && (
              <div className="p-3 text-sm font-mono text-accent-error bg-accent-error/10 border border-accent-error/40">
                {downloadMutation.error instanceof Error
                  ? downloadMutation.error.message
                  : t('landing.download_failed')}
              </div>
            )}
          </div>
        )}

        {/* ─── STAGE: CONFIGURE ─────────────────────────────────────── */}
        {view === "configure" && media && (
          <div className="space-y-6">
            <button
              onClick={handleBackToSource}
              className="font-mono text-xs text-text-secondary hover:text-white tracking-wider uppercase transition-colors"
            >
              {t('landing.back_to_preview')}
            </button>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7">
                <SourceCard
                  media={media}
                  hideActionButtons={true}
                  onPreview={() => {}}
                  freeDownloadBadge={freeDownloadBadge}
                />
              </div>
              <div className="lg:col-span-5">
                <ClipEditor
                  media={media}
                  onExtract={editorMode === "clip" ? handleExtract : handleDownloadSource}
                  isExtracting={isExtracting}
                  maxClipSeconds={
                    !isDeveloper && quota?.role === "guest"
                      ? (quota.max_clip_seconds ?? 20)
                      : null
                  }
                  selectedFormatId={selectedFormatId}
                  onSelectFormat={setSelectedFormatId}
                  b1tBalance={isDeveloper ? Infinity : (quota?.b1t_balance ?? null)}
                  mode={editorMode}
                  onModeChange={setEditorMode}
                  freeDownloadUsed={Boolean(quota?.free_download_used)}
                  onRequireAuth={() => setIsLoginModalOpen(true)}
                  onOpenB1tInfo={() => setIsB1tInfoOpen(true)}
                  // onOpenBoosters={handleOpenBoosters} // Payments disabled until further notice
                />
              </div>
            </div>
            {extractMutation.isError && (
              <div className="p-3 text-sm font-mono text-accent-error bg-accent-error/10 border border-accent-error/40">
                {extractMutation.error instanceof Error
                  ? extractMutation.error.message
                  : t('landing.download_prep_failed')}
              </div>
            )}
            {downloadMutation.isError && (
              <div className="p-3 text-sm font-mono text-accent-error bg-accent-error/10 border border-accent-error/40">
                {downloadMutation.error instanceof Error
                  ? downloadMutation.error.message
                  : t('landing.download_failed')}
              </div>
            )}

          </div>
        )}

        {/* ─── STAGE: EXTRACTING ────────────────────────────────────── */}
        {view === "extracting" && (
          <ExtractionProgress isPending={isExtracting} />
        )}

        {/* ─── STAGE: RESULT ────────────────────────────────────────── */}
        {view === "result" && extractResult && (
          <DeliverPanel
            extractResult={extractResult}
            onRestart={handleBackToInput}
            media={media}
            videoTitle={media?.title}
            thumbnailUrl={media?.thumbnail}
            creator={media?.creator}
            duration={media?.duration}
            // onOpenBoosters={handleOpenBoosters} // Payments disabled until further notice
          />
        )}
      </main>

      {/* Dev mode toggle */}
      {isDevModeAvailable && <DevModeToggle />}

      {/* Direct in-app Member Login modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoggedIn={() => {
          getQuota().then(setQuota).catch(() => {});
        }}
      />

      {/* B1T$ info modal */}
      <B1tInfoModal
        isOpen={isB1tInfoOpen}
        onClose={() => setIsB1tInfoOpen(false)}
        onOpenLogin={() => setIsLoginModalOpen(true)}
      />

      {/* Payments / Boosters disabled until further notice:
      <BoosterCheckoutModal
        isOpen={isBoosterModalOpen}
        onClose={() => setIsBoosterModalOpen(false)}
        onSuccess={() => {
          getQuota().then(setQuota).catch(() => {});
        }}
        quota={quota}
        initialTab={boosterTab}
        targetJobId={extractResult?.file_id}
      />
      */}

      {/* Persistent LaGrieta footer pill */}
      <LaGrietaFooter />
    </div>
  );
}