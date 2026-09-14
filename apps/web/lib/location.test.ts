import { describe, expect, it, vi } from "vitest";
import {
  createLocationErrorState,
  createManualLocationState,
  getLocationIndicatorLabel,
  initialLocationState,
  parseManualLocation,
  requestBrowserLocation,
  shouldShowLocationOnboarding,
} from "./location";
import {
  getPopularLocationSuggestions,
  getProviderServiceability,
  isSupportedReferenceCity,
  searchLocationSuggestions,
} from "./serviceAreas";

function createGeolocationMock(
  implementation: Parameters<Geolocation["getCurrentPosition"]>[0] extends (
    position: infer Position,
  ) => void
    ? (
        success: (position: Position) => void,
        error: (error: Pick<GeolocationPositionError, "code">) => void,
      ) => void
    : never,
) {
  return {
    getCurrentPosition: vi.fn((success, error) => {
      implementation(success, error);
    }),
  };
}

describe("location foundation", () => {
  it("starts in an unknown state without coordinates", () => {
    expect(initialLocationState).toEqual({
      status: "unknown",
      context: null,
      message: "Choose your location",
    });
    expect(shouldShowLocationOnboarding(initialLocationState)).toBe(true);
    expect(getLocationIndicatorLabel(initialLocationState)).toBe("Set location");
  });

  it("creates a granted browser location from successful geolocation", async () => {
    const geolocation = createGeolocationMock((success) => {
      success({
        coords: {
          latitude: 12.9716,
          longitude: 77.5946,
        },
      } as GeolocationPosition);
    });

    const state = await requestBrowserLocation(geolocation);

    expect(state).toEqual({
      status: "granted",
      context: {
        source: "browser",
        latitude: 12.9716,
        longitude: 77.5946,
        displayLabel: "Location enabled",
        confidence: "unknown",
      },
      message: "Location enabled. Could not determine your area automatically.",
    });
    expect(getLocationIndicatorLabel(state)).toBe("Location enabled");
    expect(geolocation.getCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      {
        enableHighAccuracy: false,
        maximumAge: 300000,
        timeout: 10000,
      },
    );
  });

  it("handles permission denied as a denied state", async () => {
    const geolocation = createGeolocationMock((_success, error) => {
      error({ code: 1 });
    });

    await expect(requestBrowserLocation(geolocation)).resolves.toEqual({
      status: "denied",
      context: null,
      message: "Location permission was denied. Enter your area manually.",
    });
  });

  it("handles unavailable geolocation and timeout errors gracefully", async () => {
    const geolocation = createGeolocationMock((_success, error) => {
      error({ code: 2 });
    });

    await expect(requestBrowserLocation(geolocation)).resolves.toEqual({
      status: "unavailable",
      context: null,
      message: "Could not access your location. Enter your area manually.",
    });

    expect(createLocationErrorState({ code: 3 })).toEqual({
      status: "unavailable",
      context: null,
      message: "Could not access your location. Enter your area manually.",
    });
  });

  it("supports retrying after a denied request", async () => {
    const geolocation = {
      getCurrentPosition: vi
        .fn()
        .mockImplementationOnce((_success, error) => {
          error({ code: 1 });
        })
        .mockImplementationOnce((success) => {
          success({
            coords: {
              latitude: 19.076,
              longitude: 72.8777,
            },
          } as GeolocationPosition);
        }),
    };

    await expect(requestBrowserLocation(geolocation)).resolves.toMatchObject({
      status: "denied",
    });
    await expect(requestBrowserLocation(geolocation)).resolves.toMatchObject({
      status: "granted",
      context: {
        source: "browser",
        latitude: 19.076,
        longitude: 72.8777,
        displayLabel: "Location enabled",
        confidence: "unknown",
      },
    });
  });

  it("uses reverse geocoding results without fabricating a pincode", async () => {
    const geolocation = createGeolocationMock((success) => {
      success({
        coords: {
          latitude: 13.01,
          longitude: 77.55,
        },
      } as GeolocationPosition);
    });

    const state = await requestBrowserLocation(geolocation, {
      async reverseGeocode() {
        return {
          city: "Bengaluru",
          locality: "Malleshwaram",
          pincode: "560003",
          displayLabel: "Malleshwaram · Bengaluru · 560003",
          confidence: "resolved",
        };
      },
    });

    expect(state).toEqual({
      status: "granted",
      context: {
        source: "browser",
        latitude: 13.01,
        longitude: 77.55,
        city: "Bengaluru",
        locality: "Malleshwaram",
        pincode: "560003",
        displayLabel: "Malleshwaram · Bengaluru · 560003",
        confidence: "resolved",
      },
      message: "Location set to Malleshwaram · Bengaluru · 560003",
    });
    expect(getLocationIndicatorLabel(state)).toBe("560003 · Malleshwaram");
  });

  it("falls back honestly when reverse geocoding fails", async () => {
    const geolocation = createGeolocationMock((success) => {
      success({
        coords: {
          latitude: 13.01,
          longitude: 77.55,
        },
      } as GeolocationPosition);
    });

    const state = await requestBrowserLocation(geolocation, {
      async reverseGeocode() {
        throw new Error("geocoder unavailable");
      },
    });

    expect(state.status).toBe("granted");
    expect(state.context).toEqual({
      source: "browser",
      latitude: 13.01,
      longitude: 77.55,
      displayLabel: "Location enabled",
      confidence: "unknown",
    });
    expect(getLocationIndicatorLabel(state)).toBe("Location enabled");
  });

  it("creates manual fallback state from user-entered location only", () => {
    expect(parseManualLocation(" 560001 ", " Indiranagar ", " Bengaluru ")).toEqual({
      pincode: "560001",
      city: "Bengaluru",
      locality: "Indiranagar",
    });
    expect(parseManualLocation("5600XX", "")).toBeNull();
    expect(parseManualLocation("56001", "")).toBeNull();
    expect(parseManualLocation("", "   ")).toBeNull();

    const manualState = createManualLocationState({
      pincode: "560001",
      city: "Bengaluru",
      locality: "Bengaluru",
    });

    expect(manualState).toEqual({
      status: "granted",
      context: {
        source: "manual",
        pincode: "560001",
        city: "Bengaluru",
        locality: "Bengaluru",
        displayLabel: "Bengaluru · Bengaluru · 560001",
        confidence: "user-entered",
      },
      message: "Location set to Bengaluru · Bengaluru · 560001",
    });
    expect(shouldShowLocationOnboarding(manualState)).toBe(false);
    expect(getLocationIndicatorLabel(manualState)).toBe("560001 · Bengaluru");
  });

  it("formats compact labels by pincode-first priority", () => {
    expect(
      getLocationIndicatorLabel(
        createManualLocationState({
          pincode: "560013",
          locality: "Jalahalli",
          city: "Bengaluru",
        }),
      ),
    ).toBe("560013 · Jalahalli");

    expect(
      getLocationIndicatorLabel(
        createManualLocationState({ pincode: "560013", city: "Bengaluru" }),
      ),
    ).toBe("560013 · Bengaluru");

    expect(
      getLocationIndicatorLabel(createManualLocationState({ pincode: "560013" })),
    ).toBe("560013");

    expect(
      getLocationIndicatorLabel(
        createManualLocationState({
          locality: "Jalahalli",
          city: "Bengaluru",
        }),
      ),
    ).toBe("Jalahalli · Bengaluru");

    expect(
      getLocationIndicatorLabel(createManualLocationState({ city: "Bengaluru" })),
    ).toBe("Bengaluru");
  });

  it("does not put raw coordinates in user-facing status or indicator text", async () => {
    const geolocation = createGeolocationMock((success) => {
      success({
        coords: {
          latitude: 28.6139,
          longitude: 77.209,
        },
      } as GeolocationPosition);
    });

    const state = await requestBrowserLocation(geolocation);

    expect(state.message).toBe(
      "Location enabled. Could not determine your area automatically.",
    );
    expect(state.message).not.toContain("28.6139");
    expect(state.message).not.toContain("77.209");
    expect(getLocationIndicatorLabel(state)).toBe("Location enabled");
    expect(getLocationIndicatorLabel(state)).not.toContain("28.6139");
    expect(getLocationIndicatorLabel(state)).not.toContain("77.209");
  });

  it("searches reference locations by city, area and pincode", () => {
    expect(getPopularLocationSuggestions().map((item) => item.city)).toContain(
      "Bengaluru",
    );

    expect(searchLocationSuggestions("indiranagar")).toContainEqual(
      expect.objectContaining({
        city: "Bengaluru",
        locality: "Indiranagar",
        pincode: "560038",
        type: "pincode",
      }),
    );
    expect(searchLocationSuggestions("560038")).toContainEqual(
      expect.objectContaining({ locality: "Indiranagar" }),
    );
    expect(searchLocationSuggestions("beng")).toContainEqual(
      expect.objectContaining({ city: "Bengaluru", type: "city" }),
    );
  });

  it("distinguishes supported reference cities from unsupported cities", () => {
    expect(isSupportedReferenceCity("Bengaluru")).toBe(true);
    expect(isSupportedReferenceCity("Pune")).toBe(false);
  });

  it("keeps provider serviceability conservative and area-aware", () => {
    expect(
      getProviderServiceability(
        "blinkit",
        createManualLocationState({ city: "Bengaluru" }).context,
      ),
    ).toEqual({
      providerSlug: "blinkit",
      status: "unknown",
      reason: "City is listed, but area-level serviceability is unknown.",
    });

    expect(
      getProviderServiceability(
        "blinkit",
        createManualLocationState({ city: "Chennai" }).context,
      ),
    ).toEqual({
      providerSlug: "blinkit",
      status: "unsupported",
      reason: "Provider is not listed for this city in reference data.",
    });

    expect(getProviderServiceability("unknown-provider", null)).toEqual({
      providerSlug: "unknown-provider",
      status: "unknown",
      reason: "Location has not been set.",
    });
  });
});
