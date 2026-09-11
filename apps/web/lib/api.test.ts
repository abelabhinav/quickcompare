import { afterEach, describe, expect, it, vi } from "vitest";
import { searchProducts } from "./api";

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
});
