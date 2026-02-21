import { z } from "zod";

import { executeUnifiedCommand, type UnifiedCommandRouterDependencies } from "./command-router/router";
import { parseTelegramInstagramCommand } from "./command-router/instagram-command-parser";
import type { SkillExecutionResult } from "./skills/registry";

const telegramCommandSchema = z.object({
  chatId: z.string().min(1),
  text: z.string().min(1),
  senderId: z.string().min(1).optional(),
});

export type TelegramCommand = z.input<typeof telegramCommandSchema>;

export interface TelegramFlowResult {
  ok: boolean;
  chatId: string;
  replyText: string;
  skillResult?: SkillExecutionResult;
}

export interface TelegramFlowDependencies {
  executeSkillRequest?: UnifiedCommandRouterDependencies["executeSkillRequest"];
  correlationIdFactory?: UnifiedCommandRouterDependencies["correlationIdFactory"];
}

export const executeTelegramFlow = async (
  command: TelegramCommand,
  dependencies: TelegramFlowDependencies = {},
): Promise<TelegramFlowResult> => {
  const validCommand = telegramCommandSchema.parse(command);
  const commandResult = await executeUnifiedCommand(
    {
      source: "telegram",
      transportId: validCommand.chatId,
      text: validCommand.text,
      initiatedBy: validCommand.senderId,
    },
    {
      executeSkillRequest: dependencies.executeSkillRequest,
      correlationIdFactory: dependencies.correlationIdFactory,
    },
  );

  if (!commandResult.ok) {
    return {
      ok: false,
      chatId: validCommand.chatId,
      replyText: commandResult.replyText,
    };
  }

  return {
    ok: true,
    chatId: validCommand.chatId,
    replyText: commandResult.replyText,
    skillResult: commandResult.skillResult,
  };
};

export { parseTelegramInstagramCommand };
