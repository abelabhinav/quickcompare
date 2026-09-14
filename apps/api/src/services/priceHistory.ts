import type { PrismaClient } from "@prisma/client";
import prisma from "../lib/prisma.js";

export type PriceHistoryProvider = {
  name: string;
  slug: string;
};

export type PriceHistoryRecord = {
  provider: PriceHistoryProvider;
  price: number;
  recordedAt: string;
};

export type ProviderLatestPrice = {
  provider: PriceHistoryProvider;
  price: number;
  recordedAt: string;
};

export type PriceHistoryAnalytics = {
  currentPrices: ProviderLatestPrice[];
  lowestPrice: number | null;
  highestPrice: number | null;
  averagePrice: number | null;
  observationCount: number;
};

export type ProductPriceHistoryResponse = {
  product: {
    id: string;
    name: string;
    brand?: string;
  };
  history: PriceHistoryRecord[];
  analytics: PriceHistoryAnalytics;
};

export type ProductPriceHistoryResult =
  | { found: true; data: ProductPriceHistoryResponse }
  | { found: false };

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function getProductPriceHistory(
  productId: string,
  prismaClient: PrismaClient = prisma,
): Promise<ProductPriceHistoryResult> {
  const product = await prismaClient.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      brand: true,
      priceHistory: {
        orderBy: [{ recordedAt: "asc" }, { id: "asc" }],
        include: {
          provider: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
      },
    },
  });

  if (!product) {
    return { found: false };
  }

  const history: PriceHistoryRecord[] = product.priceHistory.map((record) => ({
    provider: {
      name: record.provider.name,
      slug: record.provider.slug,
    },
    price: Number(record.price),
    recordedAt: record.recordedAt.toISOString(),
  }));

  const prices = history.map((record) => record.price);
  const latestByProvider = new Map<string, ProviderLatestPrice>();

  for (const record of history) {
    latestByProvider.set(record.provider.slug, {
      provider: record.provider,
      price: record.price,
      recordedAt: record.recordedAt,
    });
  }

  const data: ProductPriceHistoryResponse = {
    product: {
      id: product.id,
      name: product.name,
      ...(product.brand ? { brand: product.brand } : {}),
    },
    history,
    analytics: {
      currentPrices: Array.from(latestByProvider.values()),
      lowestPrice: prices.length === 0 ? null : Math.min(...prices),
      highestPrice: prices.length === 0 ? null : Math.max(...prices),
      averagePrice:
        prices.length === 0
          ? null
          : roundToTwoDecimals(
              prices.reduce((sum, price) => sum + price, 0) / prices.length,
            ),
      observationCount: history.length,
    },
  };

  return {
    found: true,
    data,
  };
}
