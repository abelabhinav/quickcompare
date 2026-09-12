import { afterAll, beforeAll, describe, expect, it } from "vitest";
import prisma from "../lib/prisma.js";
import { syncProviderCatalog, syncAllCatalogs } from "./catalogSync.js";
import type { CommerceProvider, MockCatalogItem } from "../providers/types.js";

describe("CatalogSyncService", () => {
  async function cleanupTestData() {
    await prisma.offer.deleteMany({
      where: {
        OR: [
          { provider: { slug: { in: ["test-provider-a", "test-provider-b"] } } },
          { product: { name: "Test Sync Milk 1L" } },
        ],
      },
    });
    await prisma.priceHistory.deleteMany({
      where: {
        OR: [
          { provider: { slug: { in: ["test-provider-a", "test-provider-b"] } } },
          { product: { name: "Test Sync Milk 1L" } },
        ],
      },
    });
    await prisma.product.deleteMany({
      where: { name: "Test Sync Milk 1L" },
    });
    await prisma.provider.deleteMany({
      where: { slug: { in: ["test-provider-a", "test-provider-b"] } },
    });
  }

  beforeAll(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    // Ensure standard catalogs remain populated
    await syncAllCatalogs(prisma);
  });

  it("upserts providers, creates canonical products, and records initial price history", async () => {
    const mockProviderA: CommerceProvider = {
      name: "TestProviderA",
      slug: "test-provider-a",
      search: async () => [],
    };

    const itemsA: MockCatalogItem[] = [
      {
        productName: "Test Sync Milk 1L",
        brand: "TestBrand",
        price: 50,
        deliveryFee: 10,
        platformFee: 2,
        discount: 0,
        available: true,
        deliveryMinutes: 15,
        externalId: "test-sync-milk-a",
        searchAliases: ["milk", "dairy"],
      },
    ];

    const resultA = await syncProviderCatalog(mockProviderA, itemsA, prisma);
    expect(resultA.productsCreated).toBeGreaterThanOrEqual(1);
    expect(resultA.offersCreated).toBe(1);
    expect(resultA.priceHistoryEntriesCreated).toBe(1);

    // Verify Provider in DB
    const providerA = await prisma.provider.findUnique({
      where: { slug: "test-provider-a" },
    });
    expect(providerA).not.toBeNull();
    expect(providerA?.name).toBe("TestProviderA");

    // Verify Product in DB
    const product = await prisma.product.findFirst({
      where: { name: "Test Sync Milk 1L" },
    });
    expect(product).not.toBeNull();
    expect(product?.brand).toBe("TestBrand");
    expect(product?.searchAliases).toContain("milk");
  });

  it("links another provider's offer to the same canonical product deterministically", async () => {
    const mockProviderB: CommerceProvider = {
      name: "TestProviderB",
      slug: "test-provider-b",
      search: async () => [],
    };

    const itemsB: MockCatalogItem[] = [
      {
        productName: "Test Sync Milk 1L",
        brand: "TestBrand",
        price: 48,
        deliveryFee: 15,
        platformFee: 3,
        discount: 2,
        available: true,
        deliveryMinutes: 10,
        externalId: "test-sync-milk-b",
        searchAliases: ["milk", "fresh milk"],
      },
    ];

    const resultB = await syncProviderCatalog(mockProviderB, itemsB, prisma);
    // Product should NOT be created again, but matched
    expect(resultB.productsCreated).toBe(0);
    expect(resultB.offersCreated).toBe(1);

    // Verify the single product now has 2 distinct provider offers
    const product = await prisma.product.findFirst({
      where: { name: "Test Sync Milk 1L" },
      include: {
        offers: {
          include: { provider: true },
        },
      },
    });

    expect(product?.offers).toHaveLength(2);
    const providerSlugs = product?.offers.map((o) => o.provider.slug);
    expect(providerSlugs).toContain("test-provider-a");
    expect(providerSlugs).toContain("test-provider-b");
    // Aliases should have been merged
    expect(product?.searchAliases).toEqual(
      expect.arrayContaining(["milk", "dairy", "fresh milk"]),
    );
  });

  it("is completely idempotent when re-syncing without price changes", async () => {
    const mockProviderA: CommerceProvider = {
      name: "TestProviderA",
      slug: "test-provider-a",
      search: async () => [],
    };

    const itemsA: MockCatalogItem[] = [
      {
        productName: "Test Sync Milk 1L",
        brand: "TestBrand",
        price: 50,
        deliveryFee: 10,
        platformFee: 2,
        discount: 0,
        available: true,
        deliveryMinutes: 15,
        externalId: "test-sync-milk-a",
        searchAliases: ["milk", "dairy"],
      },
    ];

    const resyncResult = await syncProviderCatalog(
      mockProviderA,
      itemsA,
      prisma,
    );
    expect(resyncResult.productsCreated).toBe(0);
    expect(resyncResult.offersCreated).toBe(0);
    expect(resyncResult.offersUpdated).toBe(1);
    expect(resyncResult.priceHistoryEntriesCreated).toBe(0);
  });

  it("creates a new PriceHistory record when an offer price changes", async () => {
    const mockProviderA: CommerceProvider = {
      name: "TestProviderA",
      slug: "test-provider-a",
      search: async () => [],
    };

    // Update price from 50 to 55
    const updatedItemsA: MockCatalogItem[] = [
      {
        productName: "Test Sync Milk 1L",
        brand: "TestBrand",
        price: 55,
        deliveryFee: 10,
        platformFee: 2,
        discount: 0,
        available: true,
        deliveryMinutes: 15,
        externalId: "test-sync-milk-a",
        searchAliases: ["milk", "dairy"],
      },
    ];

    const priceChangeResult = await syncProviderCatalog(
      mockProviderA,
      updatedItemsA,
      prisma,
    );
    expect(priceChangeResult.offersUpdated).toBe(1);
    expect(priceChangeResult.priceHistoryEntriesCreated).toBe(1);

    const product = await prisma.product.findFirst({
      where: { name: "Test Sync Milk 1L" },
      include: {
        priceHistory: {
          where: { provider: { slug: "test-provider-a" } },
          orderBy: { recordedAt: "asc" },
        },
      },
    });

    expect(product?.priceHistory).toHaveLength(2);
    expect(Number(product?.priceHistory[0]?.price)).toBe(50);
    expect(Number(product?.priceHistory[1]?.price)).toBe(55);
  });

  it("syncAllCatalogs seeds all default mock providers and catalogs", async () => {
    const summary = await syncAllCatalogs(prisma);
    expect(summary.providersSynced).toBe(2);
    expect(summary.offersCreated + summary.offersUpdated).toBeGreaterThanOrEqual(
      50,
    );
  });
});
