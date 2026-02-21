import { z } from "zod";

export const desktopChannels = {
  getHealthSnapshot: "desktop:get-health-snapshot",
  openPocketpaw: "desktop:open-pocketpaw",
  listRuntimeTools: "desktop:list-runtime-tools",
  installRuntimeTool: "desktop:install-runtime-tool",
  uninstallRuntimeTool: "desktop:uninstall-runtime-tool",
  listSecretSettings: "desktop:list-secret-settings",
  setSecretSetting: "desktop:set-secret-setting",
  clearSecretSetting: "desktop:clear-secret-setting",
  sendChatMessage: "desktop:send-chat-message",
  cancelChatStream: "desktop:cancel-chat-stream",
  chatStreamEvent: "desktop:chat-stream-event",
  runStatusEvent: "desktop:run-status-event",
} as const;

export type DesktopChannel =
  (typeof desktopChannels)[keyof typeof desktopChannels];

export const ipcErrorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "POCKETPAW_UNAVAILABLE",
  "DB_UNAVAILABLE",
  "RUNTIME_UNAVAILABLE",
  "SECRET_STORAGE_UNAVAILABLE",
  "CHAT_STREAM_NOT_FOUND",
  "CHAT_STREAM_CONFLICT",
  "INTERNAL_ERROR",
]);

export type IpcErrorCode = z.infer<typeof ipcErrorCodeSchema>;

export const ipcErrorSchema = z.object({
  code: ipcErrorCodeSchema,
  message: z.string().min(1),
});

export type IpcError = z.infer<typeof ipcErrorSchema>;

export const healthSnapshotSchema = z.object({
  checkedAt: z.string().datetime(),
  pocketpawReachable: z.boolean(),
  daemonState: z.enum(["idle", "starting", "running", "retrying", "error", "stopped"]),
  databaseReady: z.boolean(),
  runtimeManagerReady: z.boolean(),
});

export type HealthSnapshot = z.infer<typeof healthSnapshotSchema>;

export const healthSnapshotResponseSchema = z.union([
  z.object({
    ok: z.literal(true),
    data: healthSnapshotSchema,
  }),
  z.object({
    ok: z.literal(false),
    error: ipcErrorSchema,
  }),
]);

export type HealthSnapshotResponse = z.infer<
  typeof healthSnapshotResponseSchema
>;

export const openPocketpawRequestSchema = z.object({
  baseUrl: z.string().url().default("http://127.0.0.1:8888"),
});

export type OpenPocketpawRequest = z.infer<typeof openPocketpawRequestSchema>;

export const openPocketpawResponseSchema = z.union([
  z.object({
    ok: z.literal(true),
  }),
  z.object({
    ok: z.literal(false),
    error: ipcErrorSchema,
  }),
]);

export type OpenPocketpawResponse = z.infer<typeof openPocketpawResponseSchema>;

export const runtimeToolIdSchema = z.enum(["camoufox", "pocketpaw-fork"]);
export type RuntimeToolId = z.infer<typeof runtimeToolIdSchema>;

export const runtimeToolSchema = z.object({
  id: runtimeToolIdSchema,
  displayName: z.string().min(1),
  packageName: z.string().min(1),
});

export type RuntimeTool = z.infer<typeof runtimeToolSchema>;

export const runtimeToolListResponseSchema = z.union([
  z.object({
    ok: z.literal(true),
    data: z.array(runtimeToolSchema),
  }),
  z.object({
    ok: z.literal(false),
    error: ipcErrorSchema,
  }),
]);

export type RuntimeToolListResponse = z.infer<typeof runtimeToolListResponseSchema>;

export const runtimeToolOperationRequestSchema = z.object({
  toolId: runtimeToolIdSchema,
});

export type RuntimeToolOperationRequest = z.infer<typeof runtimeToolOperationRequestSchema>;

export const runtimeToolOperationResultSchema = z.object({
  toolId: runtimeToolIdSchema,
  status: z.enum(["installed", "uninstalled"]),
  message: z.string().min(1),
  command: z.array(z.string()),
});

export type RuntimeToolOperationResult = z.infer<typeof runtimeToolOperationResultSchema>;

export const runtimeToolOperationResponseSchema = z.union([
  z.object({
    ok: z.literal(true),
    data: runtimeToolOperationResultSchema,
  }),
  z.object({
    ok: z.literal(false),
    error: ipcErrorSchema,
  }),
]);

export type RuntimeToolOperationResponse = z.infer<typeof runtimeToolOperationResponseSchema>;

export const secretSettingKeySchema = z.enum(["telegramBotToken", "llmApiKey"]);
export type SecretSettingKey = z.infer<typeof secretSettingKeySchema>;

export const secretSettingSchema = z.object({
  key: secretSettingKeySchema,
  label: z.string().min(1),
  hasValue: z.boolean(),
  maskedValue: z.string().min(1).nullable(),
  updatedAt: z.string().datetime().nullable(),
});

export type SecretSetting = z.infer<typeof secretSettingSchema>;

export const secretSettingListResponseSchema = z.union([
  z.object({
    ok: z.literal(true),
    data: z.array(secretSettingSchema),
  }),
  z.object({
    ok: z.literal(false),
    error: ipcErrorSchema,
  }),
]);

export type SecretSettingListResponse = z.infer<typeof secretSettingListResponseSchema>;

export const secretSettingUpsertRequestSchema = z.object({
  key: secretSettingKeySchema,
  value: z.string().min(1).max(4096),
});

export type SecretSettingUpsertRequest = z.infer<typeof secretSettingUpsertRequestSchema>;

export const secretSettingClearRequestSchema = z.object({
  key: secretSettingKeySchema,
});

