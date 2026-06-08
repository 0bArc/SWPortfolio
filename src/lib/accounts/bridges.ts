/** OAuth / external provider bridge — extend when adding new login methods. */
export type BridgeProvider = "github" | "google" | "discord";

export type BridgeTokens = {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string | null;
  scope?: string;
};

export type BridgeRecord = {
  id: number;
  accountId: number;
  provider: BridgeProvider;
  providerUserId: string;
  tokens: BridgeTokens;
  metadata: Record<string, string | number | boolean | null>;
  createdAt: string;
  updatedAt: string;
};

export type BridgeAdapter = {
  provider: BridgeProvider;
  /** Future: exchange OAuth code → profile + tokens */
  connect?: (code: string) => Promise<{ providerUserId: string; tokens: BridgeTokens; metadata: Record<string, string> }>;
};

const adapters = new Map<BridgeProvider, BridgeAdapter>();

export function registerBridge(adapter: BridgeAdapter): void {
  adapters.set(adapter.provider, adapter);
}

export function getBridgeAdapter(provider: BridgeProvider): BridgeAdapter | undefined {
  return adapters.get(provider);
}

export function listBridgeProviders(): BridgeProvider[] {
  return [...adapters.keys()];
}
