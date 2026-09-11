export interface ProviderMetadata {
  toneClass: string;
  avatarClass: string;
  badgeTone: string;
}

const DEFAULT_PROVIDER_METADATA: ProviderMetadata = {
  toneClass: "border-white/10 bg-white/[0.025] shadow-black/20",
  avatarClass: "border-white/10 bg-white/10 text-white",
  badgeTone: "border-white/15 bg-white/5 text-white/80",
};

const PROVIDER_METADATA: Record<string, ProviderMetadata> = {
  blinkit: {
    toneClass:
      "border-amber-400/25 bg-gradient-to-b from-amber-400/[0.045] to-amber-950/[0.015] shadow-amber-950/15 hover:border-amber-400/40",
    avatarClass: "border-amber-400/35 bg-amber-400/15 text-amber-300 font-bold",
    badgeTone: "border-amber-400/25 bg-amber-400/10 text-amber-300",
  },
  zepto: {
    toneClass:
      "border-violet-400/25 bg-gradient-to-b from-violet-500/[0.045] to-violet-950/[0.015] shadow-violet-950/15 hover:border-violet-400/40",
    avatarClass: "border-violet-400/35 bg-violet-500/15 text-violet-300 font-bold",
    badgeTone: "border-violet-400/25 bg-violet-500/10 text-violet-300",
  },
};

export function getProviderMetadata(providerSlug: string): ProviderMetadata {
  return PROVIDER_METADATA[providerSlug] ?? DEFAULT_PROVIDER_METADATA;
}

