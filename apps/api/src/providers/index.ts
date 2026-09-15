import { BlinkitProvider } from "./blinkit.js";
import { ZeptoProvider } from "./zepto.js";
import { getProviderIntegrationConfig } from "./integrationConfig.js";
import type {
  CommerceProvider,
  NormalizedOffer,
  ProviderHealth,
} from "./types.js";

export type ProviderPublicMetadata = {
  name: string;
  slug: string;
  enabled: boolean;
  supportsCatalog: boolean;
  integrationStatus: ProviderHealth["status"];
};

export class AllProvidersFailedError extends Error {
  constructor() {
    super("All provider searches failed");
    this.name = "AllProvidersFailedError";
  }
}

export class ProviderRegistry {
  private readonly registeredProviders: CommerceProvider[];

  constructor(providers: CommerceProvider[]) {
    this.registeredProviders = [...providers];
  }

  list(): CommerceProvider[] {
    return [...this.registeredProviders];
  }

  async getPublicMetadata(): Promise<ProviderPublicMetadata[]> {
    return Promise.all(
      this.registeredProviders.map(async (provider) => {
        const health = provider.getHealth
          ? await provider.getHealth()
          : this.getDefaultHealth(provider);

        return {
          name: provider.name,
          slug: provider.slug,
          enabled: health.enabled,
          supportsCatalog: health.supportsCatalog,
          integrationStatus: health.status,
        };
      }),
    );
  }

  async searchAll(query: string): Promise<NormalizedOffer[]> {
    const results = await Promise.all(
      this.registeredProviders.map(async (provider) => {
        try {
          const offers = await provider.search(query);
          return { ok: true as const, offers };
        } catch (error) {
          console.warn("Provider search failed", {
            providerSlug: provider.slug,
            errorName: error instanceof Error ? error.name : "UnknownError",
          });
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

  private getDefaultHealth(provider: CommerceProvider): ProviderHealth {
    const config = getProviderIntegrationConfig(provider.slug);
    return {
      enabled: true,
      status: config.enabled ? "missing_configuration" : "mock",
      supportsCatalog: provider.getCatalog !== undefined,
    };
  }
}

export const providerRegistry = new ProviderRegistry([
  new BlinkitProvider(),
  new ZeptoProvider(),
]);

export const providers = providerRegistry.list();

export async function searchAllProviders(
  query: string,
): Promise<NormalizedOffer[]> {
  return providerRegistry.searchAll(query);
}
