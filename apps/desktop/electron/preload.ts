import { contextBridge, ipcRenderer } from "electron";

import {
  chatStreamEventSchema,
  desktopChannels,
  runStatusEventSchema,
  type DesktopIpcApi,
  type ChatCancelStreamRequest,
  type ChatSendMessageRequest,
  type ChatStreamEvent,
  type OpenPocketpawRequest,
  type RunStatusEvent,
  type RuntimeToolOperationRequest,
  type SecretSettingClearRequest,
  type SecretSettingUpsertRequest,
} from "@mmo-claw/ipc";

const desktopApi: DesktopIpcApi = {
  getHealthSnapshot: () => ipcRenderer.invoke(desktopChannels.getHealthSnapshot),
  openPocketpaw: (request: OpenPocketpawRequest) =>
    ipcRenderer.invoke(desktopChannels.openPocketpaw, request),
  listRuntimeTools: () => ipcRenderer.invoke(desktopChannels.listRuntimeTools),
  installRuntimeTool: (request: RuntimeToolOperationRequest) =>
    ipcRenderer.invoke(desktopChannels.installRuntimeTool, request),
  uninstallRuntimeTool: (request: RuntimeToolOperationRequest) =>
    ipcRenderer.invoke(desktopChannels.uninstallRuntimeTool, request),
  listSecretSettings: () => ipcRenderer.invoke(desktopChannels.listSecretSettings),
  setSecretSetting: (request: SecretSettingUpsertRequest) =>
    ipcRenderer.invoke(desktopChannels.setSecretSetting, request),
  clearSecretSetting: (request: SecretSettingClearRequest) =>
    ipcRenderer.invoke(desktopChannels.clearSecretSetting, request),
  sendChatMessage: (request: ChatSendMessageRequest) =>
    ipcRenderer.invoke(desktopChannels.sendChatMessage, request),
  cancelChatStream: (request: ChatCancelStreamRequest) =>
    ipcRenderer.invoke(desktopChannels.cancelChatStream, request),
  onChatStreamEvent: (listener: (event: ChatStreamEvent) => void) => {
    const eventHandler = (_event: unknown, payload: unknown) => {
      const parsedPayload = chatStreamEventSchema.safeParse(payload);
      if (!parsedPayload.success) {
        return;
      }

      listener(parsedPayload.data);
    };

    ipcRenderer.on(desktopChannels.chatStreamEvent, eventHandler);
    return () => {
      ipcRenderer.removeListener(desktopChannels.chatStreamEvent, eventHandler);
    };
  },
  onRunStatusEvent: (listener: (event: RunStatusEvent) => void) => {
    const eventHandler = (_event: unknown, payload: unknown) => {
      const parsedPayload = runStatusEventSchema.safeParse(payload);
      if (!parsedPayload.success) {
        return;
      }

      listener(parsedPayload.data);
    };

    ipcRenderer.on(desktopChannels.runStatusEvent, eventHandler);
    return () => {
      ipcRenderer.removeListener(desktopChannels.runStatusEvent, eventHandler);
    };
  },
};

contextBridge.exposeInMainWorld("desktopApi", desktopApi);
