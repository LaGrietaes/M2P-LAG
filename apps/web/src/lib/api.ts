import type {
  InspectRequest,
  InspectResponse,
  ExtractRequest,
  ExtractResponse,
  JobResponse,
  PurchaseRequest,
  PurchaseResponse,
  QuotaResponse,
  Session,
} from "../types";
import { getGuestToken, getAuthToken, setAuthToken } from "./guestToken";
import { isDevModeAvailable, getDevRole } from "./devMode";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "X-M2P-Guest-Token": getGuestToken(),
  };
  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  // Only ever sent from a dev build (import.meta.env.DEV); the backend
  // ignores this header entirely unless it also has M2P_DEV_MODE=true, so
  // this is inert in any real deployment either way (defense in depth).
  const devRole = getDevRole();
  if (isDevModeAvailable && (devRole === "registered" || devRole === "developer")) {
    headers["X-M2P-Dev-Role"] = "user";
  }
  return headers;
}

async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...authHeaders(),
      ...(init.headers || {}),
    },
  });
}

async function parseErrorOrThrow(response: Response, fallback: string): Promise<never> {
  const error = await response.json().catch(() => ({}));
  throw new Error((error as { detail?: string }).detail || fallback);
}

export async function inspectMedia(
  request: InspectRequest,
): Promise<InspectResponse> {
  const response = await apiFetch("/api/v1/media/inspect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) return parseErrorOrThrow(response, "Failed to inspect media");
  return response.json();
}

export async function extractClip(
  request: ExtractRequest,
): Promise<ExtractResponse> {
  const response = await apiFetch("/api/v1/jobs/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) return parseErrorOrThrow(response, "Failed to extract clip");
  return response.json();
}

export async function downloadSource(
  request: InspectRequest,
): Promise<ExtractResponse> {
  const response = await apiFetch("/api/v1/jobs/download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) return parseErrorOrThrow(response, "Failed to download source");
  return response.json();
}

export async function getJob(jobId: string): Promise<JobResponse> {
  const response = await apiFetch(`/api/v1/jobs/${jobId}`);
  if (!response.ok) return parseErrorOrThrow(response, "Failed to get job status");
  return response.json();
}

export function getFileUrl(fileId: string): string {
  return `${API_BASE}/api/v1/files/${fileId}`;
}

/**
 * Fetch a delivered file as a Blob. A plain `<a href>` to getFileUrl()
 * can't work for guests: the server requires the X-M2P-Guest-Token header
 * to verify file ownership (spec §2 ownership check), and a browser
 * navigation triggered by clicking an anchor never sends custom headers —
 * only fetch()/XHR do. This goes through apiFetch() so the header is
 * attached, then the caller turns the Blob into a download via a
 * temporary object URL.
 */
export async function downloadFile(fileId: string): Promise<Blob> {
  const response = await apiFetch(`/api/v1/files/${fileId}`);
  if (!response.ok) return parseErrorOrThrow(response, "Failed to download file");
  return response.blob();
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

export async function getMe(): Promise<Session> {
  const response = await apiFetch("/api/v1/me");
  if (!response.ok) throw new Error("Failed to get session");
  return response.json();
}

export async function getQuota(): Promise<QuotaResponse> {
  const response = await apiFetch("/api/v1/me/quota");
  if (!response.ok) throw new Error("Failed to get quota");
  return response.json();
}

export async function purchaseB1t(tier: number): Promise<PurchaseResponse> {
  const request: PurchaseRequest = { tier };
  const response = await apiFetch("/api/v1/b1t/purchase", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) return parseErrorOrThrow(response, "Failed to purchase B1T$");
  return response.json();
}

export async function loginDirectly(email: string): Promise<{
  status: string;
  token: string;
  session: Session;
}> {
  const response = await apiFetch("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) return parseErrorOrThrow(response, "Authentication failed");
  const data = await response.json();
  if (data.token) {
    setAuthToken(data.token);
  }
  return data;
}

export async function logoutUser(): Promise<void> {
  await apiFetch("/api/v1/auth/logout", { method: "POST" }).catch(() => {});
  setAuthToken(null);
}
