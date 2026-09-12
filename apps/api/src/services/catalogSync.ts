import type { PrismaClient } from "@prisma/client";
import { providers } from "../providers/index.js";
import type { CommerceProvider, MockCatalogItem } from "../providers/types.js";
import prisma from "../lib/prisma.js";

export type SyncSummary = {
  providersSynced: number;
  productsCreated: number;
  productsUpdated: number;
  offersCreated: number;
  offersUpdated: number;
  priceHistoryEntriesCreated: number;
};

export async function syncProviderCatalog(
  provider: CommerceProvider,
  items: MockCatalogItem[],
  prismaClient: PrismaClient = prisma,
): Promise<{
  productsCreated: number;
  productsUpdated: number;
  offersCreated: number;
  offersUpdated: number;
  priceHistoryEntriesCreated: number;
}> {
  let productsCreated = 0;
  let productsUpdated = 0;
  let offersCreated = 0;
  let offersUpdated = 0;
  let priceHistoryEntriesCreated = 0;

  // 1. Ensure Provider exists
  const dbProvider = await prismaClient.provider.upsert({
    where: { slug: provider.slug },
    create: {
      name: provider.name,
      slug: provider.slug,
    },
    update: {
      name: provider.name,
    },
  });

  // 2. Iterate and upsert products, offers, and price history
  for (const item of items) {
    // Canonical product matching: match by name and brand (case-insensitive)
    let product = await prismaClient.product.findFirst({
      where: {
        name: { equals: item.productName, mode: "insensitive" },
        ...(item.brand
          ? { brand: { equals: item.brand, mode: "insensitive" } }
          : { brand: null }),
      },
    });

    if (!product) {
      product = await prismaClient.product.create({
        data: {
          name: item.productName,
          brand: item.brand ?? null,
          searchAliases: item.searchAliases ?? [],
        },
      });
      productsCreated++;
    } else {
      // Merge searchAliases deterministically
      const currentAliases = product.searchAliases ?? [];
      const newAliases = item.searchAliases ?? [];
      const combinedAliases = Array.from(
        new Set([...currentAliases, ...newAliases]),
      );

      if (combinedAliases.length !== currentAliases.length) {
        product = await prismaClient.product.update({
          where: { id: product.id },
          data: { searchAliases: combinedAliases },
        });
        productsUpdated++;
      }
    }

    // 3. Upsert Offer
    const existingOffer = await prismaClient.offer.findUnique({
      where: {
        productId_providerId: {
          productId: product.id,
          providerId: dbProvider.id,
        },
      },
    });

    if (!existingOffer) {
      await prismaClient.offer.create({
        data: {
          productId: product.id,
          providerId: dbProvider.id,
          externalId: item.externalId ?? null,
          price: item.price,
          deliveryFee: item.deliveryFee,
          platformFee: item.platformFee,
          discount: item.discount,
          deliveryMinutes: item.deliveryMinutes ?? null,
          available: item.available,
          productUrl: item.productUrl ?? null,
          lastCheckedAt: new Date(),
        },
      });
      offersCreated++;

      // Create initial PriceHistory entry
      await prismaClient.priceHistory.create({
        data: {
          productId: product.id,
          providerId: dbProvider.id,
          price: item.price,
          recordedAt: new Date(),
        },
      });
      priceHistoryEntriesCreated++;
    } else {
      const priceChanged = Number(existingOffer.price) !== Number(item.price);

      if (priceChanged) {
        await prismaClient.priceHistory.create({
          data: {
            productId: product.id,
            providerId: dbProvider.id,
            price: item.price,
            recordedAt: new Date(),
          },
        });
        priceHistoryEntriesCreated++;
      }

      await prismaClient.offer.update({
        where: { id: existingOffer.id },
        data: {
          externalId: item.externalId ?? null,
          price: item.price,
          deliveryFee: item.deliveryFee,
          platformFee: item.platformFee,
          discount: item.discount,
          deliveryMinutes: item.deliveryMinutes ?? null,
          available: item.available,
          productUrl: item.productUrl ?? null,
          lastCheckedAt: new Date(),
        },
      });
      offersUpdated++;
    }
  }

  return {
    productsCreated,
    productsUpdated,
    offersCreated,
    offersUpdated,
    priceHistoryEntriesCreated,
  };
}

export async function syncAllCatalogs(
  prismaClient: PrismaClient = prisma,
): Promise<SyncSummary> {
  const summary: SyncSummary = {
    providersSynced: 0,
    productsCreated: 0,
    productsUpdated: 0,
    offersCreated: 0,
    offersUpdated: 0,
    priceHistoryEntriesCreated: 0,
  };

  for (const provider of providers) {
    const items = provider.getCatalog ? await provider.getCatalog() : [];
    const res = await syncProviderCatalog(provider, items, prismaClient);

    summary.providersSynced++;
    summary.productsCreated += res.productsCreated;
    summary.productsUpdated += res.productsUpdated;
    summary.offersCreated += res.offersCreated;
    summary.offersUpdated += res.offersUpdated;
    summary.priceHistoryEntriesCreated += res.priceHistoryEntriesCreated;
  }

  return summary;
}
