/**
 * A source that can be matched against a query. Providers pass their internal
 * catalog items here; the matching logic knows nothing about a specific provider.
 */
export type MatchSource = {
  productName: string;
  brand?: string;
  category?: string;
  subcategory?: string;
  variant?: string;
  size?: string;
  unit?: string;
  searchAliases?: string[];
};

/**
 * Normalize a string for deterministic, case-insensitive matching:
 * - trims surrounding whitespace
 * - lower-cases
 * - collapses runs of whitespace into a single space
 */
export function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Returns the normalized searchable text for a source. This is intentionally
 * simple and deterministic for the MVP. A future AI/product-matching engine can
 * replace the body of this function without changing the provider contract.
 */
export function getSearchableText(source: MatchSource): string {
  return normalizeText(
    [
      source.productName,
      source.brand,
      source.category,
      source.subcategory,
      source.variant,
      source.size,
      source.unit,
      ...(source.searchAliases ?? []),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

/**
 * Deterministically decides whether a catalog item matches a query.
 *
 * Matching rules:
 * - case-insensitive and whitespace-tolerant
 * - a single-token query matches an alias, brand, or product-name prefix
 *   (so "milk" finds an item with a milk alias without matching every product
 *   that happens to mention milk)
 * - a multi-token query requires each token to appear in the searchable text
 *   (so "amul milk" finds "Amul Taaza Toned Milk 1L" but not "Tata Salt")
 *
 * This avoids overly broad substring behavior that would surface completely
 * unrelated products.
 */
export function matchesQuery(source: MatchSource, query: string): boolean {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return false;
  }

  const haystack = getSearchableText(source);
  const tokens = normalizedQuery.split(" ").filter(Boolean);

  if (tokens.length === 1) {
    const token = tokens[0];
    const normalizedBrand = normalizeText(source.brand ?? "");
    const normalizedProductName = normalizeText(source.productName);
    const normalizedAliases = (source.searchAliases ?? []).map(normalizeText);
    const normalizedCategory = normalizeText(source.category ?? "");
    const normalizedSubcategory = normalizeText(source.subcategory ?? "");
    const normalizedVariant = normalizeText(source.variant ?? "");
    const normalizedSize = normalizeText(source.size ?? "");

    return (
      normalizedBrand === token ||
      normalizedCategory === token ||
      normalizedSubcategory === token ||
      normalizedVariant.includes(token) ||
      normalizedSize === token ||
      normalizedAliases.some((alias) => alias.includes(token)) ||
      normalizedProductName.startsWith(token)
    );
  }

  return tokens.every((token) => haystack.includes(token));
}
