import type { CompareResponse } from "./types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function searchProducts(query: string): Promise<CompareResponse> {
  const url = `${API_BASE_URL}/api/compare?q=${encodeURIComponent(query)}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new Error(
      "Unable to reach the comparison service. Make sure the API is running on the configured address.",
    );
  }

  if (!response.ok) {
    let message = "The comparison service returned an error.";
    try {
      const body = (await response.json()) as { error?: string };
      if (body?.error) {
        message = body.error;
      }
    } catch {
      // Ignore JSON parse errors; fall back to the generic message.
    }
    throw new Error(message);
  }

  return (await response.json()) as CompareResponse;
}
