import { beforeAll, describe, expect, it } from "vitest";
import prisma from "../lib/prisma.js";
import { searchProductsInDb } from "./productRepository.js";
import { syncAllCatalogs } from "./catalogSync.js";
import { createServer } from "../server.js";

describe("ProductRepository & Database Search", () => {
  beforeAll(async () => {
    // Ensure the database contains the standard catalog data
    await syncAllCatalogs(prisma);
  });

  it("finds products by exact or partial name", async () => {
    const offers = await searchProductsInDb("Tata Salt", prisma);
    expect(offers.length).toBeGreaterThanOrEqual(2);
    expect(offers.every((o) => o.productName.includes("Tata Salt"))).toBe(true);
  });

  it("finds products by brand", async () => {
    const offers = await searchProductsInDb("Amul", prisma);
    expect(offers.length).toBeGreaterThan(0);
    expect(offers.some((o) => o.brand === "Amul")).toBe(true);
  });

  it("finds products by search alias", async () => {
    const offers = await searchProductsInDb("shampoo", prisma);
    expect(offers.length).toBeGreaterThan(0);
    expect(
      offers.some((o) => o.productName.toLowerCase().includes("shampoo")),
    ).toBe(true);
  });

  it("finds products by category and subcategory", async () => {
    const groceryOffers = await searchProductsInDb("groceries", prisma);
    expect(groceryOffers.length).toBeGreaterThan(0);
    expect(groceryOffers.every((o) => o.category === "Groceries")).toBe(true);

    const oralCareOffers = await searchProductsInDb("oral care", prisma);
    expect(oralCareOffers.length).toBeGreaterThan(0);
    expect(oralCareOffers.some((o) => o.subcategory === "Oral Care")).toBe(true);
  });

  it("finds products by variant and size without merging variants", async () => {
    const offers = await searchProductsInDb("colgate 200g", prisma);
    expect(offers.length).toBeGreaterThan(0);
    expect(offers.every((o) => o.brand === "Colgate")).toBe(true);
    expect(offers.every((o) => o.size === "200")).toBe(true);
    expect(offers.every((o) => o.unit === "g")).toBe(true);
  });

  it("finds products using multi-token queries across name and brand", async () => {
    const offers = await searchProductsInDb("  AMUL   MILK ", prisma);
    expect(offers.length).toBeGreaterThan(0);
    expect(offers.every((o) => o.brand === "Amul")).toBe(true);
    expect(offers.every((o) => o.productName.includes("Milk"))).toBe(true);
  });

  it("safely maps Prisma Decimal values to native JavaScript numbers", async () => {
    const offers = await searchProductsInDb("milk", prisma);
    expect(offers.length).toBeGreaterThan(0);

    const firstOffer = offers[0]!;
    expect(typeof firstOffer.price).toBe("number");
    expect(typeof firstOffer.deliveryFee).toBe("number");
    expect(typeof firstOffer.platformFee).toBe("number");
    expect(typeof firstOffer.discount).toBe("number");
    expect(Number.isNaN(firstOffer.price)).toBe(false);
  });

  it("returns empty array for unknown or empty queries", async () => {
    const emptyOffers = await searchProductsInDb("", prisma);
    expect(emptyOffers).toEqual([]);

    const nonExistent = await searchProductsInDb(
      "xyznonexistentquery12345",
      prisma,
    );
    expect(nonExistent).toEqual([]);
  });

  it("does not match irrelevant substrings for single-token searches", async () => {
    const offers = await searchProductsInDb("alt", prisma);
    expect(offers).toEqual([]);
  });

  it("serves database-backed comparison results through /api/compare", async () => {
    const app = await createServer();

    const response = await app.inject({
      method: "GET",
      url: "/api/compare?q=Tata%20Salt",
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.body);

    expect(json.query).toBe("Tata Salt");
    expect(json.result).toBeDefined();
    expect(json.result.offers.length).toBeGreaterThanOrEqual(2);
    expect(json.result.cheapest).not.toBeNull();
    expect(json.result.fastest).not.toBeNull();
    expect(json.result.bestValue).not.toBeNull();
  });

  it("returns 400 when query parameter is missing in /api/compare", async () => {
    const app = await createServer();

    const response = await app.inject({
      method: "GET",
      url: "/api/compare",
    });

    expect(response.statusCode).toBe(400);
    const json = JSON.parse(response.body);
    expect(json.error).toContain("Query parameter 'q' is required");
  });

  it("reports database connectivity status through /health/db", async () => {
    const app = await createServer();

    const response = await app.inject({
      method: "GET",
      url: "/health/db",
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.body);
    expect(json).toEqual({
      status: "ok",
      database: "connected",
    });
  });

  it("serves category, brand, and product discovery endpoints", async () => {
    const app = await createServer();

    const categoriesResponse = await app.inject({
      method: "GET",
      url: "/api/categories",
    });
    expect(categoriesResponse.statusCode).toBe(200);
    const categories = JSON.parse(categoriesResponse.body);
    expect(categories).toContainEqual(
      expect.objectContaining({ name: "Personal Care", slug: "personal-care" }),
    );

    const productsResponse = await app.inject({
      method: "GET",
      url: "/api/categories/personal-care/products",
    });
    expect(productsResponse.statusCode).toBe(200);
    const products = JSON.parse(productsResponse.body);
    expect(products.length).toBeGreaterThan(0);
    expect(products[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: expect.any(String),
        providerCount: expect.any(Number),
      }),
    );

    const brandsResponse = await app.inject({
      method: "GET",
      url: "/api/brands",
    });
    expect(brandsResponse.statusCode).toBe(200);
    expect(JSON.parse(brandsResponse.body)).toContainEqual(
      expect.objectContaining({ name: "Colgate", slug: "colgate" }),
    );
  });

  it("serves safe provider metadata through /api/providers", async () => {
    const app = await createServer();

    const response = await app.inject({
      method: "GET",
      url: "/api/providers",
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual([
      {
        name: "Blinkit",
        slug: "blinkit",
        enabled: true,
        supportsCatalog: true,
        integrationStatus: "mock",
      },
      {
        name: "Zepto",
        slug: "zepto",
        enabled: true,
        supportsCatalog: true,
        integrationStatus: "mock",
      },
    ]);
  });
});
