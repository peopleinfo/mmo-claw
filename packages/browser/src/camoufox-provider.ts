import { browserSessionRequestSchema, resolveProxyUrl, type BrowserSessionRequest } from "./contracts";
import type { BrowserProvider } from "./providers";

export interface CamoufoxProviderOptions {
  command?: string;
  packageName?: string;
  extraArgs?: string[];
}

export const createCamoufoxProvider = (
  options: CamoufoxProviderOptions = {},
): BrowserProvider => {
  const command = options.command ?? "uvx";
  const packageName = options.packageName ?? "camoufox";
  const extraArgs = options.extraArgs ?? [];

  return {
    name: "camoufox",
    createLaunchPlan(request: BrowserSessionRequest) {
      const validRequest = browserSessionRequestSchema.parse(request);
      const proxyUrl = resolveProxyUrl(validRequest.proxy);
      const args = ["tool", "run", packageName, "launch", "--profile-id", validRequest.profileId];

      if (validRequest.headless) {
        args.push("--headless");
      } else {
        args.push("--headed");
      }

      if (proxyUrl) {
        args.push("--proxy-server", proxyUrl);
      }

      if (validRequest.fingerprintId) {
        args.push("--fingerprint-id", validRequest.fingerprintId);
      }

      if (validRequest.startUrl) {
        args.push("--start-url", validRequest.startUrl);
      }

      if (validRequest.userDataDir) {
        args.push("--user-data-dir", validRequest.userDataDir);
      }

      args.push(...extraArgs);

      return {
        provider: "camoufox",
        command,
        args,
        launchArgs: [...args],
        env: {},
        proxyUrl,
        fingerprintId: validRequest.fingerprintId,
        startUrl: validRequest.startUrl,
        userDataDir: validRequest.userDataDir,
      };
    },
  };
};
