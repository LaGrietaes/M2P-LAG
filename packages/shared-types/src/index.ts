/**
 * M2P shared types — Zod schemas shared between frontend and backend.
 *
 * These mirror the Pydantic models in services/api/models.py so that the
 * wire format has a single source of truth.
 */

import { z } from "zod";

// ── Media inspection (§08) ─────────────────────────────────────────────

export const InspectRequestSchema = z.object({
  url: z.string().min(1, "URL is required"),
});

export const FormatOptionSchema = z.object({
  format_id: z.string(),
  ext: z.string(),
  resolution: z.string().optional(),
  filesize: z.number().optional(),
  tbr: z.number().optional(),
  codec: z.string().optional(),
  vcodec: z.string().optional(),
  acodec: z.string().optional(),
  height: z.number().optional(),
});

export const SubtitleOptionSchema = z.object({
  language: z.string(),
  ext: z.string(),
  url: z.string().optional(),
});

export const InspectResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  creator: z.string().optional().nullable(),
  duration: z.number().optional().nullable(),
  thumbnail: z.string().optional().nullable(),
  platform: z.string().optional().nullable(),
  webpage_url: z.string().optional().nullable(),
  upload_date: z.string().optional().nullable(),
  formats: z.array(FormatOptionSchema).default([]),
  subtitles: z.array(SubtitleOptionSchema).default([]),
});

export type InspectRequest = z.infer<typeof InspectRequestSchema>;
export type InspectResponse = z.infer<typeof InspectResponseSchema>;
export type FormatOption = z.infer<typeof FormatOptionSchema>;
export type SubtitleOption = z.infer<typeof SubtitleOptionSchema>;

// ── Extraction (§08, §10) ──────────────────────────────────────────────

export const ExtractRequestSchema = z.object({
  url: z.string().min(1, "URL is required"),
  start: z.number().min(0, "Start must be >= 0"),
  end: z.number().min(0, "End must be >= 0"),
  format: z.string().default("mp4"),
});

export const ExtractResponseSchema = z.object({
  file_id: z.string(),
  status: z.string(),
  message: z.string().optional().nullable(),
});

export const JobResponseSchema = z.object({
  id: z.string(),
  status: z.string(),
  media_id: z.string().optional().nullable(),
  start: z.number().optional().nullable(),
  end: z.number().optional().nullable(),
  file_id: z.string().optional().nullable(),
  error: z.string().optional().nullable(),
  created_at: z.number(),
  expires_at: z.number().optional().nullable(),
});

export type ExtractRequest = z.infer<typeof ExtractRequestSchema>;
export type ExtractResponse = z.infer<typeof ExtractResponseSchema>;
export type JobResponse = z.infer<typeof JobResponseSchema>;

// ── Health / version ───────────────────────────────────────────────────

export const HealthResponseSchema = z.object({
  status: z.string(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const VersionResponseSchema = z.object({
  version: z.string(),
  yt_dlp: z.string().optional().nullable(),
  ffmpeg: z.string().optional().nullable(),
});

export type VersionResponse = z.infer<typeof VersionResponseSchema>;

// ── Format selection (§H, §I, §11) ─────────────────────────────────────

export type ContentType = "video" | "audio" | "transcript";

export type VideoPreset = "compatible" | "high_quality";
export type AudioPreset = "mp3" | "original";
export type TranscriptFormat = "srt" | "vtt" | "txt";

export interface FormatSelection {
  contentType: ContentType;
  videoPreset: VideoPreset;
  resolution: string;
  audioPreset: AudioPreset;
  transcriptFormat: TranscriptFormat;
}
