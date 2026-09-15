import { useState, useEffect } from "react";
import { LogoFull } from "../components/Logo";
import { UrlInput } from "../components/UrlInput";
import { SourceCard } from "../features/source/SourceCard";
import { ClipEditor } from "../features/extractor/ClipEditor";
import { DevModeToggle } from "../components/DevModeToggle";
import { isDevModeAvailable } from "../lib/devMode";
import { useDevMode } from "../lib/devMode";
import { ProgressRail } from "../components/ProgressRail";
import { BuyB1tModal } from "../components/BuyB1tModal";
import { LoginModal } from "../components/LoginModal";
import { ExtractionProgress } from "../components/ExtractionProgress";
import { DeliverPanel } from "../components/DeliverPanel";
import { HeaderHUD } from "../components/HeaderHUD";
import { AmbientBackground } from "../components/AmbientBackground";
import { LaGrietaFooter } from "../components/LaGrietaFooter";
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
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [selectedFormatId, setSelectedFormatId] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<"clip" | "full">("clip");

  const { isDeveloper } = useDevMode();

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

  const extractMutation = useMutation({
    mutationFn: extractClip,
    onSuccess: (data) => {
      setExtractResult(data);
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
    setView("source");
  };

  const handleExtract = (start: number, end: number, format: "mp4" | "mp3" = "mp4") => {
    if (!media) return;
    setView("extracting");
    extractMutation.mutate({
      url: media.webpage_url || media.id,
      start,
      end,
      format,
      format_id: selectedFormatId ?? undefined,
    });
  };

  const handleDownloadSource = (_start: number = 0, _end: number = 0, format: "mp4" | "mp3" = "mp4") => {
    if (!media) return;
    setView("extracting");
    downloadMutation.mutate({
      url: media.webpage_url || media.id,
      format,
      format_id: selectedFormatId ?? undefined,
    });
  };

  const handleBackToInput = () => {
    setMedia(null);
    setExtractResult(null);
    setSelectedFormatId(null);
    setView("input");
  };

  const handleBackToSource = () => setView("source");

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

  const isExtracting = extractMutation.isPending || downloadMutation.isPending;

  return (
    <div className="relative min-h-screen bg-[#040508] text-white">
      {/* Dynamic CRT ambient background */}
      <AmbientBackground
        thumbnailUrl={media?.thumbnail}
        stage={view}
      />

      {/* Fixed header HUD */}
      <HeaderHUD
        quota={quota}
        onOpenBuyModal={() => setIsBuyModalOpen(true)}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Progress breadcrumb rail */}
      <div className="relative z-10 border-b border-border-subtle">
        <ProgressRail current={view} orientation="horizontal" />
      </div>

      {/* Main content area */}
      <main className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-8 py-8 pb-20">

        {/* ─── STAGE: INPUT ─────────────────────────────────────────── */}
        {view === "input" && (
          <div className="min-h-[calc(100vh-12rem)] flex flex-col items-center justify-center gap-12">
            {/* Hero */}
            <div className="text-center">
              <LogoFull className="h-16 sm:h-20 w-auto mx-auto mb-4 drop-shadow-[0_0_20px_rgba(255,0,0,0.15)]" />
              <p className="font-mono text-xs sm:text-sm text-text-secondary tracking-[0.25em] uppercase">
                Tactical Downloader · Signal Extraction
              </p>
            </div>

            {/* URL Input panel */}
            <div className="w-full max-w-2xl relative">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-accent-bright pointer-events-none" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-accent-bright pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-accent-bright pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-accent-bright pointer-events-none" />
              <div className="bg-surface/80 border border-border-subtle p-8 backdrop-blur-xl">
                <p className="font-mono text-label-caps text-text-secondary tracking-widest mb-6 uppercase">
                  01 // PASTE VIDEO URL
                </p>
                <UrlInput onInspectSuccess={handleInspectSuccess} />
              </div>
            </div>

            {/* Role info */}
            <div className="w-full max-w-2xl grid grid-cols-2 gap-px bg-border-subtle">
              <div className="bg-[#040508] px-5 py-4">
                <p className="font-mono text-label-caps text-accent tracking-widest mb-1">GUEST</p>
                <p className="font-mono text-xs text-text-secondary">20s clip · 1 free full download</p>
              </div>
              <div className="bg-[#040508] px-5 py-4">
                <p className="font-mono text-label-caps text-white tracking-widest mb-1">REGISTERED</p>
                <p className="font-mono text-xs text-text-secondary">Unlimited extraction · gated by B1T$</p>
              </div>
            </div>
          </div>
        )}

        {/* ─── STAGE: SOURCE (PREVIEW) ──────────────────────────────── */}
        {view === "source" && media && (
          <div className="space-y-6">
            <button
              onClick={handleBackToInput}
              className="font-mono text-xs text-text-secondary hover:text-white tracking-wider uppercase transition-colors"
            >
              ← ENTER ANOTHER URL
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
                  : "Download failed. Please try again."}
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
              ← BACK TO PREVIEW
            </button>
            <div className="grid grid-cols-1 md:grid-cols-8 gap-4 items-start">
              <div className="md:col-span-5">
                <SourceCard
                  media={media}
                  onExtract={() => {
                    setEditorMode("clip");
                  }}
                  onPreview={() => {}}
                  onDownloadSource={() => {
                    setEditorMode("full");
                  }}
                  freeDownloadBadge={freeDownloadBadge}
                />
              </div>
              <div className="md:col-span-3">
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
                />
              </div>
            </div>
            {extractMutation.isError && (
              <div className="p-3 text-sm font-mono text-accent-error bg-accent-error/10 border border-accent-error/40">
                {extractMutation.error instanceof Error
                  ? extractMutation.error.message
                  : "Download preparation failed. Please try again."}
              </div>
            )}
            {downloadMutation.isError && (
              <div className="p-3 text-sm font-mono text-accent-error bg-accent-error/10 border border-accent-error/40">
                {downloadMutation.error instanceof Error
                  ? downloadMutation.error.message
                  : "Download failed. Please try again."}
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
          />
        )}
      </main>

      {/* Dev mode toggle */}
      {isDevModeAvailable && <DevModeToggle />}

      {/* Buy B1T$ modal */}
      <BuyB1tModal
        isOpen={isBuyModalOpen}
        onClose={() => setIsBuyModalOpen(false)}
        onPurchased={() => {
          setIsBuyModalOpen(false);
          getQuota().then(setQuota).catch(() => {});
        }}
      />

      {/* Direct in-app Member Login modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoggedIn={() => {
          getQuota().then(setQuota).catch(() => {});
        }}
      />

      {/* Persistent LaGrieta footer pill */}
      <LaGrietaFooter />
    </div>
  );
}