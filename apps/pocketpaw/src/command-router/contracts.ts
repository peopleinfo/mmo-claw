import { z } from "zod";

import type { InstagramPosterSkillPayload } from "../skills/instagram-poster-skill";
import type { SkillExecutionResult, SkillId } from "../skills/registry";

export const commandSourceSchema = z.enum(["telegram", "drawer"]);
export type CommandSource = z.infer<typeof commandSourceSchema>;

export const unifiedCommandRequestSchema = z.object({
  source: commandSourceSchema,
  transportId: z.string().min(1),
  text: z.string().min(1),
  initiatedBy: z.string().min(1).optional(),
  correlationId: z.string().min(1).optional(),
});

export type UnifiedCommandRequest = z.input<typeof unifiedCommandRequestSchema>;

export const commandErrorCodeSchema = z.enum([
  "UNKNOWN_COMMAND",
  "INVALID_COMMAND_PAYLOAD",
  "SKILL_EXECUTION_FAILED",
]);

export type CommandErrorCode = z.infer<typeof commandErrorCodeSchema>;

export interface CommandExecutionError {
  code: CommandErrorCode;
  message: string;
  retryable: boolean;
}

export interface NormalizedSkillCommand {
  type: "run-skill";
  skillId: SkillId;
  payload: InstagramPosterSkillPayload;
}

interface UnifiedCommandBase {
  source: CommandSource;
  transportId: string;
  correlationId: string;
}

export interface UnifiedCommandSuccess extends UnifiedCommandBase {
  ok: true;
  command: NormalizedSkillCommand;
  replyText: string;
  skillResult: SkillExecutionResult;
}

export interface UnifiedCommandFailure extends UnifiedCommandBase {
  ok: false;
  error: CommandExecutionError;
  replyText: string;
}

export type UnifiedCommandResult = UnifiedCommandSuccess | UnifiedCommandFailure;
