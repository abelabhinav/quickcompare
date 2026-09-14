"use client";

import { useCallback, useRef, useState } from "react";
import LocationControl from "../components/LocationControl";
import SearchBar from "../components/SearchBar";
import ResultsSection from "../components/ResultsSection";
import { searchProducts } from "../lib/api";
import type { CompareResponse } from "../lib/types";

const EXAMPLE_SEARCHES = [
  "Milk",
  "Tata Salt",
  "Maggi",
  "Condoms",
  "Shampoo",
  "Toothpaste",
];

export default function Home() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResponse | null>(null);
  const requestIdRef = useRef(0);

  const runSearch = useCallback(async (searchTerm: string) => {
    const trimmed = searchTerm.trim();
    if (!trimmed) {
      return;
    }

    const requestId = ++requestIdRef.current;

    setQuery(trimmed);
    setIsLoading(true);
    setHasSearched(true);
    setError(null);
    setResult(null);

    try {
      const data = await searchProducts(trimmed);
      if (requestIdRef.current === requestId) {
        setResult(data);
      }
    } catch (err) {
      if (requestIdRef.current === requestId) {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong while searching.",
        );
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, []);

  const handleSubmit = useCallback(() => {
    void runSearch(query);
  }, [query, runSearch]);

  const handleExample = useCallback((example: string) => {
    void runSearch(example);
  }, [runSearch]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#060711]/95 text-white">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-black text-black">
              QC
            </div>

            <span className="text-xl font-bold tracking-tight">
              Quick<span className="text-white/50">Compare</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <LocationControl />
          </div>

          <div className="hidden items-center gap-8 text-sm text-white/60 md:flex">
            <a href="#how-it-works" className="transition hover:text-white">
              How it works
            </a>
            <a href="#features" className="transition hover:text-white">
              Features
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(109,40,217,0.22),transparent_48%)]" />

        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 sm:px-6 pb-16 pt-16 text-center md:pb-20 md:pt-24">
          <div className="mb-6 rounded-full border border-violet-300/20 bg-violet-400/[0.08] px-4 py-1.5 text-xs sm:text-sm font-medium text-violet-100/70">
            Compare smarter. Buy better.
          </div>

          <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Find the best deal.
            <br />
            <span className="text-white/40">Without checking everywhere.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-7 text-white/55 sm:text-lg sm:leading-8">
            Search once and compare prices, delivery speed, discounts and
            availability across multiple shopping platforms.
          </p>

          <SearchBar
            value={query}
            onChange={setQuery}
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs text-white/35">
            <span>Try:</span>
            {EXAMPLE_SEARCHES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => handleExample(example)}
                className="rounded-full border border-white/10 px-3 py-1 transition hover:border-white/25 hover:text-white/70"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Results */}
      <ResultsSection
        isLoading={isLoading}
        hasSearched={hasSearched}
        error={error}
        result={result}
      />

      {/* How it works */}
      <section
        id="how-it-works"
        className="border-y border-white/10 bg-white/[0.015]"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 md:py-20">
          <div className="mb-10 md:mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-300/70">
              How it works
            </p>

            <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-4xl">
              One search. Better decisions.
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <FeatureCard
              number="01"
              title="Search once"
              description="Enter the product you want. QuickCompare handles the search across supported providers."
            />

            <FeatureCard
              number="02"
              title="Compare offers"
              description="See price, fees, discounts, delivery time and availability in one clean comparison."
            />

            <FeatureCard
              number="03"
              title="Choose smarter"
              description="QuickCompare calculates the effective cost and highlights the best option for you."
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 md:py-20">
          <div className="mb-10 md:mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-300/70">
              Built for real shopping
            </p>

            <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-4xl">
              More than just a price checker.
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <SmallFeature
              title="Cheapest"
              description="Find the lowest effective cost."
            />

            <SmallFeature
              title="Fastest"
              description="See which provider can deliver sooner."
            />

            <SmallFeature
              title="Best Value"
              description="Balance price and delivery speed."
            />

            <SmallFeature
              title="Availability"
              description="Know what's actually available."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 sm:px-6 py-8 text-sm text-white/35 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 QuickCompare</p>
          <p>Shopping intelligence, simplified.</p>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-7 transition hover:border-white/20 hover:bg-white/[0.05]">
      <div className="mb-8 text-sm font-mono text-violet-300/60">{number}</div>

      <h3 className="text-lg font-bold sm:text-xl">{title}</h3>

      <p className="mt-2.5 text-sm leading-6 text-white/50 sm:text-base sm:leading-7">{description}</p>
    </div>
  );
}

function SmallFeature({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6 transition hover:border-white/20">
      <div className="mb-4 h-2 w-2 rounded-full bg-violet-400" />

      <h3 className="font-bold text-white">{title}</h3>

      <p className="mt-2 text-xs leading-5 text-white/40 sm:text-sm sm:leading-6">{description}</p>
    </div>
  );
}
