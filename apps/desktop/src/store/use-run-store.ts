import { create } from "zustand";

import type { RunStatusEvent } from "@mmo-claw/ipc";

const MAX_RUN_EVENTS = 100;

interface RunStore {
  events: RunStatusEvent[];
  appendEvent: (event: RunStatusEvent) => void;
  clearEvents: () => void;
}

export const useRunStore = create<RunStore>((set) => ({
  events: [],
  appendEvent: (event) =>
    set((state) => ({
      events: [event, ...state.events].slice(0, MAX_RUN_EVENTS),
    })),
  clearEvents: () => set({ events: [] }),
}));
