import { describe, expect, it } from "vitest";
import { compareOffers } from "./comparison.js";
import type { NormalizedOffer } from "../providers/types.js";

const COST_WEIGHT = 0.65;
const SPEED_WEIGHT = 0.35;

function makeOffer(
  overrides: Partial<NormalizedOffer> & Pick<NormalizedOffer, "externalId">,
): NormalizedOffer {
  return {
    providerName: "Test Provider",
    providerSlug: "test-provider",
    productName: "Test Product",
    price: 100,
    deliveryFee: 0,
    platformFee: 0,
    discount: 0,
    available: true,
    deliveryMinutes: 15,
    productUrl: "https://example.com/product",
    ...overrides,
  };
}

function calculateBestValueScore(
  offer: { effectiveCost: number; deliveryMinutes: number },
  minCost: number,
  maxCost: number,
  minMinutes: number,
  maxMinutes: number,
): number {
  const costRange = maxCost - minCost;
  const minutesRange = maxMinutes - minMinutes;
  const costScore =
    costRange === 0 ? 1 : 1 - (offer.effectiveCost - minCost) / costRange;
  const speedScore =
    minutesRange === 0
      ? 1
      : 1 - (offer.deliveryMinutes - minMinutes) / minutesRange;

  return COST_WEIGHT * costScore + SPEED_WEIGHT * speedScore;
}

