/// <reference types="vite/client" />

import type { DesktopIpcApi } from "@mmo-claw/ipc";

declare global {
  interface Window {
    desktopApi: DesktopIpcApi;
  }
}

export {};
