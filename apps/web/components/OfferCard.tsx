import type { Offer } from "../lib/types";
import { formatDelivery, formatPrice } from "../lib/format";
import { getProviderMetadata } from "../lib/providerMetadata";

export type OfferBadge = "cheapest" | "fastest" | "bestValue" | "outOfStock";

const BADGE_STYLES: Record<OfferBadge, string> = {
  cheapest: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  fastest: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  bestValue: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  outOfStock: "border-red-400/30 bg-red-400/10 text-red-300",
};

const BADGE_LABELS: Record<OfferBadge, string> = {
  cheapest: "Cheapest",
  fastest: "Fastest",
  bestValue: "Best Value",
  outOfStock: "Out of Stock",
};

interface OfferCardProps {
  offer: Offer;
  badges: OfferBadge[];
}

export default function OfferCard({ offer, badges }: OfferCardProps) {
  const unavailable = !offer.available;
  const isWinner = badges.some((badge) => badge !== "outOfStock");
  const metadata = getProviderMetadata(offer.providerSlug);

  return (
    <article
      className={`min-w-0 flex flex-col justify-between rounded-2xl border p-6 sm:p-7 md:p-8 transition duration-200 ${
        unavailable
          ? "border-red-300/10 bg-white/[0.02] opacity-60"
          : isWinner
            ? `${metadata.toneClass} shadow-xl hover:border-violet-300/40`
            : `${metadata.toneClass} hover:border-white/25`
      }`}
    >
      <div>
        {/* Top bar: Provider identity & badges */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-base ${metadata.avatarClass}`}
            >
              {offer.providerName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="truncate text-base font-semibold text-white">
                {offer.providerName}
              </div>
              {offer.brand && (
                <div className="truncate text-xs font-medium text-white/45">
                  {offer.brand}
                </div>
              )}
            </div>
          </div>

          {badges.length > 0 && (
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              {badges.map((badge) => (
                <span
                  key={badge}
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${BADGE_STYLES[badge]}`}
                >
                  {BADGE_LABELS[badge]}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Product title */}
        <h3
          className={`mt-5 break-words text-lg font-bold leading-snug sm:text-xl ${
            unavailable ? "text-white/60" : "text-white"
          }`}
        >
          {offer.productName}
        </h3>

        {/* Breakdown parameters grid */}
        <dl className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <StatCell label="Base price" value={formatPrice(offer.price)} />
          <StatCell
            label="Delivery fee"
            value={offer.deliveryFee === 0 ? "Free" : formatPrice(offer.deliveryFee)}
          />
          <StatCell
            label="Platform fee"
            value={offer.platformFee === 0 ? "₹0" : formatPrice(offer.platformFee)}
          />
          <StatCell
            label="Discount"
            value={offer.discount > 0 ? `-${formatPrice(offer.discount)}` : "—"}
            accent={offer.discount > 0 ? "text-emerald-300 font-semibold" : undefined}
          />
          <StatCell
            label="Delivery time"
            value={formatDelivery(offer.deliveryMinutes)}
          />
          <StatCell
            label="Availability"
            value={unavailable ? "Out of stock" : "Available"}
            accent={unavailable ? "text-red-300" : "text-emerald-300 font-medium"}
          />
        </dl>
      </div>

      {/* Effective cost & provider CTA */}
      <div className="mt-8 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
            Effective cost
          </div>
          <div className="mt-1 truncate text-3xl font-extrabold tracking-tight text-violet-100 sm:text-4xl">
            {formatPrice(offer.effectiveCost)}
          </div>
        </div>

        <div className="shrink-0">
          {offer.productUrl && !unavailable ? (
            <a
              href={offer.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-6 text-sm font-bold text-black transition hover:bg-violet-100 focus:outline-none focus:ring-2 focus:ring-violet-300/50"
            >
              View on {offer.providerName}
            </a>
          ) : (
            <span className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 text-xs font-medium text-white/40">
              {unavailable ? "Currently unavailable" : "Direct link unavailable"}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function StatCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-white/5 bg-black/25 px-3 py-2.5">
      <dt className="truncate text-[11px] font-medium uppercase tracking-wider text-white/40">
        {label}
      </dt>
      <dd className={`mt-0.5 truncate text-sm font-semibold text-white/90 ${accent ?? ""}`}>
        {value}
      </dd>
    </div>
  );
}

