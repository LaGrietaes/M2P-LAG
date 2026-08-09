import { useState, useEffect } from "react";
import { Logo } from "../components/Logo";
import { UrlInput } from "../components/UrlInput";
import { SourceCard } from "../features/source/SourceCard";
import { ClipEditor } from "../features/extractor/ClipEditor";
import { AuthStatus } from "../components/AuthStatus";
import { DevModeToggle } from "../components/DevModeToggle";
import { isDevModeAvailable } from "../lib/devMode";
import { ProgressRail } from "../components/ProgressRail";
import { BuyB1tModal } from "../components/BuyB1tModal";
import { ExtractionProgress } from "../components/ExtractionProgress";
import { DeliverPanel } from "../components/DeliverPanel";
import { ThemeToggle } from "../components/ui/ThemeToggle";
import { Panel } from "../components/ui/Panel";
import { useMutation } from "@tanstack/react-query";
import { extractClip, downloadSource, getQuota } from "../lib/api";
import type { InspectResponse, ExtractResponse, QuotaResponse } from "../types";

type ViewState = "input" | "source" | "configure" | "extracting" | "result";

export default function Landing() {
  const [view, setView] = useState<ViewState>("input");
  const [media, setMedia] = useState<InspectResponse | null>(null);
  const [extractResult, setExtractResult] = useState<ExtractResponse | null>(
    null,
  );
  const [quota, setQuota] = useState<QuotaResponse | null>(null);
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [selectedFormatId, setSelectedFormatId] = useState<string | null>(null);

  useEffect(() => {
    getQuota()
      .then(setQuota)
      .catch(() => setQuota(null));
  }, [view]);

  const extractMutation = useMutation({
    mutationFn: extractClip,
    onSuccess: (data) => {
      setExtractResult(data);
      setView("result");
    },
    onError: () => {
      // Otherwise the user is stranded on ExtractionProgress, which reads
      // "not pending" as success and shows a false EXTRACTION COMPLETE/100%
      // with no visible error (spec §5 blocked/failed states).
      setView("configure");
    },
  });

  const downloadMutation = useMutation({
    mutationFn: downloadSource,
    onSuccess: (data) => {
      setExtractResult(data);
      setView("result");
      getQuota()
        .then(setQuota)
        .catch(() => {});
    },
    onError: () => {
      setView("configure");
      getQuota()
        .then(setQuota)
        .catch(() => {});
    },
  });

  const handleInspectSuccess = (data: InspectResponse) => {
    setMedia(data);
    setView("source");
  };

  const handleExtract = (start: number, end: number) => {
    if (!media) return;
    setView("extracting");
    extractMutation.mutate({
      url: media.webpage_url || media.id,
      start,
      end,
      format: "mp4",
      format_id: selectedFormatId ?? undefined,
    });
  };

  const handleDownloadSource = () => {
    if (!media) return;
    setView("extracting");
    downloadMutation.mutate({
      url: media.webpage_url || media.id,
      format_id: selectedFormatId ?? undefined,
    });
  };

  const handleBackToInput = () => {
    setMedia(null);
    setExtractResult(null);
    setSelectedFormatId(null);
    setView("input");
  };

  const handleBackToSource = () => {
    setView("source");
  };

  const handleConfigure = () => {
    setView("configure");
  };

  // Only claim a badge state once real quota data has arrived. While
  // `quota` is null (not yet loaded, or the fetch failed) we don't know
  // the user's role or free-download status, so render nothing rather
  // than defaulting to "available".
  const freeDownloadBadge =
    quota && quota.role === "guest"
      ? quota.free_download_used
        ? "used"
        : "available"
      : null;

  const isExtracting = extractMutation.isPending || downloadMutation.isPending;

  return (
    <div className="min-h-screen bg-background text-text-primary hud-scanlines">
      <div className="flex min-h-screen">
        {/* Persistent sidebar (spec §4) */}
        <aside className="hidden md:flex flex-col w-56 border-r border-border-subtle bg-surface/40 backdrop-blur-3xl p-4 gap-6 shrink-0">
          <div className="flex items-center gap-2 px-2">
            <Logo className="w-8 h-8" />
            <span className="font-display font-black tracking-tight text-lg">
              M2P
            </span>
          </div>
          <ProgressRail current={view} />
          <div className="mt-auto space-y-4">
            <AuthStatus />
            <button
              onClick={() => setIsBuyModalOpen(true)}
              className="w-full px-3 py-2 text-xs font-mono font-bold tracking-widest uppercase text-text-primary border border-border-subtle hover:bg-surface-elevated transition-colors"
            >
              Buy B1T$
            </button>
            <ThemeToggle />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col items-center px-4 py-8">
          <div className="w-full max-w-5xl">
            {/* Mobile top bar */}
            <div className="md:hidden flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Logo className="w-8 h-8" />
                <span className="font-display font-black tracking-tight">
                  M2P
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <button
                  onClick={() => setIsBuyModalOpen(true)}
                  className="px-3 py-1 text-xs font-mono font-bold tracking-widest uppercase text-text-primary border border-border-subtle hover:bg-surface-elevated transition-colors"
                >
                  Buy B1T$
                </button>
              </div>
            </div>

            {view === "input" ? (
              <div className="text-center mb-12 relative corner-brackets py-8">
                <Logo className="w-24 h-24 mx-auto mb-4" />
                <h1 className="font-display font-black text-5xl tracking-tight mb-1">
                  M2P
                </h1>
                <p className="text-xl text-text-secondary">
                  Media Server 2 Peer
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-border-subtle">
                <div className="flex items-center gap-3">
                  <Logo className="w-8 h-8" />
                  <span className="font-display font-black tracking-tight text-lg">
                    M2P
                  </span>
                </div>
              </div>
            )}

            {view === "input" && (
              <div className="space-y-12">
                <div className="text-center">
                  <Panel variant="active" className="p-8 max-w-2xl mx-auto relative corner-brackets">
                    {/* Pipeline breadcrumb (spec §5) */}
                    <div className="font-mono text-label-caps text-text-secondary flex items-center gap-2 mb-8 tracking-[0.2em] w-full justify-center">
                      <span className="text-accent font-bold">SOURCE</span>
                      <span className="opacity-50">→</span>
                      <span>DOWNLOAD</span>
                      <span className="opacity-50">→</span>
                      <span>PREVIEW</span>
                      <span className="opacity-50">→</span>
                      <span>EXTRACT</span>
                      <span className="opacity-50">→</span>
                      <span>DELIVER</span>
                    </div>
                    <UrlInput onInspectSuccess={handleInspectSuccess} />
                  </Panel>
                </div>
                <div className="text-center space-y-4 text-text-secondary">
                  <p className="text-lg">
                    Extract what you need. Take it to your workflow.
                  </p>
                  <div className="space-y-2 font-mono text-xs">
                    <p>
                      <span className="text-accent font-medium">GUEST:</span>{" "}
                      20s clip extraction, always free. Plus one free unlimited
                      full download.
                    </p>
                    <p>
                      <span className="text-accent font-medium">
                        REGISTERED:
                      </span>{" "}
                      Unlimited extraction, gated by B1T$ balance.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {view === "source" && media && (
              <div className="space-y-6">
                <button
                  onClick={handleBackToInput}
                  className="text-sm text-text-secondary hover:text-text-primary font-mono"
                >
                  {"\u2190"} Back to URL input
                </button>
                <SourceCard
                  media={media}
                  onExtract={handleConfigure}
                  onPreview={() => console.log("Preview clicked")}
                  onDownloadSource={handleDownloadSource}
                  freeDownloadBadge={freeDownloadBadge}
                />
                {downloadMutation.isError && (
                  <div className="p-3 text-sm text-accent-error bg-accent-error/10 border border-accent-error/40">
                    {downloadMutation.error instanceof Error
                      ? downloadMutation.error.message
                      : "Download failed. Please try again."}
                  </div>
                )}
              </div>
            )}

            {view === "configure" && media && (
              <div className="space-y-6">
                <button
                  onClick={handleBackToSource}
                  className="text-sm text-text-secondary hover:text-text-primary font-mono"
                >
                  {"\u2190"} Back to source
                </button>
                <div className="grid grid-cols-1 md:grid-cols-8 gap-4 items-start">
                  <div className="md:col-span-5">
                    <SourceCard
                      media={media}
                      onExtract={handleConfigure}
                      onPreview={() => console.log("Preview clicked")}
                      onDownloadSource={handleDownloadSource}
                      freeDownloadBadge={freeDownloadBadge}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <ClipEditor
                      media={media}
                      onExtract={handleExtract}
                      isExtracting={isExtracting}
                      maxClipSeconds={
                        quota?.role === "guest"
                          ? (quota.max_clip_seconds ?? 20)
                          : null
                      }
                      selectedFormatId={selectedFormatId}
                      onSelectFormat={setSelectedFormatId}
                      b1tBalance={quota?.b1t_balance ?? null}
                    />
                  </div>
                </div>
                {extractMutation.isError && (
                  <div className="p-3 text-sm text-accent-error bg-accent-error/10 border border-accent-error/40">
                    {extractMutation.error instanceof Error
                      ? extractMutation.error.message
                      : "Extraction failed. Please try again."}
                  </div>
                )}
                {downloadMutation.isError && (
                  <div className="p-3 text-sm text-accent-error bg-accent-error/10 border border-accent-error/40">
                    {downloadMutation.error instanceof Error
                      ? downloadMutation.error.message
                      : "Download failed. Please try again."}
                  </div>
                )}
              </div>
            )}

            {view === "extracting" && (
              <ExtractionProgress isPending={isExtracting} />
            )}

            {view === "result" && extractResult && (
              <DeliverPanel
                extractResult={extractResult}
                onRestart={handleBackToInput}
              />
            )}
          </div>
        </main>
      </div>
      {isDevModeAvailable && <DevModeToggle />}
      <BuyB1tModal
        isOpen={isBuyModalOpen}
        onClose={() => setIsBuyModalOpen(false)}
        onPurchased={() => {
          setIsBuyModalOpen(false);
          getQuota()
            .then(setQuota)
            .catch(() => {});
        }}
      />
    </div>
  );
}