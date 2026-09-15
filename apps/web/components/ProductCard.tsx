import type { DiscoveryProduct } from "../lib/types";
import { formatPrice } from "../lib/format";

type ProductCardProps = {
  product: DiscoveryProduct;
  onCompare: (query: string) => void;
};

export default function ProductCard({ product, onCompare }: ProductCardProps) {
  const variantLabel = [product.variant, product.size, product.unit]
    .filter(Boolean)
    .join(" ");
  const compareQuery = [
    product.brand,
    product.name,
    product.size && product.unit ? `${product.size}${product.unit}` : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className="flex min-w-0 flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.025] p-4 transition hover:border-white/25 hover:bg-white/[0.04]">
      <div>
        <div className="mb-4 flex h-24 items-center justify-center rounded-xl border border-white/10 bg-black/25">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt={product.name}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <span className="text-lg font-black text-white/25">
              {(product.brand ?? product.name).slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>

        {product.brand && (
          <div className="truncate text-xs font-semibold uppercase tracking-wider text-violet-200/60">
            {product.brand}
          </div>
        )}

        <h3 className="mt-1 line-clamp-2 min-h-11 text-sm font-bold leading-5 text-white">
          {product.name}
        </h3>

        {variantLabel && (
          <div className="mt-2 truncate text-xs text-white/45">{variantLabel}</div>
        )}
      </div>

      <div className="mt-5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-white/35">
            {product.lowestPrice ? `From ${formatPrice(product.lowestPrice)}` : "Price varies"}
          </div>
          <div className="mt-1 text-xs text-white/45">
            {product.providerCount} provider{product.providerCount === 1 ? "" : "s"}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onCompare(compareQuery)}
          className="shrink-0 rounded-lg bg-white px-3 py-2 text-xs font-bold text-black transition hover:bg-violet-100 focus:outline-none focus:ring-2 focus:ring-violet-300/50"
        >
          Compare
        </button>
      </div>
    </article>
  );
}
