import {
  runInstagramPosterActor,
  type ActorRunResult,
  type InstagramPosterInput,
} from "@mmo-claw/actors";

export const INSTAGRAM_POSTER_SKILL_ID = "instagram-poster";

export interface InstagramPosterSkillPayload extends InstagramPosterInput {
  initiatedBy?: string;
}

export interface InstagramPosterSkillResult {
  ok: boolean;
  skillId: typeof INSTAGRAM_POSTER_SKILL_ID;
  message: string;
  actorRun: ActorRunResult;
}

export interface InstagramPosterSkillDependencies {
  runActor?: (payload: InstagramPosterInput) => Promise<ActorRunResult>;
}

export const executeInstagramPosterSkill = async (
  payload: InstagramPosterSkillPayload,
  dependencies: InstagramPosterSkillDependencies = {},
): Promise<InstagramPosterSkillResult> => {
  const runActor = dependencies.runActor ?? runInstagramPosterActor;
  const actorRun = await runActor(payload);

  return {
    ok: actorRun.ok,
    skillId: INSTAGRAM_POSTER_SKILL_ID,
    message: `Skill ${INSTAGRAM_POSTER_SKILL_ID} produced ${actorRun.postId}.`,
    actorRun,
  };
};
