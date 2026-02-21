import {
  browserProviderSchema,
  browserSessionRequestSchema,
  type BrowserLaunchContext,
  type BrowserLaunchPlan,
  type BrowserProviderName,
} from "./contracts";
import { createCamoufoxProvider, type CamoufoxProviderOptions } from "./camoufox-provider";
import {
  createBrowserProviderRegistry,
  createStaticProvider,
  type BrowserProvider,
  type BrowserProviderRegistry,
} from "./providers";

const defaultProviders: BrowserProvider[] = [
  createCamoufoxProvider(),
  createStaticProvider("playwright-stealth", {
    command: "node",
    baseArgs: ["playwright-stealth-provider.js"],
  }),
  createStaticProvider("puppeteer-stealth", {
    command: "node",
    baseArgs: ["puppeteer-stealth-provider.js"],
  }),
  createStaticProvider("playwright-vanilla", {
    command: "node",
    baseArgs: ["playwright-vanilla-provider.js"],
  }),
];

const defaultRegistry = createBrowserProviderRegistry(defaultProviders);

export const createBrowserLaunchPlan = (
  context: BrowserLaunchContext,
  registry: BrowserProviderRegistry = defaultRegistry,
): BrowserLaunchPlan => {
  const validContext = browserSessionRequestSchema.parse(context);
  const provider = registry.get(validContext.provider);
  return provider.createLaunchPlan(validContext);
};

export const createCamoufoxLaunchPlan = (
  context: Omit<BrowserLaunchContext, "provider">,
  options: CamoufoxProviderOptions = {},
): BrowserLaunchPlan => {
  const provider = createCamoufoxProvider(options);
  return provider.createLaunchPlan({
    ...context,
    provider: "camoufox",
  });
};

export const listSupportedProviders = (): BrowserProviderName[] => {
  return [...browserProviderSchema.options];
};

export const createDefaultBrowserProviderRegistry = (): BrowserProviderRegistry => {
  return defaultRegistry;
};

export {
  browserProviderSchema,
  browserSessionRequestSchema,
  createCamoufoxProvider,
  createBrowserProviderRegistry,
  createStaticProvider,
};

export type {
  BrowserLaunchContext,
  BrowserLaunchPlan,
  BrowserProvider,
  BrowserProviderName,
  BrowserProviderRegistry,
  CamoufoxProviderOptions,
};
