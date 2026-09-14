import type { LocationContext } from "./location";

export type ServiceabilityStatus = "supported" | "unsupported" | "unknown";

export type LocationSuggestion = {
  id: string;
  city: string;
  locality?: string;
  pincode?: string;
  displayLabel: string;
  type: "city" | "area" | "pincode";
};

export type ProviderServiceability = {
  providerSlug: string;
  status: ServiceabilityStatus;
  reason: string;
};

type SupportedCity = {
  city: string;
  popular?: boolean;
  areas: Array<{
    locality: string;
    pincode?: string;
  }>;
};

type ProviderServiceAreaReference = {
  providerSlug: string;
  cities: Array<{
    city: string;
    areas: Array<{
      locality: string;
      pincode?: string;
      status: Exclude<ServiceabilityStatus, "unknown">;
    }>;
  }>;
};

const SUPPORTED_CITY_REFERENCE: SupportedCity[] = [
  {
    city: "Bengaluru",
    popular: true,
    areas: [
      { locality: "Indiranagar", pincode: "560038" },
      { locality: "Koramangala", pincode: "560034" },
      { locality: "Malleshwaram", pincode: "560003" },
    ],
  },
  {
    city: "Mumbai",
    popular: true,
    areas: [
      { locality: "Bandra West", pincode: "400050" },
      { locality: "Andheri West", pincode: "400053" },
    ],
  },
  {
    city: "Delhi",
    popular: true,
    areas: [
      { locality: "Connaught Place", pincode: "110001" },
      { locality: "Saket", pincode: "110017" },
    ],
  },
  {
    city: "Hyderabad",
    popular: true,
    areas: [
      { locality: "HITEC City", pincode: "500081" },
      { locality: "Banjara Hills", pincode: "500034" },
    ],
  },
  {
    city: "Chennai",
    popular: true,
    areas: [
      { locality: "T Nagar", pincode: "600017" },
      { locality: "Adyar", pincode: "600020" },
    ],
  },
];

const PROVIDER_SERVICE_AREA_REFERENCE: ProviderServiceAreaReference[] = [
  {
    providerSlug: "blinkit",
    cities: [
      { city: "Bengaluru", areas: [] },
      { city: "Mumbai", areas: [] },
      { city: "Delhi", areas: [] },
    ],
  },
  {
    providerSlug: "zepto",
    cities: [
      { city: "Bengaluru", areas: [] },
      { city: "Mumbai", areas: [] },
      { city: "Delhi", areas: [] },
      { city: "Hyderabad", areas: [] },
      { city: "Chennai", areas: [] },
    ],
  },
];

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function getPopularLocationSuggestions(): LocationSuggestion[] {
  return SUPPORTED_CITY_REFERENCE.filter((entry) => entry.popular).map(
    (entry) => ({
      id: `city:${entry.city}`,
      city: entry.city,
      displayLabel: entry.city,
      type: "city",
    }),
  );
}

export function searchLocationSuggestions(query: string): LocationSuggestion[] {
  const normalizedQuery = normalize(query);
  const suggestions: LocationSuggestion[] = [];

  for (const entry of SUPPORTED_CITY_REFERENCE) {
    if (!normalizedQuery || normalize(entry.city).includes(normalizedQuery)) {
      suggestions.push({
        id: `city:${entry.city}`,
        city: entry.city,
        displayLabel: entry.city,
        type: "city",
      });
    }

    for (const area of entry.areas) {
      const displayLabel = [area.locality, entry.city, area.pincode]
        .filter(Boolean)
        .join(" · ");

      if (
        !normalizedQuery ||
        normalize(area.locality).includes(normalizedQuery) ||
        normalize(entry.city).includes(normalizedQuery) ||
        area.pincode?.includes(normalizedQuery)
      ) {
        suggestions.push({
          id: `area:${entry.city}:${area.locality}:${area.pincode ?? ""}`,
          city: entry.city,
          locality: area.locality,
          pincode: area.pincode,
          displayLabel,
          type: area.pincode ? "pincode" : "area",
        });
      }
    }
  }

  return suggestions.slice(0, 8);
}

export function isSupportedReferenceCity(city: string): boolean {
  return SUPPORTED_CITY_REFERENCE.some(
    (entry) => normalize(entry.city) === normalize(city),
  );
}

export function getProviderServiceability(
  providerSlug: string,
  location: LocationContext | null,
): ProviderServiceability {
  if (!location) {
    return {
      providerSlug,
      status: "unknown",
      reason: "Location has not been set.",
    };
  }

  if (!location.city) {
    return {
      providerSlug,
      status: "unknown",
      reason: "City is unknown for this location.",
    };
  }

  const providerReference = PROVIDER_SERVICE_AREA_REFERENCE.find(
    (provider) => provider.providerSlug === providerSlug,
  );
  if (!providerReference) {
    return {
      providerSlug,
      status: "unknown",
      reason: "Provider service-area data is not configured.",
    };
  }

  const cityReference = providerReference.cities.find(
    (entry) => normalize(entry.city) === normalize(location.city!),
  );

  if (!cityReference) {
    return {
      providerSlug,
      status: "unsupported",
      reason: "Provider is not listed for this city in reference data.",
    };
  }

  const areaReference = cityReference.areas.find((area) => {
    const pincodeMatches =
      location.pincode && area.pincode === location.pincode;
    const localityMatches =
      location.locality &&
      normalize(area.locality) === normalize(location.locality);

    return Boolean(pincodeMatches || localityMatches);
  });

  if (areaReference) {
    return {
      providerSlug,
      status: areaReference.status,
      reason: "Provider has explicit area-level reference data.",
    };
  }

  if (!location.pincode && !location.locality) {
    return {
      providerSlug,
      status: "unknown",
      reason: "City is listed, but area-level serviceability is unknown.",
    };
  }

  return {
    providerSlug,
    status: "unknown",
    reason: "Area-level serviceability is not verified yet.",
  };
}
