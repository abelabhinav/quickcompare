import type {
  NormalizedOffer,
  ProviderIdentifier,
} from "@quickcompare/shared";

export type { ProviderIdentifier, NormalizedOffer };

export interface CommerceProvider extends ProviderIdentifier {
  search(query: string): Promise<NormalizedOffer[]>;
  getCatalog?(): MockCatalogItem[] | Promise<MockCatalogItem[]>;
  getHealth?(): ProviderHealth | Promise<ProviderHealth>;
}

export type ProviderHealth = {
  enabled: boolean;
  status: "mock" | "ready" | "disabled" | "missing_configuration" | "unavailable";
  supportsCatalog: boolean;
};


export type MockCatalogItem = Omit<
  NormalizedOffer,
  "providerName" | "providerSlug" | "productUrl"
> & {
  canonicalKey?: string;
  category?: string;
  categorySlug?: string;
  subcategory?: string;
  subcategorySlug?: string;
  variant?: string;
  size?: string;
  unit?: string;
  imageUrl?: string;
  description?: string;
  searchAliases?: string[];
  providerProductPath?: string;
  productUrl?: string;
};
