import { z } from "zod";

import { buildProxyUrl, type ProxyConfig } from "@mmo-claw/proxy";

export const browserProviderSchema = z.enum([
  "camoufox",
  "playwright-stealth",
  "puppeteer-stealth",
  "playwright-vanilla",
]);

export type BrowserProviderName = z.infer<typeof browserProviderSchema>;

export interface BrowserLaunchContext {
  profileId: string;
  provider: BrowserProviderName;
  proxy: ProxyConfig | null;
  fingerprintId?: string;
}

export interface BrowserLaunchPlan {
  provider: BrowserProviderName;
  launchArgs: string[];
  proxyUrl: string | null;
  fingerprintId?: string;
}

const providerArgMap: Record<BrowserProviderName, string[]> = {
  camoufox: ["--engine=firefox", "--stealth=high"],
  "playwright-stealth": ["--engine=chromium", "--stealth=enabled"],
  "puppeteer-stealth": ["--engine=chromium", "--stealth=legacy"],
  "playwright-vanilla": ["--engine=chromium", "--stealth=off"],
};

export const createBrowserLaunchPlan = (context: BrowserLaunchContext): BrowserLaunchPlan => {
  return {
    provider: context.provider,
    launchArgs: [...providerArgMap[context.provider]],
    proxyUrl: context.proxy ? buildProxyUrl(context.proxy) : null,
    fingerprintId: context.fingerprintId,
  };
};

export const listSupportedProviders = (): BrowserProviderName[] => {
  return [...browserProviderSchema.options];
};
