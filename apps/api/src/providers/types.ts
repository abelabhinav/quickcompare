export type ProviderIdentifier = {
  name: string;
  slug: string;
};

export type NormalizedOffer = {
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
};

export interface CommerceProvider extends ProviderIdentifier {
  search(query: string): Promise<NormalizedOffer[]>;
}
