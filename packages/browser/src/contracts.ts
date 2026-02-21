import { z } from "zod";

import { buildProxyUrl, proxySchema, type ProxyConfig } from "@mmo-claw/proxy";

export const browserProviderSchema = z.enum([
  "camoufox",
  "playwright-stealth",
  "puppeteer-stealth",
  "playwright-vanilla",
]);

export type BrowserProviderName = z.infer<typeof browserProviderSchema>;

export const browserSessionRequestSchema = z.object({
  profileId: z.string().min(1),
  provider: browserProviderSchema,
  proxy: proxySchema.nullable().default(null),
  fingerprintId: z.string().min(1).optional(),
  headless: z.boolean().default(true),
  startUrl: z.string().url().optional(),
  userDataDir: z.string().min(1).optional(),
});

export type BrowserSessionRequest = z.infer<typeof browserSessionRequestSchema>;

export interface BrowserLaunchPlan {
  provider: BrowserProviderName;
  command: string;
  args: string[];
  launchArgs: string[];
  env: Record<string, string>;
  proxyUrl: string | null;
  fingerprintId?: string;
  startUrl?: string;
  userDataDir?: string;
}

export type BrowserLaunchContext = BrowserSessionRequest;

export const resolveProxyUrl = (proxy: ProxyConfig | null): string | null => {
  if (!proxy) {
    return null;
  }

  return buildProxyUrl(proxy);
};
