import { describe, expect, it } from "vitest";
import { searchAllProviders } from "./index.js";

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
});