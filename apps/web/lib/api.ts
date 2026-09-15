import type {
  CompareResponse,
  DiscoveryBrand,
  DiscoveryCategory,
  DiscoveryProduct,
} from "./types";

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

async function fetchJson<T>(url: string, fallbackMessage: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new Error(fallbackMessage);
  }

  if (!response.ok) {
    throw new Error(fallbackMessage);
  }

  return (await response.json()) as T;
}

export async function getCategories(): Promise<DiscoveryCategory[]> {
  return fetchJson<DiscoveryCategory[]>(
    `${API_BASE_URL}/api/categories`,
    "Unable to load product categories.",
  );
}

export async function getBrands(): Promise<DiscoveryBrand[]> {
  return fetchJson<DiscoveryBrand[]>(
    `${API_BASE_URL}/api/brands`,
    "Unable to load brands.",
  );
}

export async function getProductsByCategory(
  slug: string,
): Promise<DiscoveryProduct[]> {
  return fetchJson<DiscoveryProduct[]>(
    `${API_BASE_URL}/api/categories/${encodeURIComponent(slug)}/products`,
    "Unable to load products for this category.",
  );
}
