import { useState } from "react";
import { Logo } from "../components/Logo";
import { UrlInput } from "../components/UrlInput";
import { SourceCard } from "../features/source/SourceCard";
import { ClipEditor } from "../features/extractor/ClipEditor";
import { AuthStatus } from "../components/AuthStatus";
import { DevModeToggle } from "../components/DevModeToggle";
import { useMutation } from "@tanstack/react-query";
import { extractClip, getFileUrl } from "../lib/api";
import type { InspectResponse, ExtractResponse } from "../types";

type ViewState = "input" | "source" | "extractor" | "result";

export default function Landing() {
  const [view, setView] = useState<ViewState>("input");
  const [media, setMedia] = useState<InspectResponse | null>(null);
  const [extractResult, setExtractResult] = useState<ExtractResponse | null>(
    null,
  );

  const extractMutation = useMutation({
    mutationFn: extractClip,
    onSuccess: (data) => {
      setExtractResult(data);
      setView("result");
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

  const handleBackToInput = () => {
    setMedia(null);
    setExtractResult(null);
    setView("input");
  };

  const handleBackToSource = () => {
    setView("source");
  };

  return (
    <div className="min-h-screen bg-charcoal text-white flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
          <Logo className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-4xl font-bold tracking-tight mb-1">M2P</h1>
          <p className="text-xl text-gray-400">Media Server 2 Peer</p>
        </div>

        <div className="flex justify-end mb-6">
          <AuthStatus />
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
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="text-red-400 font-medium">
                    Guest extraction:
                  </span>{" "}
                  up to 20 seconds.
                </p>
                <p className="text-sm">
                  Registered users can download source media and prepare
                  material for their preferred editing workflow.
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
            />
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
            <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl">
              <h2 className="text-xl font-bold text-white mb-4">
                Clip ready!
              </h2>
              <p className="text-gray-300 mb-4">
                Your clip is ready to download.
              </p>
              <a
                href={getFileUrl(extractResult.file_id)}
                download={`m2p_clip_${extractResult.file_id.slice(0, 8)}.mp4`}
                className="inline-block px-6 py-3 text-lg font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
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
      <DevModeToggle />
    </div>
  );
}