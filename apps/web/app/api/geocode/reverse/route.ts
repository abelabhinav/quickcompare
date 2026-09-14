import { NextResponse } from "next/server";
import { formatReverseGeocodeResult } from "../../../../lib/geocoding";

type NominatimAddress = {
  postcode?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  suburb?: string;
  neighbourhood?: string;
  quarter?: string;
  city_district?: string;
  state_district?: string;
};

type NominatimReverseResponse = {
  address?: NominatimAddress;
  error?: string;
};

const NOMINATIM_ENDPOINT =
  process.env.NOMINATIM_REVERSE_ENDPOINT ??
  "https://nominatim.openstreetmap.org/reverse";

function isCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function getApplicationUserAgent(): string {
  const contact = process.env.NOMINATIM_CONTACT_EMAIL;
  return contact
    ? `QuickCompare/0.1 (${contact})`
    : "QuickCompare/0.1 (https://quickcompare.local)";
}

export function mapNominatimReverseResponse(
  payload: NominatimReverseResponse,
) {
  const address = payload.address;

  if (!address || payload.error) {
    return null;
  }

  return formatReverseGeocodeResult({
    pincode: address.postcode,
    city:
      address.city ??
      address.town ??
      address.village ??
      address.municipality ??
      address.state_district,
    locality:
      address.neighbourhood ??
      address.suburb ??
      address.quarter ??
      address.city_district,
  });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const latitude = (body as { latitude?: unknown }).latitude;
  const longitude = (body as { longitude?: unknown }).longitude;

  if (!isCoordinate(latitude) || !isCoordinate(longitude)) {
    return NextResponse.json(
      { error: "Latitude and longitude are required" },
      { status: 400 },
    );
  }

  const url = new URL(NOMINATIM_ENDPOINT);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("zoom", "18");
  url.searchParams.set("layer", "address");
  url.searchParams.set("accept-language", "en");

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": getApplicationUserAgent(),
        Referer: process.env.NOMINATIM_REFERER ?? "https://quickcompare.local",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(null);
    }

    const payload = (await response.json()) as NominatimReverseResponse;
    return NextResponse.json(mapNominatimReverseResponse(payload));
  } catch {
    return NextResponse.json(null);
  }
}
