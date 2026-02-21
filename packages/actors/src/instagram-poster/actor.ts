import { createBrowserLaunchPlan } from "@mmo-claw/browser";

import { instagramPosterInputSchema, type InstagramPosterInput } from "./input-schema";

export interface ActorRunResult {
  ok: boolean;
  summary: string;
}

export const runInstagramPosterActor = async (
  input: InstagramPosterInput,
): Promise<ActorRunResult> => {
  const validInput = instagramPosterInputSchema.parse(input);
  const launchPlan = createBrowserLaunchPlan({
    profileId: validInput.profileId,
    provider: "camoufox",
    proxy: null,
  });

  return {
    ok: true,
    summary: `Prepared ${launchPlan.provider} launch for ${validInput.mediaPath}`,
  };
};
