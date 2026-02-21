import {
  INSTAGRAM_POSTER_SKILL_ID,
  executeInstagramPosterSkill,
  type InstagramPosterSkillPayload,
  type InstagramPosterSkillResult,
} from "./instagram-poster-skill";

export type SkillId = typeof INSTAGRAM_POSTER_SKILL_ID;

export interface SkillExecutionRequest {
  skillId: SkillId;
  payload: InstagramPosterSkillPayload;
}

export type SkillExecutionResult = InstagramPosterSkillResult;

export const listAvailableSkillIds = (): SkillId[] => {
  return [INSTAGRAM_POSTER_SKILL_ID];
};

export const executeSkill = async (
  request: SkillExecutionRequest,
): Promise<SkillExecutionResult> => {
  switch (request.skillId) {
    case INSTAGRAM_POSTER_SKILL_ID:
      return executeInstagramPosterSkill(request.payload);
    default:
      return assertNever(request.skillId);
  }
};

const assertNever = (value: never): never => {
  throw new Error(`Unsupported skill id: ${String(value)}`);
};
