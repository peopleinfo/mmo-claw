import { create } from "zustand";

export interface ShellHealthSnapshot {
  checkedAt: string;
  pocketpawReachable: boolean;
  databaseReady: boolean;
  runtimeManagerReady: boolean;
}

interface ShellStore {
  selectedPath: string;
  healthSnapshot: ShellHealthSnapshot | null;
  setSelectedPath: (path: string) => void;
  setHealthSnapshot: (snapshot: ShellHealthSnapshot | null) => void;
}

export const useShellStore = create<ShellStore>((set) => ({
  selectedPath: "/",
  healthSnapshot: null,
  setSelectedPath: (selectedPath) => set({ selectedPath }),
  setHealthSnapshot: (healthSnapshot) => set({ healthSnapshot }),
}));
