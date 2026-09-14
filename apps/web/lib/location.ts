import {
  unavailableGeocodingProvider,
  type GeocodingProvider,
  type ReverseGeocodeResult,
} from "./geocoding";

export type BrowserLocationContext = {
  source: "browser";
  latitude: number;
  longitude: number;
  pincode?: string;
  city?: string;
  locality?: string;
  displayLabel: string;
  confidence: "resolved" | "partial" | "unknown";
};

export type ManualLocationContext = {
  source: "manual";
  pincode?: string;
  city?: string;
  locality?: string;
  displayLabel: string;
  confidence: "user-entered";
};

export type LocationContext =
  | BrowserLocationContext
  | ManualLocationContext;

export type LocationStatus =
  | "unknown"
  | "requesting"
  | "granted"
  | "denied"
  | "unavailable";

export type LocationState = {
  status: LocationStatus;
  context: LocationContext | null;
  message: string;
};

export type ManualLocationInput = {
  pincode?: string;
  city?: string;
  locality?: string;
};

export type GeolocationLike = Pick<Geolocation, "getCurrentPosition">;
export type BrowserLocationProgress = "locating" | "geocoding";

export const initialLocationState: LocationState = {
  status: "unknown",
  context: null,
  message: "Choose your location",
};

export const requestingLocationState: LocationState = {
  status: "requesting",
  context: null,
  message: "Getting your location...",
};

function formatLocationLabel(input: ManualLocationInput): string {
  return [input.locality, input.city, input.pincode].filter(Boolean).join(" · ");
}

export function createGrantedLocationState(
  latitude: number,
  longitude: number,
  geocode?: ReverseGeocodeResult | null,
): LocationState {
  const displayLabel = geocode?.displayLabel || "Location enabled";

  return {
    status: "granted",
    context: {
      source: "browser",
      latitude,
      longitude,
      ...(geocode?.pincode ? { pincode: geocode.pincode } : {}),
      ...(geocode?.city ? { city: geocode.city } : {}),
      ...(geocode?.locality ? { locality: geocode.locality } : {}),
      displayLabel,
      confidence: geocode?.confidence ?? "unknown",
    },
    message: geocode
      ? `Location set to ${displayLabel}`
      : "Location enabled. Could not determine your area automatically.",
  };
}

export function createManualLocationState(
  input: ManualLocationInput,
): LocationState {
  const displayValue = formatLocationLabel(input);

  return {
    status: "granted",
    context: {
      source: "manual",
      ...(input.pincode ? { pincode: input.pincode } : {}),
      ...(input.city ? { city: input.city } : {}),
      ...(input.locality ? { locality: input.locality } : {}),
      displayLabel: displayValue || "Location set manually",
      confidence: "user-entered",
    },
    message: displayValue
      ? `Location set to ${displayValue}`
      : "Location set manually",
  };
}

export function createLocationErrorState(
  error?: Pick<GeolocationPositionError, "code">,
): LocationState {
  if (error?.code === 1) {
    return {
      status: "denied",
      context: null,
      message: "Location permission was denied. Enter your area manually.",
    };
  }

  return {
    status: "unavailable",
    context: null,
    message: "Could not access your location. Enter your area manually.",
  };
}

export function parseManualLocation(
  pincode: string,
  locality: string,
  city = "",
): ManualLocationInput | null {
  const trimmedPincode = pincode.trim();
  const trimmedLocality = locality.trim();
  const trimmedCity = city.trim();

  if (!trimmedPincode && !trimmedLocality && !trimmedCity) {
    return null;
  }

  if (trimmedPincode && !/^\d{6}$/.test(trimmedPincode)) {
    return null;
  }

  return {
    ...(trimmedPincode ? { pincode: trimmedPincode } : {}),
    ...(trimmedCity ? { city: trimmedCity } : {}),
    ...(trimmedLocality ? { locality: trimmedLocality } : {}),
  };
}

export function getLocationIndicatorLabel(state: LocationState): string {
  if (state.context) {
    const { city, displayLabel, locality, pincode } = state.context;

    if (pincode && locality) {
      return `${pincode} · ${locality}`;
    }

    if (pincode && city) {
      return `${pincode} · ${city}`;
    }

    if (pincode) {
      return pincode;
    }

    if (locality && city) {
      return `${locality} · ${city}`;
    }

    return city ?? displayLabel;
  }

  return "Set location";
}

export function shouldShowLocationOnboarding(state: LocationState): boolean {
  return state.status === "unknown" && state.context === null;
}

export async function requestBrowserLocation(
  geolocation: GeolocationLike | undefined,
  geocodingProvider: GeocodingProvider = unavailableGeocodingProvider,
  onProgress?: (progress: BrowserLocationProgress) => void,
): Promise<LocationState> {
  if (!geolocation) {
    return createLocationErrorState();
  }

  onProgress?.("locating");

  return new Promise((resolve) => {
    geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        try {
          onProgress?.("geocoding");
          const geocode = await geocodingProvider.reverseGeocode({
            latitude,
            longitude,
          });
          resolve(createGrantedLocationState(latitude, longitude, geocode));
        } catch {
          resolve(createGrantedLocationState(latitude, longitude));
        }
      },
      (error) => {
        resolve(createLocationErrorState(error));
      },
      {
        enableHighAccuracy: false,
        maximumAge: 5 * 60 * 1000,
        timeout: 10000,
      },
    );
  });
}
