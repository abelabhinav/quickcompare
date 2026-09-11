import type { ComparisonResult, Offer } from "../lib/types";
import { formatDelivery, formatPrice } from "../lib/format";

interface ResultSummaryProps {
  query: string;
  result: ComparisonResult;
}

export default function ResultSummary({
  query,
  result,
}: ResultSummaryProps) {
  return (
    <section className="border-y border-violet-300/10 bg-[radial-gradient(circle_at_top,rgba(109,40,217,0.14),transparent_55%)]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 md:py-14">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-300/70">
            Overview
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
            Comparison results
          </h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/50">
            <span>
              Results for: <strong className="font-semibold text-white">{query}</strong>
            </span>
            <span className="text-white/20">|</span>
            <span className="text-xs text-white/40">
              Effective cost = price + delivery fee + platform fee - discount
            </span>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-5">
          <SummaryCard
            label="Cheapest"
            accentColor="emerald"
            offer={result.cheapest}
            value={
              result.cheapest
                ? formatPrice(result.cheapest.effectiveCost)
                : null
            }
          />

          <SummaryCard
            label="Fastest"
            accentColor="sky"
            offer={result.fastest}
            value={
              result.fastest
                ? formatDelivery(result.fastest.deliveryMinutes)
                : null
            }
          />

          <SummaryCard
            label="Best Value"
            accentColor="amber"
            offer={result.bestValue}
            value={
              result.bestValue
                ? `${formatPrice(result.bestValue.effectiveCost)} · ${formatDelivery(
                    result.bestValue.deliveryMinutes,
                  )}`
                : null
            }
          />
        </div>
      </div>
    </section>
  );
}

const SUMMARY_TONES: Record<string, { border: string; bg: string; text: string }> = {
  emerald: {
    border: "border-emerald-400/25",
    bg: "bg-emerald-400/[0.035]",
    text: "text-emerald-300",
  },
  sky: {
    border: "border-sky-400/25",
    bg: "bg-sky-400/[0.035]",
    text: "text-sky-300",
  },
  amber: {
    border: "border-amber-400/25",
    bg: "bg-amber-400/[0.035]",
    text: "text-amber-300",
  },
};

function SummaryCard({
  label,
  accentColor,
  offer,
  value,
}: {
  label: string;
  accentColor: "emerald" | "sky" | "amber";
  offer: Offer | null;
  value: string | null;
}) {
  const tone = SUMMARY_TONES[accentColor];

  return (
    <div
      className={`min-w-0 rounded-2xl border p-6 transition duration-200 shadow-xl ${
        offer
          ? `${tone.border} ${tone.bg} shadow-black/20`
          : "border-white/10 bg-white/[0.02]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-xs font-bold uppercase tracking-wider ${
            offer ? tone.text : "text-white/35"
          }`}
        >
          {label}
        </span>
        {offer && (
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-white/70">
            {offer.providerName}
          </span>
        )}
      </div>

      {offer ? (
        <>
          <div className="mt-4 truncate text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            {value}
          </div>
          <p className="mt-2 truncate text-xs text-white/50">
            {offer.brand ? `${offer.brand} · ` : ""}
            <span className="text-white/70">{offer.productName}</span>
          </p>
        </>
      ) : (
        <div className="mt-4 text-sm text-white/40">No available offers</div>
      )}
    </div>
  );
}

