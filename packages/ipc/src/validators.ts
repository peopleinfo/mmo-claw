import { z, type ZodIssue, type ZodTypeAny } from "zod";

import { ipcErrorSchema, type IpcError, type IpcErrorCode } from "./contracts";

const formatIssues = (issues: ZodIssue[]): string => {
  return issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "payload";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
};

export const createIpcError = (
  code: IpcErrorCode,
  message: string,
): IpcError => {
  return ipcErrorSchema.parse({
    code,
    message,
  });
};

export const validatePayload = <TSchema extends ZodTypeAny>(
  schema: TSchema,
  payload: unknown,
):
  | {
      ok: true;
      data: z.infer<TSchema>;
    }
  | {
      ok: false;
      error: IpcError;
    } => {
  const result = schema.safeParse(payload);
  if (result.success) {
    return {
      ok: true,
      data: result.data,
    };
  }

  return {
    ok: false,
    error: createIpcError("VALIDATION_ERROR", formatIssues(result.error.issues)),
  };
};
