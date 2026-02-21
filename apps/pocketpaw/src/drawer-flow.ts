import { z } from "zod";

import { executeUnifiedCommand, type UnifiedCommandRouterDependencies } from "./command-router/router";
import type { CommandErrorCode } from "./command-router/contracts";
import type { SkillExecutionResult } from "./skills/registry";

const drawerCommandSchema = z.object({
  sessionId: z.string().min(1),
  text: z.string().min(1),
  senderId: z.string().min(1).optional(),
  correlationId: z.string().min(1).optional(),
});

export type DrawerCommand = z.input<typeof drawerCommandSchema>;

export interface DrawerFlowResult {
  ok: boolean;
  sessionId: string;
  correlationId: string;
  replyText: string;
  skillResult?: SkillExecutionResult;
  errorCode?: CommandErrorCode;
}

export interface DrawerFlowDependencies {
  executeSkillRequest?: UnifiedCommandRouterDependencies["executeSkillRequest"];
  correlationIdFactory?: UnifiedCommandRouterDependencies["correlationIdFactory"];
}

export const executeDrawerFlow = async (
  command: DrawerCommand,
  dependencies: DrawerFlowDependencies = {},
): Promise<DrawerFlowResult> => {
  const validCommand = drawerCommandSchema.parse(command);
  const commandResult = await executeUnifiedCommand(
    {
      source: "drawer",
      transportId: validCommand.sessionId,
      text: validCommand.text,
      initiatedBy: validCommand.senderId,
      correlationId: validCommand.correlationId,
    },
    dependencies,
  );

  if (!commandResult.ok) {
    return {
      ok: false,
      sessionId: validCommand.sessionId,
      correlationId: commandResult.correlationId,
      replyText: commandResult.replyText,
      errorCode: commandResult.error.code,
    };
  }

  return {
    ok: true,
    sessionId: validCommand.sessionId,
    correlationId: commandResult.correlationId,
    replyText: commandResult.replyText,
    skillResult: commandResult.skillResult,
  };
};
