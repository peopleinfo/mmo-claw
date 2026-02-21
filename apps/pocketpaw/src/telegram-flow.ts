import { z } from "zod";

import { executeSkill, type SkillExecutionResult } from "./skills/registry";

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
  executeSkillRequest?: typeof executeSkill;
}

const usageMessage =
  "Use /ig-post <profileId> <mediaPath> | <caption> or /ig-post profile=<id> media=<path> caption=<text>.";

const stripWrappingQuotes = (value: string): string => {
  if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
};

const parseKeyValuePayload = (
  payload: string,
): { profileId: string; mediaPath: string; caption: string } | null => {
  const matches = Array.from(payload.matchAll(/(profile|media|caption)=("[^"]+"|'[^']+'|\S+)/g));
  if (matches.length === 0) {
    return null;
  }

  const values = new Map<string, string>();
  for (const match of matches) {
    values.set(match[1], stripWrappingQuotes(match[2]));
  }

  const profileId = values.get("profile");
  const mediaPath = values.get("media");
  const caption = values.get("caption");

  if (!profileId || !mediaPath || !caption) {
    return null;
  }

  return {
    profileId,
    mediaPath,
    caption,
  };
};

const parsePositionalPayload = (
  payload: string,
): { profileId: string; mediaPath: string; caption: string } | null => {
  const [preCaption, caption] = payload.split("|", 2);
  if (!preCaption || !caption) {
    return null;
  }

  const [profileId, mediaPath] = preCaption
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!profileId || !mediaPath) {
    return null;
  }

  return {
    profileId,
    mediaPath,
    caption: caption.trim(),
  };
};

export const parseTelegramInstagramCommand = (
  text: string,
): { profileId: string; mediaPath: string; caption: string } | null => {
  const trimmed = text.trim();
  const prefixes = ["/ig-post", "/instagram-post"];

  const matchingPrefix = prefixes.find((prefix) => trimmed.startsWith(prefix));
  if (!matchingPrefix) {
    return null;
  }

  const payload = trimmed.slice(matchingPrefix.length).trim();
  if (!payload) {
    return null;
  }

  return parseKeyValuePayload(payload) ?? parsePositionalPayload(payload);
};

export const executeTelegramFlow = async (
  command: TelegramCommand,
  dependencies: TelegramFlowDependencies = {},
): Promise<TelegramFlowResult> => {
  const validCommand = telegramCommandSchema.parse(command);
  const parsed = parseTelegramInstagramCommand(validCommand.text);

  if (!parsed) {
    return {
      ok: false,
      chatId: validCommand.chatId,
      replyText: usageMessage,
    };
  }

  const executeSkillRequest = dependencies.executeSkillRequest ?? executeSkill;
  const skillResult = await executeSkillRequest({
    skillId: "instagram-poster",
    payload: {
      ...parsed,
      initiatedBy: validCommand.senderId,
    },
  });

  return {
    ok: true,
    chatId: validCommand.chatId,
    replyText: `Posted via ${skillResult.skillId}: ${skillResult.actorRun.postId}`,
    skillResult,
  };
};
