import type {
  InspectRequest,
  InspectResponse,
  ExtractRequest,
  ExtractResponse,
  JobResponse,
} from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8001";

export async function inspectMedia(
  request: InspectRequest,
): Promise<InspectResponse> {
  const response = await fetch(`${API_BASE}/api/v1/media/inspect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as { detail?: string }).detail || "Failed to inspect media",
    );
  }

  return response.json();
}

export async function extractClip(
  request: ExtractRequest,
): Promise<ExtractResponse> {
  const response = await fetch(`${API_BASE}/api/v1/jobs/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as { detail?: string }).detail || "Failed to extract clip",
    );
  }

  return response.json();
}

export async function getJob(jobId: string): Promise<JobResponse> {
  const response = await fetch(`${API_BASE}/api/v1/jobs/${jobId}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as { detail?: string }).detail || "Failed to get job status",
    );
  }

  return response.json();
}

export function getFileUrl(fileId: string): string {
  return `${API_BASE}/api/v1/files/${fileId}`;
}

export async function getHealth(): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE}/health`);
  if (!response.ok) throw new Error("Health check failed");
  return response.json();
}

export async function getVersion(): Promise<{
  version: string;
  yt_dlp?: string | null;
  ffmpeg?: string | null;
}> {
  const response = await fetch(`${API_BASE}/version`);
  if (!response.ok) throw new Error("Version check failed");
  return response.json();
}

export async function getMe(): Promise<any> {
  const response = await fetch(`${API_BASE}/api/v1/me`);
  if (!response.ok) throw new Error("Failed to get session");
  return response.json();
}

export async function getQuota(): Promise<any> {
  const response = await fetch(`${API_BASE}/api/v1/me/quota`);
  if (!response.ok) throw new Error("Failed to get quota");
  return response.json();
}