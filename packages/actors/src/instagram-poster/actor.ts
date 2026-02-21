import type { BrowserLaunchContext, BrowserLaunchPlan } from "@mmo-claw/browser";
import { createBrowserLaunchPlan } from "@mmo-claw/browser";

import {
  instagramPosterInputSchema,
  type InstagramPosterInput,
  type ParsedInstagramPosterInput,
} from "./input-schema";

export interface ActorRunResult {
  ok: boolean;
  summary: string;
  runId: string;
  postId: string;
  launchPlan: BrowserLaunchPlan;
  steps: string[];
}

export interface InstagramPosterActorDependencies {
  buildLaunchPlan?: (context: BrowserLaunchContext) => BrowserLaunchPlan;
  performPost?: (
    input: ParsedInstagramPosterInput,
    launchPlan: BrowserLaunchPlan,
  ) => Promise<{ postId: string }>;
}

const createStableId = (seed: string): string => {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 2147483647;
  }
  return hash.toString(16);
};

const defaultPerformPost = async (
  input: ParsedInstagramPosterInput,
): Promise<{ postId: string }> => {
  const seed = `${input.profileId}|${input.mediaPath}|${input.caption}`;
  return {
    postId: `ig-${createStableId(seed)}`,
  };
};

export const runInstagramPosterActor = async (
  input: InstagramPosterInput,
  dependencies: InstagramPosterActorDependencies = {},
): Promise<ActorRunResult> => {
  const validInput = instagramPosterInputSchema.parse(input);
  const buildLaunchPlan = dependencies.buildLaunchPlan ?? createBrowserLaunchPlan;
  const performPost = dependencies.performPost ?? defaultPerformPost;

  const launchPlan = buildLaunchPlan({
    profileId: validInput.profileId,
    provider: validInput.provider,
    proxy: null,
    headless: validInput.headless,
    startUrl: validInput.startUrl,
    fingerprintId: validInput.fingerprintId,
  });

  const postResult = await performPost(validInput, launchPlan);
  const runId = `run-${createStableId(`${validInput.profileId}|${postResult.postId}`)}`;
  const steps = [
    "validate-input",
    `plan-browser-session:${launchPlan.provider}`,
    `open-target:${validInput.startUrl}`,
    `upload-media:${validInput.mediaPath}`,
    "submit-post",
  ];

  return {
    ok: true,
    summary: `Prepared ${launchPlan.provider} session and generated ${postResult.postId}.`,
    runId,
    postId: postResult.postId,
    launchPlan,
    steps,
  };
};
