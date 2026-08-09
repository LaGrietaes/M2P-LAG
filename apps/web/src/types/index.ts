import { z } from "zod";

export const InspectRequestSchema = z.object({
  url: z.string().min(1, "URL is required"),
  // Only meaningful when this schema is used for POST /jobs/download
  // (full-source download); ignored by /media/inspect.
  format_id: z.string().optional(),
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

export const ExtractRequestSchema = z.object({
  url: z.string().min(1, "URL is required"),
  start: z.number().min(0, "Start must be >= 0"),
  end: z.number().min(0, "End must be >= 0"),
  format: z.string().default("mp4"),
  // yt-dlp format_id chosen from a prior InspectResponse.formats[] entry;
  // omitted keeps the backend's default best-quality source selection.
  format_id: z.string().optional(),
});

export const ExtractResponseSchema = z.object({
  file_id: z.string(),
  status: z.string(),
  message: z.string().optional().nullable(),
  format: z.string().optional().nullable(),
  expires_at: z.number().optional().nullable(),
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

export const PurchaseRequestSchema = z.object({
  tier: z.number().int(),
});

export const PurchaseResponseSchema = z.object({
  status: z.string(),
  b1t_credited: z.number().optional().nullable(),
  message: z.string(),
});

export type PurchaseRequest = z.infer<typeof PurchaseRequestSchema>;
export type PurchaseResponse = z.infer<typeof PurchaseResponseSchema>;

export const QuotaResponseSchema = z.object({
  role: z.string(),
  max_clip_seconds: z.number().optional().nullable(),
  max_file_size: z.number().optional().nullable(),
  daily_jobs_remaining: z.number().optional().nullable(),
  b1t_balance: z.number(),
  free_download_used: z.boolean().optional().nullable(),
});

export type QuotaResponse = z.infer<typeof QuotaResponseSchema>;

export const SessionSchema = z.object({
  user_id: z.string(),
  role: z.string(),
  provider: z.string(),
  email: z.string().optional().nullable(),
  name: z.string().optional().nullable(),
  b1t_balance: z.number(),
  quota: QuotaResponseSchema.optional().nullable(),
});

export type Session = z.infer<typeof SessionSchema>;

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
  /**
   * The concrete yt-dlp format_id to request from the source (from a
   * FormatOption in InspectResponse.formats), or null to let the backend
   * fall back to its default best-quality selection. This is what
   * actually gets sent as ExtractRequest.format_id / InspectRequest
   * (download).format_id — resolution/videoPreset above describe intent
   * for the Standard-tab UI, formatId is the resolved concrete choice.
   */
  formatId: string | null;
}
