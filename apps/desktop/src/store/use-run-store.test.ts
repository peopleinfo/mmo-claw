import { beforeEach, describe, expect, it } from "vitest";

import { useRunStore } from "./use-run-store";

describe("useRunStore", () => {
  beforeEach(() => {
    useRunStore.setState({
      events: [],
    });
  });

  it("prepends run status events", () => {
    useRunStore.getState().appendEvent({
      status: "queued",
      runId: "run-1",
      correlationId: "corr-1",
      occurredAt: "2026-02-21T00:00:00.000Z",
      source: "drawer",
    });
    useRunStore.getState().appendEvent({
      status: "running",
      runId: "run-1",
      correlationId: "corr-1",
      occurredAt: "2026-02-21T00:00:01.000Z",
      source: "drawer",
    });

    const events = useRunStore.getState().events;
    expect(events[0]?.status).toBe("running");
    expect(events[1]?.status).toBe("queued");
  });
});