describe("compareOffers", () => {
  it("returns empty results for empty input", () => {
    const result = compareOffers([]);

    expect(result.offers).toEqual([]);
    expect(result.cheapest).toBeNull();
    expect(result.fastest).toBeNull();
    expect(result.bestValue).toBeNull();
  });

  it("calculates effective cost and rounds to two decimal places", () => {
    const result = compareOffers([
      makeOffer({
        externalId: "rounding",
        price: 10.333,
        deliveryFee: 5.666,
        platformFee: 2.111,
        discount: 1.222,
      }),
    ]);

    expect(result.offers[0]?.effectiveCost).toBe(16.89);
    expect(result.offers[0]?.effectiveCost).toBe(
      Math.round((10.333 + 5.666 + 2.111 - 1.222) * 100) / 100,
    );
  });

  it("selects the available offer with the lowest effective cost as cheapest", () => {
    const result = compareOffers([
      makeOffer({
        externalId: "expensive",
        price: 120,
        deliveryFee: 20,
        platformFee: 5,
        discount: 0,
      }),
      makeOffer({
        externalId: "cheapest",
        price: 80,
        deliveryFee: 10,
        platformFee: 2,
        discount: 5,
      }),
      makeOffer({
        externalId: "mid",
        price: 100,
        deliveryFee: 15,
        platformFee: 3,
        discount: 2,
      }),
    ]);

    expect(result.cheapest?.externalId).toBe("cheapest");
    expect(result.cheapest?.effectiveCost).toBe(87);
  });

  it("excludes unavailable offers from cheapest, fastest, and best value", () => {
    const result = compareOffers([
      makeOffer({
        externalId: "unavailable-cheapest",
        price: 1,
        deliveryFee: 0,
        platformFee: 0,
        discount: 0,
        deliveryMinutes: 1,
        available: false,
      }),
      makeOffer({
        externalId: "available-winner",
        price: 100,
        deliveryFee: 10,
        platformFee: 5,
        discount: 0,
        deliveryMinutes: 20,
      }),
    ]);

    expect(result.offers).toHaveLength(2);
    expect(result.cheapest?.externalId).toBe("available-winner");
    expect(result.fastest?.externalId).toBe("available-winner");
    expect(result.bestValue?.externalId).toBe("available-winner");
  });

  it("selects the available offer with the lowest delivery minutes as fastest", () => {
    const result = compareOffers([
      makeOffer({
        externalId: "slow",
        price: 90,
        deliveryMinutes: 30,
      }),
      makeOffer({
        externalId: "fastest",
        price: 110,
        deliveryMinutes: 8,
      }),
      makeOffer({
        externalId: "mid",
        price: 100,
        deliveryMinutes: 15,
      }),
    ]);

    expect(result.fastest?.externalId).toBe("fastest");
    expect(result.fastest?.deliveryMinutes).toBe(8);
  });

  it("keeps offers without delivery time in results but excludes them from fastest and best value", () => {
    const result = compareOffers([
      makeOffer({
        externalId: "no-delivery-time",
        price: 50,
        deliveryMinutes: undefined,
      }),
      makeOffer({
        externalId: "with-delivery-time",
        price: 100,
        deliveryMinutes: 12,
      }),
    ]);

    expect(result.offers.map((offer) => offer.externalId)).toEqual([
      "no-delivery-time",
      "with-delivery-time",
    ]);
    expect(result.fastest?.externalId).toBe("with-delivery-time");
    expect(result.bestValue?.externalId).toBe("with-delivery-time");
  });

  it("selects best value using the 65% cost and 35% speed scoring formula", () => {
    const offers = [
      makeOffer({
        externalId: "balanced-winner",
        price: 80,
        deliveryFee: 0,
        platformFee: 0,
        discount: 0,
        deliveryMinutes: 20,
      }),
      makeOffer({
        externalId: "expensive-fast",
        price: 120,
        deliveryFee: 0,
        platformFee: 0,
        discount: 0,
        deliveryMinutes: 10,
      }),
      makeOffer({
        externalId: "cheap-slow",
        price: 100,
        deliveryFee: 0,
        platformFee: 0,
        discount: 0,
        deliveryMinutes: 30,
      }),
    ];

    const result = compareOffers(offers);
    const effectiveCosts = result.offers.map((offer) => offer.effectiveCost);
    const deliveryMinutes = result.offers.map(
      (offer) => offer.deliveryMinutes!,
    );
    const minCost = Math.min(...effectiveCosts);
    const maxCost = Math.max(...effectiveCosts);
    const minMinutes = Math.min(...deliveryMinutes);
    const maxMinutes = Math.max(...deliveryMinutes);

    const scores = result.offers.map((offer) =>
      calculateBestValueScore(
        {
          effectiveCost: offer.effectiveCost,
          deliveryMinutes: offer.deliveryMinutes!,
        },
        minCost,
        maxCost,
        minMinutes,
        maxMinutes,
      ),
    );

    expect(scores[0]).toBeCloseTo(0.825, 5);
    expect(scores[1]).toBeCloseTo(0.35, 5);
    expect(scores[2]).toBeCloseTo(0.325, 5);
    expect(result.bestValue?.externalId).toBe("balanced-winner");
  });

  it("assigns cost score 1 to every offer when effective costs are equal", () => {
    const offers = [
      makeOffer({
        externalId: "fastest-equal-cost",
        price: 100,
        deliveryFee: 5,
        platformFee: 2,
        discount: 7,
        deliveryMinutes: 10,
      }),
      makeOffer({
        externalId: "slower-equal-cost",
        price: 90,
        deliveryFee: 10,
        platformFee: 0,
        discount: 0,
        deliveryMinutes: 20,
      }),
    ];

    const result = compareOffers(offers);
    const effectiveCosts = result.offers.map((offer) => offer.effectiveCost);
    const minCost = Math.min(...effectiveCosts);
    const maxCost = Math.max(...effectiveCosts);

    expect(minCost).toBe(maxCost);
    expect(minCost).toBe(100);

    const costScores = result.offers.map((offer) =>
      maxCost - minCost === 0
        ? 1
        : 1 - (offer.effectiveCost - minCost) / (maxCost - minCost),
    );
    expect(costScores).toEqual([1, 1]);
    expect(result.bestValue?.externalId).toBe("fastest-equal-cost");
  });

  it("breaks tied best value scores by lower effective cost", () => {
    const offers = [
      makeOffer({
        externalId: "lower-cost-tie",
        price: 81,
        deliveryFee: 0,
        platformFee: 0,
        discount: 0,
        deliveryMinutes: 24,
      }),
      makeOffer({
        externalId: "higher-cost-tie",
        price: 95,
        deliveryFee: 0,
        platformFee: 0,
        discount: 0,
        deliveryMinutes: 11,
      }),
      makeOffer({
        externalId: "worse",
        price: 115,
        deliveryFee: 0,
        platformFee: 0,
        discount: 0,
        deliveryMinutes: 28,
      }),
    ];

    const result = compareOffers(offers);
    const effectiveCosts = result.offers.map((offer) => offer.effectiveCost);
    const deliveryMinutes = result.offers.map(
      (offer) => offer.deliveryMinutes!,
    );
    const minCost = Math.min(...effectiveCosts);
    const maxCost = Math.max(...effectiveCosts);
    const minMinutes = Math.min(...deliveryMinutes);
    const maxMinutes = Math.max(...deliveryMinutes);

    const lowerCostScore = calculateBestValueScore(
      {
        effectiveCost: result.offers[0]!.effectiveCost,
        deliveryMinutes: result.offers[0]!.deliveryMinutes!,
      },
      minCost,
      maxCost,
      minMinutes,
      maxMinutes,
    );
    const higherCostScore = calculateBestValueScore(
      {
        effectiveCost: result.offers[1]!.effectiveCost,
        deliveryMinutes: result.offers[1]!.deliveryMinutes!,
      },
      minCost,
      maxCost,
      minMinutes,
      maxMinutes,
    );

    expect(lowerCostScore).toBeCloseTo(higherCostScore, 10);
    expect(result.bestValue?.externalId).toBe("lower-cost-tie");
    expect(result.bestValue?.effectiveCost).toBe(81);
  });

  it("breaks tied best value scores by lower delivery minutes when effective cost is also equal", () => {
    const result = compareOffers([
      makeOffer({
        externalId: "slower-tie",
        price: 100,
        deliveryFee: 0,
        platformFee: 0,
        discount: 0,
        deliveryMinutes: 18,
      }),
      makeOffer({
        externalId: "faster-tie",
        price: 100,
        deliveryFee: 0,
        platformFee: 0,
        discount: 0,
        deliveryMinutes: 12,
      }),
      makeOffer({
        externalId: "same-cost-slower",
        price: 100,
        deliveryFee: 0,
        platformFee: 0,
        discount: 0,
        deliveryMinutes: 18,
      }),
    ]);

    const tiedOffers = result.offers.filter(
      (offer) =>
        offer.effectiveCost === 100 &&
        (offer.externalId === "slower-tie" ||
          offer.externalId === "same-cost-slower"),
    );
    const minCost = Math.min(...result.offers.map((offer) => offer.effectiveCost));
    const maxCost = Math.max(...result.offers.map((offer) => offer.effectiveCost));
    const minMinutes = Math.min(
      ...result.offers.map((offer) => offer.deliveryMinutes!),
    );
    const maxMinutes = Math.max(
      ...result.offers.map((offer) => offer.deliveryMinutes!),
    );

    const slowerScore = calculateBestValueScore(
      {
        effectiveCost: tiedOffers[0]!.effectiveCost,
        deliveryMinutes: tiedOffers[0]!.deliveryMinutes!,
      },
      minCost,
      maxCost,
      minMinutes,
      maxMinutes,
    );
    const duplicateScore = calculateBestValueScore(
      {
        effectiveCost: tiedOffers[1]!.effectiveCost,
        deliveryMinutes: tiedOffers[1]!.deliveryMinutes!,
      },
      minCost,
      maxCost,
      minMinutes,
      maxMinutes,
    );

    expect(slowerScore).toBeCloseTo(duplicateScore, 10);
    expect(result.bestValue?.effectiveCost).toBe(100);
    expect(result.bestValue?.externalId).toBe("faster-tie");
    expect(result.bestValue?.deliveryMinutes).toBe(12);
  });

  it("does not mutate the input offers array or offer objects", () => {
    const offers = [
      makeOffer({
        externalId: "immutable",
        price: 100,
        deliveryFee: 10,
        platformFee: 5,
        discount: 2,
        deliveryMinutes: 15,
      }),
    ];
    const offersSnapshot = structuredClone(offers);

    compareOffers(offers);

    expect(offers).toEqual(offersSnapshot);
    expect(offers[0]).toEqual(offersSnapshot[0]);
  });
});
