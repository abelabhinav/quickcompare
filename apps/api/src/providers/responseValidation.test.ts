import { describe, expect, it } from "vitest";
import {
  normalizeValidatedOffers,
  validateProviderSearchResponse,
} from "./responseValidation.js";
import { ProviderIntegrationError } from "./integrationErrors.js";

describe("provider response validation", () => {
  it("validates and normalizes provider responses into NormalizedOffer", () => {
    const response = validateProviderSearchResponse(
      {
        offers: [
          {
            productName: "Provider Milk 1L",
            brand: "Provider Dairy",
            price: 52,
            deliveryFee: 5,
            platformFee: 2,
            discount: 1,
            available: true,
            deliveryMinutes: 11,
            externalId: "milk-1l",
          },
        ],
      },
      "future-provider",
    );

    expect(
      normalizeValidatedOffers(response, {
        name: "Future Provider",
        slug: "future-provider",
      }),
    ).toEqual([
      {
        providerName: "Future Provider",
        providerSlug: "future-provider",
        productName: "Provider Milk 1L",
        brand: "Provider Dairy",
        price: 52,
        deliveryFee: 5,
        platformFee: 2,
        discount: 1,
        available: true,
        deliveryMinutes: 11,
        externalId: "milk-1l",
      },
    ]);
  });

  it("rejects invalid provider responses before normalization", () => {
    expect(() =>
      validateProviderSearchResponse(
        {
          offers: [
            {
              productName: "Missing price",
              available: true,
            },
          ],
        },
        "future-provider",
      ),
    ).toThrow(ProviderIntegrationError);
  });
});
