import { afterAll, beforeAll, describe, expect, it } from "vitest";
import prisma from "../lib/prisma.js";
import { createServer } from "../server.js";
import { getProductPriceHistory } from "./priceHistory.js";

const PRODUCT_WITH_HISTORY = "Milestone 4 Price History Milk 1L";
const PRODUCT_WITHOUT_HISTORY = "Milestone 4 No History Rice 1kg";
const PROVIDER_A_SLUG = "m4-history-provider-a";
const PROVIDER_B_SLUG = "m4-history-provider-b";

async function cleanupTestData() {
  await prisma.priceHistory.deleteMany({
    where: {
      OR: [
        {
          product: {
            name: { in: [PRODUCT_WITH_HISTORY, PRODUCT_WITHOUT_HISTORY] },
          },
        },
        { provider: { slug: { in: [PROVIDER_A_SLUG, PROVIDER_B_SLUG] } } },
      ],
    },
  });
  await prisma.offer.deleteMany({
    where: {
      OR: [
        {
          product: {
            name: { in: [PRODUCT_WITH_HISTORY, PRODUCT_WITHOUT_HISTORY] },
          },
        },
        { provider: { slug: { in: [PROVIDER_A_SLUG, PROVIDER_B_SLUG] } } },
      ],
    },
  });
  await prisma.product.deleteMany({
    where: { name: { in: [PRODUCT_WITH_HISTORY, PRODUCT_WITHOUT_HISTORY] } },
  });
  await prisma.provider.deleteMany({
    where: { slug: { in: [PROVIDER_A_SLUG, PROVIDER_B_SLUG] } },
  });
}

async function createHistoryFixture() {
  const [providerA, providerB] = await Promise.all([
    prisma.provider.create({
      data: {
        name: "M4 History Provider A",
        slug: PROVIDER_A_SLUG,
      },
    }),
    prisma.provider.create({
      data: {
        name: "M4 History Provider B",
        slug: PROVIDER_B_SLUG,
      },
    }),
  ]);

  const product = await prisma.product.create({
    data: {
      name: PRODUCT_WITH_HISTORY,
      brand: "MilestoneBrand",
    },
  });

  const productWithoutHistory = await prisma.product.create({
    data: {
      name: PRODUCT_WITHOUT_HISTORY,
      brand: "MilestoneBrand",
    },
  });

  await prisma.priceHistory.createMany({
    data: [
      {
        productId: product.id,
        providerId: providerA.id,
        price: "54.50",
        recordedAt: new Date("2026-09-10T08:00:00.000Z"),
      },
      {
        productId: product.id,
        providerId: providerB.id,
        price: "60.25",
        recordedAt: new Date("2026-09-11T08:00:00.000Z"),
      },
      {
        productId: product.id,
        providerId: providerA.id,
        price: "52.25",
        recordedAt: new Date("2026-09-12T08:00:00.000Z"),
      },
      {
        productId: product.id,
        providerId: providerB.id,
        price: "58.00",
        recordedAt: new Date("2026-09-13T08:00:00.000Z"),
      },
    ],
  });

  return {
    product,
    productWithoutHistory,
  };
}

