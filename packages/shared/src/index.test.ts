import { describe, expect, it } from "vitest";
import type {
  CompareResponse,
  ComparisonResult,
  EffectiveOffer,
  NormalizedOffer,
  Offer,
  ProviderIdentifier,
} from "./index.js";

describe("Shared contracts", () => {
  it("allows constructing valid normalized and effective offers conforming to shared types", () => {
    const provider: ProviderIdentifier = {
      name: "Blinkit",
      slug: "blinkit",
    };
    expect(provider.name).toBe("Blinkit");
    expect(provider.slug).toBe("blinkit");

    const rawOffer: NormalizedOffer = {
      providerName: provider.name,
      providerSlug: provider.slug,
      productName: "Amul Milk 1L",
      brand: "Amul",
      price: 58,
      deliveryFee: 25,
      platformFee: 5,
      discount: 2,
      available: true,
      deliveryMinutes: 12,
      externalId: "blinkit-amul-milk",
    };

    const effectiveOffer: EffectiveOffer = {
      ...rawOffer,
      effectiveCost: 86,
    };

    const clientOffer: Offer = effectiveOffer;
    expect(clientOffer.effectiveCost).toBe(86);

    const comparisonResult: ComparisonResult = {
      offers: [effectiveOffer],
      cheapest: effectiveOffer,
      fastest: effectiveOffer,
      bestValue: effectiveOffer,
    };

    const compareResponse: CompareResponse = {
      query: "milk",
      result: comparisonResult,
    };

    expect(compareResponse.query).toBe("milk");
    expect(compareResponse.result.offers).toHaveLength(1);
    expect(compareResponse.result.cheapest?.effectiveCost).toBe(86);
  });
});
