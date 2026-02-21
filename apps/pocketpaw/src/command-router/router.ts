import { randomUUID } from "node:crypto";

import { executeSkill } from "../skills/registry";
import {
  commandErrorCodeSchema,
  unifiedCommandRequestSchema,
  type CommandErrorCode,
  type UnifiedCommandFailure,
  type UnifiedCommandRequest,
  type UnifiedCommandResult,
} from "./contracts";
import {
  instagramCommandUsageMessage,
  parseInstagramCommandForSource,
} from "./instagram-command-parser";

export interface UnifiedCommandRouterDependencies {
  executeSkillRequest?: typeof executeSkill;
  correlationIdFactory?: () => string;
}

const buildCorrelationId = (
  request: UnifiedCommandRequest,
  dependencies: UnifiedCommandRouterDependencies,
): string => {
  if (request.correlationId) {
    return request.correlationId;
  }

  const createCorrelationId = dependencies.correlationIdFactory ?? randomUUID;
  return `${request.source}-${createCorrelationId()}`;
};

const buildFailureResult = (
  request: UnifiedCommandRequest,
  correlationId: string,
  code: CommandErrorCode,
  message: string,
  retryable: boolean,
  replyText: string,
): UnifiedCommandFailure => {
  return {
    ok: false,
    source: request.source,
    transportId: request.transportId,
    correlationId,
    error: {
      code: commandErrorCodeSchema.parse(code),
      message,
      retryable,
    },
    replyText,
  };
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return "Skill execution failed.";
};

export const executeUnifiedCommand = async (
  input: UnifiedCommandRequest,
  dependencies: UnifiedCommandRouterDependencies = {},
): Promise<UnifiedCommandResult> => {
  const request = unifiedCommandRequestSchema.parse(input);
  const correlationId = buildCorrelationId(request, dependencies);
  const parsedCommand = parseInstagramCommandForSource(request.source, request.text);

  if (!parsedCommand.matched) {
    return buildFailureResult(
      request,
      correlationId,
      "UNKNOWN_COMMAND",
      "Unsupported command. Only Instagram posting commands are currently enabled.",
      false,
      instagramCommandUsageMessage,
    );
  }

  if (!parsedCommand.payload) {
    return buildFailureResult(
      request,
      correlationId,
      "INVALID_COMMAND_PAYLOAD",
      "Command payload is incomplete or invalid.",
      false,
      instagramCommandUsageMessage,
    );
  }

  const normalizedCommand = {
    type: "run-skill" as const,
    skillId: "instagram-poster" as const,
    payload: {
      ...parsedCommand.payload,
      initiatedBy: request.initiatedBy,
    },
  };

  const executeSkillRequest = dependencies.executeSkillRequest ?? executeSkill;

  try {
    const skillResult = await executeSkillRequest({
      skillId: normalizedCommand.skillId,
      payload: normalizedCommand.payload,
    });

    return {
      ok: true,
      source: request.source,
      transportId: request.transportId,
      correlationId,
      command: normalizedCommand,
      replyText: `Posted via ${skillResult.skillId}: ${skillResult.actorRun.postId}`,
      skillResult,
    };
  } catch (error) {
    return buildFailureResult(
      request,
      correlationId,
      "SKILL_EXECUTION_FAILED",
      toErrorMessage(error),
      true,
      "Command failed. Retry once, then inspect run logs for details.",
    );
  }
};
