import { afterEach, describe, expect, it, vi } from "vitest";
import { getCategories, getProductsByCategory, searchProducts } from "./api";

const comparisonResponse = {
  query: "milk",
  result: {
    offers: [],
    cheapest: null,
    fastest: null,
    bestValue: null,
  },
};

describe("searchProducts", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("encodes the query and returns the comparison response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(comparisonResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(searchProducts("Tata Salt & more")).resolves.toEqual(
      comparisonResponse,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/api/compare?q=Tata%20Salt%20%26%20more",
      { headers: { Accept: "application/json" } },
    );
  });

  it("turns network failures into a useful user-facing error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    await expect(searchProducts("milk")).rejects.toThrow(
      "Unable to reach the comparison service",
    );
  });

  it("uses the API error when the comparison service rejects a request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Provider search failed" }), {
          status: 502,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(searchProducts("milk")).rejects.toThrow(
      "Provider search failed",
    );
  });

  it("loads discovery categories", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([{ name: "Personal Care", slug: "personal-care", productCount: 8 }]),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getCategories()).resolves.toEqual([
      { name: "Personal Care", slug: "personal-care", productCount: 8 },
    ]);
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:4000/api/categories", {
      headers: { Accept: "application/json" },
    });
  });

  it("loads products by category slug", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ id: "p1", name: "Colgate", providerCount: 2, available: true }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getProductsByCategory("personal-care")).resolves.toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/api/categories/personal-care/products",
      { headers: { Accept: "application/json" } },
    );
  });
});
