/**
 * Client-side API base URL.
 * On Vercel (UI only), set NEXT_PUBLIC_API_BASE_URL to your Railway backend.
 * On Railway (full stack), leave unset — uses same-origin /api routes.
 */
export function getApiBaseUrl(): string {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";
  }
  return (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");
}

export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${normalized}` : normalized;
}

/**
 * Parse a fetch Response as JSON with clear errors when the body is HTML/plain text
 * (Safari otherwise reports: "The string did not match the expected pattern").
 */
export async function parseJsonResponse<T = unknown>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text.trim()) {
    if (!response.ok) {
      throw new Error(`Request failed (${response.status})`);
    }
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    const snippet = text.replace(/\s+/g, " ").slice(0, 160);
    const isHtml = /<!DOCTYPE|<html/i.test(text);

    if (isHtml || response.status >= 500) {
      const base = getApiBaseUrl();
      const hint = base
        ? ` Backend (${base}) may be down or misconfigured.`
        : " If you use Vercel for the UI only, set NEXT_PUBLIC_API_BASE_URL to your Railway backend.";
      throw new Error(`Server error (${response.status}).${hint}`);
    }

    throw new Error(
      response.ok
        ? "Server returned invalid JSON"
        : `Request failed (${response.status}): ${snippet}`,
    );
  }
}

export async function fetchJson<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<{ data: T; response: Response }> {
  const response = await fetch(apiUrl(path), init);
  const data = await parseJsonResponse<T>(response);
  return { data, response };
}

export function toUserFacingError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Something went wrong";
  if (message.includes("The string did not match the expected pattern")) {
    return "Server returned an invalid response. Check that NEXT_PUBLIC_API_BASE_URL points to your Railway backend.";
  }
  if (message.includes("DATABASE_URL")) {
    return "Database not configured on this server. Use the Railway backend URL for API calls.";
  }
  if (message.includes("Failed to fetch") || message.includes("NetworkError")) {
    const base = getApiBaseUrl();
    return base
      ? `Cannot reach API at ${base}. Check Railway is running.`
      : "Cannot reach API. Deploy the full app on Railway or set NEXT_PUBLIC_API_BASE_URL.";
  }
  return message;
}
