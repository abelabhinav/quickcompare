export interface Offer {
  providerName: string;
  providerSlug: string;
  productName: string;
  brand?: string;
  price: number;
  deliveryFee: number;
  platformFee: number;
  discount: number;
  available: boolean;
  deliveryMinutes?: number;
  externalId?: string; 
  productUrl?: string;
  effectiveCost: number;
}

export interface ComparisonResult {
  offers: Offer[];
  cheapest: Offer | null;
  fastest: Offer | null;
  bestValue: Offer | null;
}

export interface CompareResponse {
  query: string;
  result: ComparisonResult;
}
