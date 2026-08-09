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
import { useMutation } from "@tanstack/react-query";
import { extractClip, downloadSource, getFileUrl, getQuota } from "../lib/api";
import type { InspectResponse, ExtractResponse, QuotaResponse } from "../types";

type ViewState = "input" | "source" | "extractor" | "result";

export default function Landing() {
  const [view, setView] = useState<ViewState>("input");
  const [media, setMedia] = useState<InspectResponse | null>(null);
  const [extractResult, setExtractResult] = useState<ExtractResponse | null>(
    null,
  );
  const [quota, setQuota] = useState<QuotaResponse | null>(null);
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);

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
  });

  const handleInspectSuccess = (data: InspectResponse) => {
    setMedia(data);
    setView("source");
  };

  const handleExtract = (start: number, end: number) => {
    if (!media) return;
    extractMutation.mutate({
      url: media.webpage_url || media.id,
      start,
      end,
      format: "mp4",
    });
  };

  const handleDownloadSource = () => {
    if (!media) return;
    downloadMutation.mutate({ url: media.webpage_url || media.id });
  };

  const handleBackToInput = () => {
    setMedia(null);
    setExtractResult(null);
    setView("input");
  };

  const handleBackToSource = () => {
    setView("source");
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

  return (
    <div className="min-h-screen bg-charcoal text-ink flex flex-col items-center px-4 py-12 hud-scanlines">
      <div className="w-full max-w-4xl">
        {view === "input" ? (
          <div className="text-center mb-12 relative hud-corner-brackets py-8">
            <Logo className="w-24 h-24 mx-auto mb-4" />
            <h1 className="text-5xl font-bold tracking-tight mb-1">M2P</h1>
            <p className="text-xl text-gray-400">Media Server 2 Peer</p>
          </div>
        ) : (
          <div className="flex items-center justify-between mb-6 pb-4 hud-glow-border border-t-0 border-x-0">
            <div className="flex items-center gap-3">
              <Logo className="w-8 h-8" />
              <span className="text-lg font-bold tracking-tight">M2P</span>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <ProgressRail current={view} />
          <div className="flex items-center gap-3">
            <AuthStatus />
            <button
              onClick={() => setIsBuyModalOpen(true)}
              className="hud-button px-3 py-1 text-sm text-white bg-gray-800 border border-gray-700 hover:bg-gray-700"
            >
              Buy B1T$
            </button>
          </div>
        </div>

        {view === "input" && (
          <div className="space-y-12">
            <div className="text-center">
              <UrlInput onInspectSuccess={handleInspectSuccess} />
            </div>
            <div className="text-center space-y-4 text-gray-300">
              <p className="text-lg">
                Extract what you need. Take it to your workflow.
              </p>
              <div className="space-y-2 font-mono text-xs">
                <p>
                  <span className="text-red-400 font-medium">GUEST:</span>{" "}
                  20s clip extraction, always free. Plus one free unlimited
                  full download.
                </p>
                <p>
                  <span className="text-red-400 font-medium">
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
              className="text-sm text-gray-400 hover:text-gray-300"
            >
              ← Back to URL input
            </button>
            <SourceCard
              media={media}
              onExtract={() => setView("extractor")}
              onPreview={() => console.log("Preview clicked")}
              onDownloadSource={handleDownloadSource}
              freeDownloadBadge={freeDownloadBadge}
            />
            {downloadMutation.isError && (
              <div className="p-3 text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-lg">
                {downloadMutation.error instanceof Error
                  ? downloadMutation.error.message
                  : "Download failed. Please try again."}
              </div>
            )}
          </div>
        )}

        {view === "extractor" && media && (
          <div className="space-y-6">
            <button
              onClick={handleBackToSource}
              className="text-sm text-gray-400 hover:text-gray-300"
            >
              ← Back to source
            </button>
            <ClipEditor
              media={media}
              onExtract={handleExtract}
              isExtracting={extractMutation.isPending}
              maxClipSeconds={
                quota?.role === "guest" ? (quota.max_clip_seconds ?? 20) : null
              }
            />
            {extractMutation.isError && (
              <div className="p-3 text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-lg">
                {extractMutation.error instanceof Error
                  ? extractMutation.error.message
                  : "Extraction failed. Please try again."}
              </div>
            )}
          </div>
        )}

        {view === "result" && extractResult && (
          <div className="text-center space-y-6">
            <div className="hud-panel p-6 bg-gray-900 border border-gray-800">
              <h2 className="text-xl font-bold text-white mb-4">
                Clip ready!
              </h2>
              <p className="text-gray-300 mb-4">
                Your clip is ready to download.
              </p>
              <a
                href={getFileUrl(extractResult.file_id)}
                download={`m2p_clip_${extractResult.file_id.slice(0, 8)}.mp4`}
                className="hud-button inline-block px-6 py-3 text-lg font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                Download clip
              </a>
            </div>
            <button
              onClick={handleBackToInput}
              className="text-sm text-gray-400 hover:text-gray-300"
            >
              ← Extract another clip
            </button>
          </div>
        )}
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
