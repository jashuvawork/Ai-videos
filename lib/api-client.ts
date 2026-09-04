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
    const snippet = text.replace(/\s+/g, " ").slice(0, 120);
    throw new Error(
      response.ok
        ? "Server returned invalid JSON"
        : `Request failed (${response.status}): ${snippet}`,
    );
  }
}

export async function fetchJson<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<{ data: T; response: Response }> {
  const response = await fetch(input, init);
  const data = await parseJsonResponse<T>(response);
  return { data, response };
}
