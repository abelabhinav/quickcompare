export type ReverseGeocodeInput = {
  latitude: number;
  longitude: number;
};

export type ReverseGeocodeResult = {
  pincode?: string;
  city?: string;
  locality?: string;
  displayLabel: string;
  confidence: "resolved" | "partial" | "unknown";
};

export type GeocodingProvider = {
  reverseGeocode(
    input: ReverseGeocodeInput,
  ): Promise<ReverseGeocodeResult | null>;
};

export const unavailableGeocodingProvider: GeocodingProvider = {
  async reverseGeocode() {
    return null;
  },
};

export function formatReverseGeocodeResult(
  input: Omit<ReverseGeocodeResult, "displayLabel" | "confidence"> & {
    confidence?: ReverseGeocodeResult["confidence"];
  },
): ReverseGeocodeResult | null {
  const pincode = input.pincode?.trim();
  const city = input.city?.trim();
  const locality = input.locality?.trim();

  if (!pincode && !city && !locality) {
    return null;
  }

  const displayLabel = pincode
    ? [pincode, locality || city].filter(Boolean).join(" · ")
    : [locality, city].filter(Boolean).join(" · ");

  return {
    ...(pincode ? { pincode } : {}),
    ...(city ? { city } : {}),
    ...(locality ? { locality } : {}),
    displayLabel,
    confidence: input.confidence ?? (pincode ? "resolved" : "partial"),
  };
}

export const browserGeocodingProvider: GeocodingProvider = {
  async reverseGeocode(input) {
    const response = await fetch("/api/geocode/reverse", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      return null;
    }

    const result = (await response.json()) as ReverseGeocodeResult | null;
    return result?.displayLabel ? result : null;
  },
};
