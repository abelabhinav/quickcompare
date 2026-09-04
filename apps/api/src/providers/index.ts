import { BlinkitProvider } from "./blinkit.js";
import { ZeptoProvider } from "./zepto.js";
import type { CommerceProvider, NormalizedOffer } from "./types.js";

export class AllProvidersFailedError extends Error {
  constructor() {
    super("All provider searches failed");
    this.name = "AllProvidersFailedError";
  }
}

export const providers: CommerceProvider[] = [
  new BlinkitProvider(),
  new ZeptoProvider(),
];

export async function searchAllProviders(
  query: string,
): Promise<NormalizedOffer[]> {
  const results = await Promise.all(
    providers.map(async (provider) => {
      try {
        const offers = await provider.search(query);
        return { ok: true as const, offers };
      } catch {
        return { ok: false as const, offers: [] as NormalizedOffer[] };
      }
    }),
  );

  const anyProviderSucceeded = results.some((result) => result.ok);
  if (!anyProviderSucceeded) {
    throw new AllProvidersFailedError();
  }

  return results
    .filter((result) => result.ok)
    .flatMap((result) => [...result.offers]);
}
