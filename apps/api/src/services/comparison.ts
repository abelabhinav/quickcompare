import type { NormalizedOffer } from "../providers/types.js";

export type EffectiveOffer = NormalizedOffer & {
  effectiveCost: number;
};

export type ComparisonResult = {
  offers: EffectiveOffer[];
  cheapest: EffectiveOffer | null;
  fastest: EffectiveOffer | null;
  bestValue: EffectiveOffer | null;
};

const COST_WEIGHT = 0.65;
const SPEED_WEIGHT = 0.35;

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

function calculateEffectiveCost(offer: NormalizedOffer): number {
  return roundToTwoDecimals(
    offer.price + offer.deliveryFee + offer.platformFee - offer.discount,
  );
}

function compareBestValueCandidates(
  left: EffectiveOffer,
  right: EffectiveOffer,
  leftScore: number,
  rightScore: number,
): EffectiveOffer {
  if (leftScore !== rightScore) {
    return leftScore > rightScore ? left : right;
  }

  if (left.effectiveCost !== right.effectiveCost) {
    return left.effectiveCost < right.effectiveCost ? left : right;
  }

  return (left.deliveryMinutes ?? Number.POSITIVE_INFINITY) <
    (right.deliveryMinutes ?? Number.POSITIVE_INFINITY)
    ? left
    : right;
}

function selectBestValue(
  candidates: EffectiveOffer[],
): EffectiveOffer | null {
  if (candidates.length === 0) {
    return null;
  }

  const costs = candidates.map((offer) => offer.effectiveCost);
  const deliveryMinutes = candidates.map((offer) => offer.deliveryMinutes!);
  const minCost = Math.min(...costs);
  const maxCost = Math.max(...costs);
  const minMinutes = Math.min(...deliveryMinutes);
  const maxMinutes = Math.max(...deliveryMinutes);
  const costRange = maxCost - minCost;
  const minutesRange = maxMinutes - minMinutes;

  // Best Value scoring (higher composite score wins):
  // 1. Normalize effectiveCost across eligible offers to a 0–1 cost score
  //    (lower cost → higher score). When all costs are equal, every offer
  //    receives a cost score of 1.
  // 2. Normalize deliveryMinutes the same way (faster delivery → higher score).
  // 3. compositeScore = (0.65 × costScore) + (0.35 × speedScore)
  // 4. Ties break on lower effectiveCost, then lower deliveryMinutes.
  return candidates.reduce((best, current) => {
    const currentCostScore =
      costRange === 0 ? 1 : 1 - (current.effectiveCost - minCost) / costRange;
    const currentSpeedScore =
      minutesRange === 0
        ? 1
        : 1 - (current.deliveryMinutes! - minMinutes) / minutesRange;
    const currentScore =
      COST_WEIGHT * currentCostScore + SPEED_WEIGHT * currentSpeedScore;

    const bestCostScore =
      costRange === 0 ? 1 : 1 - (best.effectiveCost - minCost) / costRange;
    const bestSpeedScore =
      minutesRange === 0
        ? 1
        : 1 - (best.deliveryMinutes! - minMinutes) / minutesRange;
    const bestScore =
      COST_WEIGHT * bestCostScore + SPEED_WEIGHT * bestSpeedScore;

    return compareBestValueCandidates(
      current,
      best,
      currentScore,
      bestScore,
    );
  });
}

export function compareOffers(offers: NormalizedOffer[]): ComparisonResult {
  const effectiveOffers: EffectiveOffer[] = offers.map((offer) => ({
    ...offer,
    effectiveCost: calculateEffectiveCost(offer),
  }));

  const availableOffers = effectiveOffers.filter((offer) => offer.available);

  const cheapest =
    availableOffers.length === 0
      ? null
      : availableOffers.reduce((best, current) =>
          current.effectiveCost < best.effectiveCost ? current : best,
        );

  const offersWithDelivery = availableOffers.filter(
    (offer) => offer.deliveryMinutes !== undefined,
  );

  const fastest =
    offersWithDelivery.length === 0
      ? null
      : offersWithDelivery.reduce((best, current) =>
          current.deliveryMinutes! < best.deliveryMinutes! ? current : best,
        );

  const bestValue = selectBestValue(offersWithDelivery);

  return {
    offers: effectiveOffers,
    cheapest,
    fastest,
    bestValue,
  };
}
