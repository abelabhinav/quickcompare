import type {
  NormalizedOffer,
  ProviderIdentifier,
} from "@quickcompare/shared";

export type { ProviderIdentifier, NormalizedOffer };

export interface CommerceProvider extends ProviderIdentifier {
  search(query: string): Promise<NormalizedOffer[]>;
  getCatalog?(): MockCatalogItem[] | Promise<MockCatalogItem[]>;
}


export type MockCatalogItem = Omit<
  NormalizedOffer,
  "providerName" | "providerSlug" | "productUrl"
> & {
  searchAliases?: string[];
  providerProductPath?: string;
  productUrl?: string;
};

