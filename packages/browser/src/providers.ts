import {
  browserProviderSchema,
  resolveProxyUrl,
  type BrowserLaunchPlan,
  type BrowserSessionRequest,
} from "./contracts";

export interface BrowserProvider {
  name: BrowserSessionRequest["provider"];
  createLaunchPlan: (request: BrowserSessionRequest) => BrowserLaunchPlan;
}

export interface BrowserProviderRegistry {
  get: (providerName: BrowserSessionRequest["provider"]) => BrowserProvider;
  list: () => BrowserProvider[];
}

export interface StaticProviderOptions {
  command: string;
  baseArgs: string[];
}

export const createBrowserProviderRegistry = (
  providers: BrowserProvider[],
): BrowserProviderRegistry => {
  const providerMap = new Map<BrowserSessionRequest["provider"], BrowserProvider>();

  for (const provider of providers) {
    providerMap.set(provider.name, provider);
  }

  return {
    get(providerName) {
      const validProviderName = browserProviderSchema.parse(providerName);
      const provider = providerMap.get(validProviderName);
      if (!provider) {
        throw new Error(`No browser provider is registered for ${validProviderName}`);
      }
      return provider;
    },
    list() {
      return Array.from(providerMap.values());
    },
  };
};

export const createStaticProvider = (
  providerName: BrowserSessionRequest["provider"],
  options: StaticProviderOptions,
): BrowserProvider => {
  return {
    name: providerName,
    createLaunchPlan(request) {
      return {
        provider: providerName,
        command: options.command,
        args: [...options.baseArgs],
        launchArgs: [...options.baseArgs],
        env: {},
        proxyUrl: resolveProxyUrl(request.proxy),
        fingerprintId: request.fingerprintId,
        startUrl: request.startUrl,
        userDataDir: request.userDataDir,
      };
    },
  };
};
