import { create } from "zustand";

export interface ShellHealthSnapshot {
  checkedAt: string;
  pocketpawReachable: boolean;
  daemonState: "idle" | "starting" | "running" | "retrying" | "error" | "stopped";
  databaseReady: boolean;
  runtimeManagerReady: boolean;
}

interface ShellStore {
  selectedPath: string;
  healthSnapshot: ShellHealthSnapshot | null;
  chatDrawerOpen: boolean;
  setSelectedPath: (path: string) => void;
  setHealthSnapshot: (snapshot: ShellHealthSnapshot | null) => void;
  setChatDrawerOpen: (open: boolean) => void;
  toggleChatDrawer: () => void;
}

export const useShellStore = create<ShellStore>((set) => ({
  selectedPath: "/",
  healthSnapshot: null,
  chatDrawerOpen: false,
  setSelectedPath: (selectedPath) => set({ selectedPath }),
  setHealthSnapshot: (healthSnapshot) => set({ healthSnapshot }),
  setChatDrawerOpen: (chatDrawerOpen) => set({ chatDrawerOpen }),
  toggleChatDrawer: () =>
    set((state) => ({
      chatDrawerOpen: !state.chatDrawerOpen,
    })),
}));