export type SecretSettingClearRequest = z.infer<typeof secretSettingClearRequestSchema>;

export const secretSettingMutationResponseSchema = z.union([
  z.object({
    ok: z.literal(true),
    data: secretSettingSchema,
  }),
  z.object({
    ok: z.literal(false),
    error: ipcErrorSchema,
  }),
]);

export type SecretSettingMutationResponse = z.infer<typeof secretSettingMutationResponseSchema>;

export const chatMessageSourceSchema = z.enum(["drawer", "telegram"]);
export type ChatMessageSource = z.infer<typeof chatMessageSourceSchema>;

export const chatSendMessageRequestSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1),
  correlationId: z.string().min(1).optional(),
  source: chatMessageSourceSchema.default("drawer"),
});

export type ChatSendMessageRequest = z.infer<typeof chatSendMessageRequestSchema>;

export const chatSendMessageResultSchema = z.object({
  sessionId: z.string().min(1),
  requestId: z.string().min(1),
  correlationId: z.string().min(1),
  acceptedAt: z.string().datetime(),
});

export type ChatSendMessageResult = z.infer<typeof chatSendMessageResultSchema>;

export const chatSendMessageResponseSchema = z.union([
  z.object({
    ok: z.literal(true),
    data: chatSendMessageResultSchema,
  }),
  z.object({
    ok: z.literal(false),
    error: ipcErrorSchema,
  }),
]);

export type ChatSendMessageResponse = z.infer<typeof chatSendMessageResponseSchema>;

const chatStreamEventBaseSchema = z.object({
  sessionId: z.string().min(1),
  requestId: z.string().min(1),
  correlationId: z.string().min(1),
  occurredAt: z.string().datetime(),
});

export const chatStreamEventSchema = z.discriminatedUnion("type", [
  chatStreamEventBaseSchema.extend({
    type: z.literal("queued"),
  }),
  chatStreamEventBaseSchema.extend({
    type: z.literal("token"),
    chunk: z.string().min(1),
  }),
  chatStreamEventBaseSchema.extend({
    type: z.literal("completed"),
    message: z.string().min(1),
  }),
  chatStreamEventBaseSchema.extend({
    type: z.literal("failed"),
    error: ipcErrorSchema,
  }),
  chatStreamEventBaseSchema.extend({
    type: z.literal("cancelled"),
  }),
]);

export type ChatStreamEvent = z.infer<typeof chatStreamEventSchema>;

export const chatCancelStreamRequestSchema = z.object({
  sessionId: z.string().min(1),
  requestId: z.string().min(1),
});

export type ChatCancelStreamRequest = z.infer<typeof chatCancelStreamRequestSchema>;

export const chatCancelStreamResultSchema = z.object({
  sessionId: z.string().min(1),
  requestId: z.string().min(1),
  cancelledAt: z.string().datetime(),
});

export type ChatCancelStreamResult = z.infer<typeof chatCancelStreamResultSchema>;

export const chatCancelStreamResponseSchema = z.union([
  z.object({
    ok: z.literal(true),
    data: chatCancelStreamResultSchema,
  }),
  z.object({
    ok: z.literal(false),
    error: ipcErrorSchema,
  }),
]);

export type ChatCancelStreamResponse = z.infer<typeof chatCancelStreamResponseSchema>;

export const runStatusSourceSchema = z.enum(["drawer", "telegram", "system"]);
export type RunStatusSource = z.infer<typeof runStatusSourceSchema>;

const runStatusEventBaseSchema = z.object({
  runId: z.string().min(1),
  correlationId: z.string().min(1),
  occurredAt: z.string().datetime(),
  source: runStatusSourceSchema.default("system"),
  skillId: z.string().min(1).optional(),
});

export const runStatusEventSchema = z.discriminatedUnion("status", [
  runStatusEventBaseSchema.extend({
    status: z.literal("queued"),
  }),
  runStatusEventBaseSchema.extend({
    status: z.literal("running"),
  }),
  runStatusEventBaseSchema.extend({
    status: z.literal("success"),
    message: z.string().min(1).optional(),
  }),
  runStatusEventBaseSchema.extend({
    status: z.literal("fail"),
    error: ipcErrorSchema,
  }),
]);

export type RunStatusEvent = z.infer<typeof runStatusEventSchema>;

export interface DesktopIpcApi {
  getHealthSnapshot: () => Promise<HealthSnapshotResponse>;
  openPocketpaw: (
    request: OpenPocketpawRequest,
  ) => Promise<OpenPocketpawResponse>;
  listRuntimeTools: () => Promise<RuntimeToolListResponse>;
  installRuntimeTool: (
    request: RuntimeToolOperationRequest,
  ) => Promise<RuntimeToolOperationResponse>;
  uninstallRuntimeTool: (
    request: RuntimeToolOperationRequest,
  ) => Promise<RuntimeToolOperationResponse>;
  listSecretSettings: () => Promise<SecretSettingListResponse>;
  setSecretSetting: (
    request: SecretSettingUpsertRequest,
  ) => Promise<SecretSettingMutationResponse>;
  clearSecretSetting: (
    request: SecretSettingClearRequest,
  ) => Promise<SecretSettingMutationResponse>;
  sendChatMessage: (
    request: ChatSendMessageRequest,
  ) => Promise<ChatSendMessageResponse>;
  cancelChatStream: (
    request: ChatCancelStreamRequest,
  ) => Promise<ChatCancelStreamResponse>;
  onChatStreamEvent: (
    listener: (event: ChatStreamEvent) => void,
  ) => () => void;
  onRunStatusEvent: (
    listener: (event: RunStatusEvent) => void,
  ) => () => void;
}