describe("PriceHistoryService", () => {
  let productId: string;
  let productWithoutHistoryId: string;

  beforeAll(async () => {
    await cleanupTestData();
    const fixture = await createHistoryFixture();
    productId = fixture.product.id;
    productWithoutHistoryId = fixture.productWithoutHistory.id;
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it("retrieves chronological provider-aware price history and converts Decimal prices to numbers", async () => {
    const result = await getProductPriceHistory(productId, prisma);

    expect(result.found).toBe(true);
    if (!result.found) {
      throw new Error("Expected product history fixture to exist");
    }

    expect(result.data.product).toEqual({
      id: productId,
      name: PRODUCT_WITH_HISTORY,
      brand: "MilestoneBrand",
    });
    expect(result.data.history.map((record) => record.recordedAt)).toEqual([
      "2026-09-10T08:00:00.000Z",
      "2026-09-11T08:00:00.000Z",
      "2026-09-12T08:00:00.000Z",
      "2026-09-13T08:00:00.000Z",
    ]);
    expect(result.data.history.map((record) => record.provider.slug)).toEqual([
      PROVIDER_A_SLUG,
      PROVIDER_B_SLUG,
      PROVIDER_A_SLUG,
      PROVIDER_B_SLUG,
    ]);
    expect(result.data.history.every((record) => typeof record.price === "number")).toBe(
      true,
    );
    expect(result.data.history.map((record) => record.price)).toEqual([
      54.5, 60.25, 52.25, 58,
    ]);
  });

  it("calculates lowest, highest, average, observation count, and latest price per provider", async () => {
    const result = await getProductPriceHistory(productId, prisma);

    expect(result.found).toBe(true);
    if (!result.found) {
      throw new Error("Expected product history fixture to exist");
    }

    expect(result.data.analytics).toEqual({
      currentPrices: [
        {
          provider: {
            name: "M4 History Provider A",
            slug: PROVIDER_A_SLUG,
          },
          price: 52.25,
          recordedAt: "2026-09-12T08:00:00.000Z",
        },
        {
          provider: {
            name: "M4 History Provider B",
            slug: PROVIDER_B_SLUG,
          },
          price: 58,
          recordedAt: "2026-09-13T08:00:00.000Z",
        },
      ],
      lowestPrice: 52.25,
      highestPrice: 60.25,
      averagePrice: 56.25,
      observationCount: 4,
    });
  });

  it("returns a valid empty-history response for an existing product with no history", async () => {
    const result = await getProductPriceHistory(productWithoutHistoryId, prisma);

    expect(result.found).toBe(true);
    if (!result.found) {
      throw new Error("Expected no-history fixture to exist");
    }

    expect(result.data.history).toEqual([]);
    expect(result.data.analytics).toEqual({
      currentPrices: [],
      lowestPrice: null,
      highestPrice: null,
      averagePrice: null,
      observationCount: 0,
    });
  });

  it("returns not found for a nonexistent product", async () => {
    const result = await getProductPriceHistory(
      "00000000-0000-4000-8000-000000000000",
      prisma,
    );

    expect(result).toEqual({ found: false });
  });
});

describe("Price history API", () => {
  let productId: string;
  let productWithoutHistoryId: string;

  beforeAll(async () => {
    await cleanupTestData();
    const fixture = await createHistoryFixture();
    productId = fixture.product.id;
    productWithoutHistoryId = fixture.productWithoutHistory.id;
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it("serves price history analytics through /api/products/:id/price-history", async () => {
    const app = await createServer();

    const response = await app.inject({
      method: "GET",
      url: `/api/products/${productId}/price-history`,
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.body);
    expect(json.product.id).toBe(productId);
    expect(json.history).toHaveLength(4);
    expect(json.analytics.lowestPrice).toBe(52.25);
    expect(json.analytics.currentPrices).toHaveLength(2);
  });

  it("returns 400 for invalid product IDs", async () => {
    const app = await createServer();

    const response = await app.inject({
      method: "GET",
      url: "/api/products/not-a-uuid/price-history",
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({
      error: "Product ID must be a valid UUID",
    });
  });

  it("returns 404 for nonexistent products", async () => {
    const app = await createServer();

    const response = await app.inject({
      method: "GET",
      url: "/api/products/00000000-0000-4000-8000-000000000000/price-history",
    });

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body)).toEqual({
      error: "Product not found",
    });
  });

  it("returns an empty history response for existing products without history", async () => {
    const app = await createServer();

    const response = await app.inject({
      method: "GET",
      url: `/api/products/${productWithoutHistoryId}/price-history`,
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.body);
    expect(json.history).toEqual([]);
    expect(json.analytics.observationCount).toBe(0);
  });

  it("keeps the existing /api/compare response shape unchanged", async () => {
    const app = await createServer();

    const response = await app.inject({
      method: "GET",
      url: "/api/compare?q=Tata%20Salt",
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.body);
    expect(Object.keys(json).sort()).toEqual(["query", "result"]);
    expect(json.query).toBe("Tata Salt");
    expect(json.result).toEqual(
      expect.objectContaining({
        offers: expect.any(Array),
      }),
    );
  });
});
