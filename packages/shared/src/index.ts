/**
 * Provider identifier metadata (slug and human-readable name)
 */
export type ProviderIdentifier = {
  name: string;
  slug: string;
};

/**
 * Normalized provider offer before comparison calculations
 */
export type NormalizedOffer = {
  providerName: string;
  providerSlug: string;
  productName: string;
  brand?: string;
  category?: string;
  subcategory?: string;
  variant?: string;
  size?: string;
  unit?: string;
  imageUrl?: string;
  description?: string;
  price: number;
  deliveryFee: number;
  platformFee: number;
  discount: number;
  available: boolean;
  deliveryMinutes?: number;
  externalId?: string;
  productUrl?: string;
};

/**
 * Offer with calculated effective delivered cost
 */
export type EffectiveOffer = NormalizedOffer & {
  effectiveCost: number;
};

/**
 * Offer is an alias for EffectiveOffer commonly used in client-facing code
 */
export type Offer = EffectiveOffer;

/**
 * Aggregated comparison output with calculated category winners
 */
export type ComparisonResult = {
  offers: EffectiveOffer[];
  cheapest: EffectiveOffer | null;
  fastest: EffectiveOffer | null;
  bestValue: EffectiveOffer | null;
};

/**
 * Standard public API comparison response contract
 */
export type CompareResponse = {
  query: string;
  result: ComparisonResult;
};

export type DiscoveryProduct = {
  id: string;
  name: string;
  brand?: string;
  category?: string;
  categorySlug?: string;
  subcategory?: string;
  subcategorySlug?: string;
  variant?: string;
  size?: string;
  unit?: string;
  imageUrl?: string;
  description?: string;
  lowestPrice?: number;
  providerCount: number;
  available: boolean;
};

export type DiscoveryCategory = {
  name: string;
  slug: string;
  productCount: number;
};

export type DiscoveryBrand = {
  name: string;
  slug: string;
  productCount: number;
};
