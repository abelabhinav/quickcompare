import { describe, expect, it } from "vitest";
import { matchesQuery } from "./matching.js";

describe("matchesQuery", () => {
  const milk = {
    productName: "Amul Taaza Toned Milk 1L",
    brand: "Amul",
    searchAliases: ["milk", "toned milk"],
  };

  it("matches product names case-insensitively", () => {
    expect(matchesQuery(milk, "MILK")).toBe(true);
  });

  it("normalizes whitespace and supports brand matching", () => {
    expect(matchesQuery(milk, "  amul   milk ")).toBe(true);
    expect(matchesQuery(milk, "Amul")).toBe(true);
  });

  it("matches controlled aliases without broad unrelated substring matches", () => {
    expect(
      matchesQuery(
        {
          productName: "Cadbury Dairy Milk Silk 60g",
          brand: "Cadbury",
          searchAliases: ["chocolate"],
        },
        "milk",
      ),
    ).toBe(false);
  });

  it("does not match an unknown query", () => {
    expect(matchesQuery(milk, "xyznonexistent123")).toBe(false);
  });
});
