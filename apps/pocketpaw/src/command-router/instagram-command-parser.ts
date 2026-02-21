import type { CommandSource } from "./contracts";

export interface ParsedInstagramCommandPayload {
  profileId: string;
  mediaPath: string;
  caption: string;
}

export interface ParsedInstagramCommand {
  matched: boolean;
  payload: ParsedInstagramCommandPayload | null;
}

export const instagramCommandUsageMessage =
  "Use /ig-post <profileId> <mediaPath> | <caption> or /ig-post profile=<id> media=<path> caption=<text>.";

const stripWrappingQuotes = (value: string): string => {
  if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
};

const parseKeyValuePayload = (payload: string): ParsedInstagramCommandPayload | null => {
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

const parsePositionalPayload = (payload: string): ParsedInstagramCommandPayload | null => {
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

const commandPrefixesBySource: Record<CommandSource, readonly string[]> = {
  telegram: ["/ig-post", "/instagram-post"],
  drawer: ["/ig-post", "/instagram-post", "ig-post", "instagram-post"],
};

const extractPayload = (
  text: string,
  prefixes: readonly string[],
): { matched: boolean; payload: string } => {
  const trimmed = text.trim();
  const matchingPrefix = prefixes.find((prefix) => trimmed.startsWith(prefix));
  if (!matchingPrefix) {
    return {
      matched: false,
      payload: "",
    };
  }

  return {
    matched: true,
    payload: trimmed.slice(matchingPrefix.length).trim(),
  };
};

export const parseInstagramCommandForSource = (
  source: CommandSource,
  text: string,
): ParsedInstagramCommand => {
  const { matched, payload } = extractPayload(text, commandPrefixesBySource[source]);
  if (!matched) {
    return {
      matched: false,
      payload: null,
    };
  }

  if (!payload) {
    return {
      matched: true,
      payload: null,
    };
  }

  return {
    matched: true,
    payload: parseKeyValuePayload(payload) ?? parsePositionalPayload(payload),
  };
};

export const parseTelegramInstagramCommand = (
  text: string,
): ParsedInstagramCommandPayload | null => {
  return parseInstagramCommandForSource("telegram", text).payload;
};
