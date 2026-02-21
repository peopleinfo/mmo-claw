import { contextBridge, ipcRenderer } from "electron";

import {
  desktopChannels,
  type DesktopIpcApi,
  type OpenPocketpawRequest,
  type RuntimeToolOperationRequest,
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
};

contextBridge.exposeInMainWorld("desktopApi", desktopApi);
