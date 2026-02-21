import { z } from "zod";

export const desktopChannels = {
  getHealthSnapshot: "desktop:get-health-snapshot",
  openPocketpaw: "desktop:open-pocketpaw",
  listRuntimeTools: "desktop:list-runtime-tools",
  installRuntimeTool: "desktop:install-runtime-tool",
  uninstallRuntimeTool: "desktop:uninstall-runtime-tool",
} as const;

export type DesktopChannel =
  (typeof desktopChannels)[keyof typeof desktopChannels];

export const ipcErrorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "POCKETPAW_UNAVAILABLE",
  "DB_UNAVAILABLE",
  "RUNTIME_UNAVAILABLE",
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
}
