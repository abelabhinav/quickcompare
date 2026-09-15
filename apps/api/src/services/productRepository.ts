import type { PrismaClient } from "@prisma/client";
import type { NormalizedOffer } from "../providers/types.js";
import { normalizeText } from "../providers/matching.js";
import prisma from "../lib/prisma.js";

export async function searchProductsInDb(
  query: string,
  prismaClient: PrismaClient = prisma,
): Promise<NormalizedOffer[]> {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return [];
  }

  const tokens = normalizedQuery.split(" ").filter(Boolean);
  if (tokens.length === 0) {
    return [];
  }

  let products;

  if (tokens.length === 1) {
    const token = tokens[0];
    products = await prismaClient.product.findMany({
      where: {
        AND: [
          { canonicalKey: { not: null } },
          {
            OR: [
              { name: { startsWith: token, mode: "insensitive" } },
              { brand: { equals: token, mode: "insensitive" } },
              { category: { equals: token, mode: "insensitive" } },
              { subcategory: { equals: token, mode: "insensitive" } },
              { variant: { startsWith: token, mode: "insensitive" } },
              { size: { equals: token, mode: "insensitive" } },
              { unit: { equals: token, mode: "insensitive" } },
              { searchAliases: { has: token } },
            ],
          },
        ],
      },
      include: {
        offers: {
          include: {
            provider: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
  } else {
    const andConditions = tokens.map((token) => ({
      OR: [
        { name: { contains: token, mode: "insensitive" as const } },
        { brand: { contains: token, mode: "insensitive" as const } },
        { category: { contains: token, mode: "insensitive" as const } },
        { subcategory: { contains: token, mode: "insensitive" as const } },
        { variant: { contains: token, mode: "insensitive" as const } },
        { size: { contains: token, mode: "insensitive" as const } },
        { unit: { contains: token, mode: "insensitive" as const } },
        { searchAliases: { has: token } },
      ],
    }));

    products = await prismaClient.product.findMany({
      where: {
        AND: [{ canonicalKey: { not: null } }, ...andConditions],
      },
      include: {
        offers: {
          include: {
            provider: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
  }

  const normalizedOffers: NormalizedOffer[] = [];

  for (const product of products) {
    for (const offer of product.offers) {
      normalizedOffers.push({
        providerName: offer.provider.name,
        providerSlug: offer.provider.slug,
        productName: product.name,
        brand: product.brand ?? undefined,
        category: product.category ?? undefined,
        subcategory: product.subcategory ?? undefined,
        variant: product.variant ?? undefined,
        size: product.size ?? undefined,
        unit: product.unit ?? undefined,
        imageUrl: product.imageUrl ?? undefined,
        description: product.description ?? undefined,
        price: Number(offer.price),
        deliveryFee: Number(offer.deliveryFee),
        platformFee: Number(offer.platformFee),
        discount: Number(offer.discount),
        available: offer.available,
        deliveryMinutes: offer.deliveryMinutes ?? undefined,
        externalId: offer.externalId ?? undefined,
        productUrl: offer.productUrl ?? undefined,
      });
    }
  }

  return normalizedOffers;
}
