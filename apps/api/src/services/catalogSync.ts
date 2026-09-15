import type { PrismaClient } from "@prisma/client";
import { ProviderRegistry, providerRegistry } from "../providers/index.js";
import type { CommerceProvider, MockCatalogItem } from "../providers/types.js";
import prisma from "../lib/prisma.js";
import { normalizeText } from "../providers/matching.js";

export type SyncSummary = {
  providersSynced: number;
  productsCreated: number;
  productsUpdated: number;
  offersCreated: number;
  offersUpdated: number;
  priceHistoryEntriesCreated: number;
};

function slugify(value: string): string {
  return normalizeText(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function getCanonicalKey(item: MockCatalogItem): string {
  return (
    item.canonicalKey ??
    slugify(
      [
        item.brand,
        item.productName,
        item.variant,
        item.size,
        item.unit,
      ]
        .filter(Boolean)
        .join(" "),
    )
  );
}

function getProductData(item: MockCatalogItem) {
  return {
    canonicalKey: getCanonicalKey(item),
    name: item.productName,
    brand: item.brand ?? null,
    category: item.category ?? null,
    categorySlug: item.categorySlug ?? (item.category ? slugify(item.category) : null),
    subcategory: item.subcategory ?? null,
    subcategorySlug:
      item.subcategorySlug ?? (item.subcategory ? slugify(item.subcategory) : null),
    variant: item.variant ?? null,
    size: item.size ?? null,
    unit: item.unit ?? null,
    imageUrl: item.imageUrl ?? null,
    description: item.description ?? null,
  };
}

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
    const productData = getProductData(item);

    // Canonical product matching: the canonical key is the product/variant identity.
    const existingProduct = await prismaClient.product.findUnique({
      where: { canonicalKey: productData.canonicalKey },
    });

    let product = await prismaClient.product.upsert({
      where: { canonicalKey: productData.canonicalKey },
      create: {
        ...productData,
        searchAliases: item.searchAliases ?? [],
      },
      update: productData,
    });

    if (!existingProduct) {
      productsCreated++;
    } else {
      // Merge searchAliases deterministically
      const currentAliases = existingProduct.searchAliases ?? [];
      const newAliases = item.searchAliases ?? [];
      const combinedAliases = Array.from(
        new Set([...currentAliases, ...newAliases]),
      );

      const metadataChanged =
        existingProduct.category !== productData.category ||
        existingProduct.categorySlug !== productData.categorySlug ||
        existingProduct.subcategory !== productData.subcategory ||
        existingProduct.subcategorySlug !== productData.subcategorySlug ||
        existingProduct.variant !== productData.variant ||
        existingProduct.size !== productData.size ||
        existingProduct.unit !== productData.unit ||
        existingProduct.imageUrl !== productData.imageUrl ||
        existingProduct.description !== productData.description;

      if (combinedAliases.length !== currentAliases.length || metadataChanged) {
        product = await prismaClient.product.update({
          where: { id: product.id },
          data: {
            ...productData,
            searchAliases: combinedAliases,
          },
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
  registry: ProviderRegistry = providerRegistry,
): Promise<SyncSummary> {
  const summary: SyncSummary = {
    providersSynced: 0,
    productsCreated: 0,
    productsUpdated: 0,
    offersCreated: 0,
    offersUpdated: 0,
    priceHistoryEntriesCreated: 0,
  };

  for (const provider of registry.list()) {
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
