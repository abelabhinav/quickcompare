import { z } from "zod";
import type { NormalizedOffer } from "./types.js";
import { ProviderIntegrationError } from "./integrationErrors.js";

export const providerOfferSchema = z.object({
  productName: z.string().min(1),
  brand: z.string().min(1).optional(),
  price: z.number().nonnegative(),
  deliveryFee: z.number().nonnegative(),
  platformFee: z.number().nonnegative(),
  discount: z.number().nonnegative(),
  available: z.boolean(),
  deliveryMinutes: z.number().int().nonnegative().optional(),
  externalId: z.string().min(1).optional(),
  productUrl: z.string().url().optional(),
});

export const providerSearchResponseSchema = z.object({
  offers: z.array(providerOfferSchema),
});

export type ProviderSearchResponse = z.infer<typeof providerSearchResponseSchema>;

export function validateProviderSearchResponse(
  value: unknown,
  providerSlug: string,
): ProviderSearchResponse {
  const parsed = providerSearchResponseSchema.safeParse(value);
  if (!parsed.success) {
    throw new ProviderIntegrationError({
      code: "invalid_response",
      message: "Provider response failed validation",
      providerSlug,
      retryable: false,
    });
  }

  return parsed.data;
}

export function normalizeValidatedOffers(
  response: ProviderSearchResponse,
  provider: { name: string; slug: string },
): NormalizedOffer[] {
  return response.offers.map((offer) => ({
    providerName: provider.name,
    providerSlug: provider.slug,
    ...offer,
  }));
}
