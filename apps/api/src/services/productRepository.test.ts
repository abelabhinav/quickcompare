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
});
