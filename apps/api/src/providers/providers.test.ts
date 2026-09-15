import { describe, expect, it } from "vitest";
import { compareOffers } from "../services/comparison.js";
import {
  AllProvidersFailedError,
  ProviderRegistry,
  providerRegistry,
  searchAllProviders,
} from "./index.js";
import type { CommerceProvider, NormalizedOffer } from "./types.js";

function makeOffer(
  providerName: string,
  providerSlug: string,
  overrides: Partial<NormalizedOffer> = {},
): NormalizedOffer {
  return {
    providerName,
    providerSlug,
    productName: "Registry Test Milk 1L",
    brand: "Registry Dairy",
    price: 50,
    deliveryFee: 5,
    platformFee: 2,
    discount: 0,
    available: true,
    deliveryMinutes: 12,
    externalId: `${providerSlug}-milk`,
    ...overrides,
  };
}

describe("provider search", () => {
  it.each(["milk", "Maggi", "condoms", "shampoo", "toothpaste"]) (
    "returns offers for %s",
    async (query) => {
      const offers = await searchAllProviders(query);

      expect(offers.length).toBeGreaterThan(0);
    },
  );

  it("matches Tata Salt across both mock providers with different offers", async () => {
    const offers = await searchAllProviders("Tata Salt");

    expect(offers).toHaveLength(2);
    expect(new Set(offers.map((offer) => offer.providerSlug))).toEqual(
      new Set(["blinkit", "zepto"]),
    );
    expect(new Set(offers.map((offer) => offer.price)).size).toBe(2);
  });

  it("matches case-insensitively and across whitespace", async () => {
    const offers = await searchAllProviders("  AMUL   MILK ");

    expect(offers.length).toBeGreaterThan(0);
    expect(offers.every((offer) => offer.productName.includes("Milk"))).toBe(
      true,
    );
  });

  it("returns no offers for an unknown query", async () => {
    await expect(searchAllProviders("xyznonexistent123")).resolves.toEqual([]);
  });

  it("returns normalized offers without presenting mock URLs as live links", async () => {
    const offers = await searchAllProviders("milk");

    expect(offers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          providerName: expect.any(String),
          providerSlug: expect.any(String),
          productName: expect.any(String),
          price: expect.any(Number),
          deliveryFee: expect.any(Number),
          platformFee: expect.any(Number),
          discount: expect.any(Number),
          available: expect.any(Boolean),
        }),
      ]),
    );
    expect(offers.every((offer) => offer.productUrl === undefined)).toBe(true);
  });

  it("exposes safe provider registry metadata", async () => {
    await expect(providerRegistry.getPublicMetadata()).resolves.toEqual([
      {
        name: "Blinkit",
        slug: "blinkit",
        enabled: true,
        supportsCatalog: true,
        integrationStatus: "mock",
      },
      {
        name: "Zepto",
        slug: "zepto",
        enabled: true,
        supportsCatalog: true,
        integrationStatus: "mock",
      },
    ]);
  });

  it("keeps provider lists immutable from callers", () => {
    const registry = new ProviderRegistry([]);
    const providers = registry.list();

    providers.push({
      name: "Mutated",
      slug: "mutated",
      search: async () => [],
    });

    expect(registry.list()).toEqual([]);
  });

  it("supports a third provider through the provider contract", async () => {
    const thirdProvider: CommerceProvider = {
      name: "Test Fresh",
      slug: "test-fresh",
      search: async () => [
        makeOffer("Test Fresh", "test-fresh", {
          price: 44,
          deliveryMinutes: 18,
        }),
      ],
    };
    const registry = new ProviderRegistry([thirdProvider]);

    const offers = await registry.searchAll("milk");
    const result = compareOffers(offers);

    expect(offers).toEqual([
      expect.objectContaining({
        providerName: "Test Fresh",
        providerSlug: "test-fresh",
        productName: "Registry Test Milk 1L",
        price: 44,
      }),
    ]);
    expect(result.cheapest?.providerSlug).toBe("test-fresh");
  });

  it("isolates provider failures when another provider succeeds", async () => {
    const failingProvider: CommerceProvider = {
      name: "Fail Mart",
      slug: "fail-mart",
      search: async () => {
        throw new Error("provider unavailable");
      },
    };
    const workingProvider: CommerceProvider = {
      name: "Working Mart",
      slug: "working-mart",
      search: async () => [makeOffer("Working Mart", "working-mart")],
    };
    const registry = new ProviderRegistry([failingProvider, workingProvider]);

    await expect(registry.searchAll("milk")).resolves.toEqual([
      expect.objectContaining({ providerSlug: "working-mart" }),
    ]);
  });

  it("raises a clear error when every provider fails", async () => {
    const registry = new ProviderRegistry([
      {
        name: "Fail One",
        slug: "fail-one",
        search: async () => {
          throw new Error("one failed");
        },
      },
      {
        name: "Fail Two",
        slug: "fail-two",
        search: async () => {
          throw new Error("two failed");
        },
      },
    ]);

    await expect(registry.searchAll("milk")).rejects.toBeInstanceOf(
      AllProvidersFailedError,
    );
  });
});
