import { describe, expect, it } from "vitest";
import { mapNominatimReverseResponse } from "./route";

describe("Nominatim reverse geocoding mapping", () => {
  it("maps pincode, locality and city", () => {
    expect(
      mapNominatimReverseResponse({
        address: {
          postcode: "560013",
          suburb: "Jalahalli",
          city: "Bengaluru",
        },
      }),
    ).toEqual({
      pincode: "560013",
      city: "Bengaluru",
      locality: "Jalahalli",
      displayLabel: "560013 · Jalahalli",
      confidence: "resolved",
    });
  });

  it("maps pincode and city", () => {
    expect(
      mapNominatimReverseResponse({
        address: {
          postcode: "560013",
          city: "Bengaluru",
        },
      }),
    ).toMatchObject({
      pincode: "560013",
      city: "Bengaluru",
      displayLabel: "560013 · Bengaluru",
    });
  });

  it("maps only pincode", () => {
    expect(
      mapNominatimReverseResponse({
        address: {
          postcode: "560013",
        },
      }),
    ).toMatchObject({
      pincode: "560013",
      displayLabel: "560013",
    });
  });

  it("maps locality and city without pincode", () => {
    expect(
      mapNominatimReverseResponse({
        address: {
          suburb: "Jalahalli",
          city: "Bengaluru",
        },
      }),
    ).toEqual({
      city: "Bengaluru",
      locality: "Jalahalli",
      displayLabel: "Jalahalli · Bengaluru",
      confidence: "partial",
    });
  });

  it("falls back when no useful address is returned", () => {
    expect(mapNominatimReverseResponse({ address: {} })).toBeNull();
    expect(mapNominatimReverseResponse({ error: "Unable to geocode" })).toBeNull();
  });
});
