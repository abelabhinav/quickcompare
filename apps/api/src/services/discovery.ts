import type { PrismaClient } from "@prisma/client";
import type {
  DiscoveryBrand,
  DiscoveryCategory,
  DiscoveryProduct,
} from "@quickcompare/shared";
import prisma from "../lib/prisma.js";

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function toDiscoveryProduct(product: {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  categorySlug: string | null;
  subcategory: string | null;
  subcategorySlug: string | null;
  variant: string | null;
  size: string | null;
  unit: string | null;
  imageUrl: string | null;
  description: string | null;
  offers: Array<{ price: unknown; available: boolean; providerId: string }>;
}): DiscoveryProduct {
  const availableOffers = product.offers.filter((offer) => offer.available);
  const lowestPrice =
    availableOffers.length > 0
      ? Math.min(...availableOffers.map((offer) => Number(offer.price)))
      : undefined;

  return {
    id: product.id,
    name: product.name,
    ...(product.brand ? { brand: product.brand } : {}),
    ...(product.category ? { category: product.category } : {}),
    ...(product.categorySlug ? { categorySlug: product.categorySlug } : {}),
    ...(product.subcategory ? { subcategory: product.subcategory } : {}),
    ...(product.subcategorySlug ? { subcategorySlug: product.subcategorySlug } : {}),
    ...(product.variant ? { variant: product.variant } : {}),
    ...(product.size ? { size: product.size } : {}),
    ...(product.unit ? { unit: product.unit } : {}),
    ...(product.imageUrl ? { imageUrl: product.imageUrl } : {}),
    ...(product.description ? { description: product.description } : {}),
    ...(lowestPrice !== undefined ? { lowestPrice } : {}),
    providerCount: new Set(product.offers.map((offer) => offer.providerId)).size,
    available: availableOffers.length > 0,
  };
}

export async function getCategories(
  prismaClient: PrismaClient = prisma,
): Promise<DiscoveryCategory[]> {
  const groups = await prismaClient.product.groupBy({
    by: ["category", "categorySlug"],
    where: { category: { not: null } },
    _count: { _all: true },
    orderBy: { category: "asc" },
  });

  return groups.map((group) => ({
    name: group.category!,
    slug: group.categorySlug ?? slugify(group.category!),
    productCount: group._count._all,
  }));
}

export async function getBrands(
  prismaClient: PrismaClient = prisma,
): Promise<DiscoveryBrand[]> {
  const groups = await prismaClient.product.groupBy({
    by: ["brand"],
    where: { brand: { not: null } },
    _count: { _all: true },
    orderBy: { brand: "asc" },
  });

  return groups.map((group) => ({
    name: group.brand!,
    slug: slugify(group.brand!),
    productCount: group._count._all,
  }));
}

export async function getProductsByCategory(
  categorySlug: string,
  prismaClient: PrismaClient = prisma,
): Promise<DiscoveryProduct[]> {
  const products = await prismaClient.product.findMany({
    where: { categorySlug },
    include: { offers: true },
    orderBy: [{ brand: "asc" }, { name: "asc" }],
  });

  return products.map(toDiscoveryProduct);
}

export async function getProductById(
  id: string,
  prismaClient: PrismaClient = prisma,
): Promise<DiscoveryProduct | null> {
  const product = await prismaClient.product.findUnique({
    where: { id },
    include: { offers: true },
  });

  return product ? toDiscoveryProduct(product) : null;
}
