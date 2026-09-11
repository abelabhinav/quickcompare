import type { CompareResponse, ComparisonResult, Offer } from "../lib/types";
import ResultSummary from "./ResultSummary";
import OfferCard, { type OfferBadge } from "./OfferCard";

interface ResultsSectionProps {
  isLoading: boolean;
  hasSearched: boolean;
  error: string | null;
  result: CompareResponse | null;
}

function getOfferKey(offer: Offer): string {
  return `${offer.providerSlug}::${offer.externalId ?? offer.productName}::${offer.price}`;
}

function getOfferBadges(offer: Offer, result: ComparisonResult): OfferBadge[] {
  if (!offer.available) {
    return ["outOfStock"];
  }

  const badges: OfferBadge[] = [];
  const offerKey = getOfferKey(offer);

  if (result.cheapest && getOfferKey(result.cheapest) === offerKey) {
    badges.push("cheapest");
  }
  if (result.fastest && getOfferKey(result.fastest) === offerKey) {
    badges.push("fastest");
  }
  if (result.bestValue && getOfferKey(result.bestValue) === offerKey) {
    badges.push("bestValue");
  }

  return badges;
}

export default function ResultsSection({
  isLoading,
  hasSearched,
  error,
  result,
}: ResultsSectionProps) {
  if (error) {
    return (
      <section className="border-y border-white/10 bg-white/[0.015]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14">
          <div className="mx-auto max-w-xl rounded-2xl border border-red-400/20 bg-red-400/[0.06] p-8 text-center">
            <h2 className="text-xl font-semibold text-red-200">Search failed</h2>
            <p className="mt-3 leading-7 text-white/60">{error}</p>
          </div>
        </div>
      </section>
    );
  }

  if (!hasSearched || isLoading || !result) {
    return null;
  }

  if (result.result.offers.length === 0) {
    return (
      <section className="border-y border-white/10 bg-white/[0.015]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14">
          <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
            <h2 className="text-xl font-semibold">No matching products found</h2>
            <p className="mt-3 leading-7 text-white/50">
              {`We couldn't find any offers for "${result.query}". Try a broader product name or another category.`}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="relative space-y-10 md:space-y-14">
      <ResultSummary query={result.query} result={result.result} />

      <section>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 md:py-10">
          <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-300/70">
                Direct Provider Comparison
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-white md:text-3xl">
                Compare your options
              </h2>
            </div>
            <div className="inline-flex w-fit items-center rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1 text-xs font-medium text-white/60">
              {result.result.offers.length} offer
              {result.result.offers.length === 1 ? "" : "s"} found
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
            {result.result.offers.map((offer) => (
              <OfferCard
                key={getOfferKey(offer)}
                offer={offer}
                badges={getOfferBadges(offer, result.result)}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

