import { describe, expect, it } from "vitest";

import type { ChatStreamEvent, RunStatusEvent } from "@mmo-claw/ipc";

import {
  createPocketpawBridge,
  type PocketpawSocket,
} from "./pocketpaw-bridge";

type SocketListener = (event: unknown) => void;

class FakeSocket implements PocketpawSocket {
  public readyState = 0;
  public readonly sentPayloads: string[] = [];
  private readonly listeners: Record<string, SocketListener[]> = {};

  public addEventListener(type: string, listener: SocketListener): void {
    this.listeners[type] ??= [];
    this.listeners[type].push(listener);
  }

  public send(data: string): void {
    this.sentPayloads.push(data);
  }

  public close(): void {
    this.readyState = 3;
    this.emit("close", {});
  }

  public open(): void {
    this.readyState = 1;
    this.emit("open", {});
  }

  public emitMessage(payload: unknown): void {
    const data = typeof payload === "string" ? payload : JSON.stringify(payload);
    this.emit("message", { data });
  }

  public emitClose(): void {
    this.readyState = 3;
    this.emit("close", {});
  }

  private emit(type: string, event: unknown): void {
    const listeners = this.listeners[type] ?? [];
    for (const listener of listeners) {
      listener(event);
    }
  }
}

describe("pocketpaw bridge", () => {
  it("sends chat messages and emits queued events", async () => {
    const socket = new FakeSocket();
    const events: ChatStreamEvent[] = [];
    const ids = ["id-1", "id-2"];
    const bridge = createPocketpawBridge({
      createSocket: () => socket,
      healthcheck: async () => true,
      idFactory: () => ids.shift() ?? "id-fallback",
      now: () => new Date("2026-02-21T00:00:00.000Z"),
      heartbeatIntervalMs: 100_000,
    });

    bridge.setChatEventListener((event) => {
      events.push(event);
    });
    await bridge.start();
    socket.open();

    const response = await bridge.sendChatMessage({
      sessionId: "session-1",
      source: "drawer",
      message: "hello from drawer",
    });

    expect(response.ok).toBe(true);
    if (!response.ok) {
      throw new Error("Expected sendChatMessage to succeed.");
    }

    expect(response.data.requestId).toBe("req-id-1");
    expect(response.data.correlationId).toBe("corr-id-2");
    expect(events[0]).toMatchObject({
      type: "queued",
      sessionId: "session-1",
      requestId: "req-id-1",
      correlationId: "corr-id-2",
    });

    const outboundPayload = JSON.parse(socket.sentPayloads[0]) as Record<string, string>;
    expect(outboundPayload.type).toBe("chat.send");
    expect(outboundPayload.sessionId).toBe("session-1");

    bridge.stop();
  });

  it("forwards inbound events and clears completed requests", async () => {
    const socket = new FakeSocket();
    const events: ChatStreamEvent[] = [];
    const bridge = createPocketpawBridge({
      createSocket: () => socket,
      healthcheck: async () => true,
      idFactory: (() => {
        let index = 0;
        return () => `id-${++index}`;
      })(),
      now: () => new Date("2026-02-21T00:00:00.000Z"),
      heartbeatIntervalMs: 100_000,
    });

    bridge.setChatEventListener((event) => {
      events.push(event);
    });

    await bridge.start();
    socket.open();
    const response = await bridge.sendChatMessage({
      sessionId: "session-2",
      source: "drawer",
      message: "trigger",
    });

    if (!response.ok) {
      throw new Error("Expected sendChatMessage to succeed.");
    }

    socket.emitMessage({
      type: "token",
      sessionId: "session-2",
      requestId: response.data.requestId,
      correlationId: response.data.correlationId,
      chunk: "partial-token",
    });
    socket.emitMessage({
      type: "completed",
      sessionId: "session-2",
      requestId: response.data.requestId,
      correlationId: response.data.correlationId,
      message: "done",
    });

    expect(events.some((event) => event.type === "token")).toBe(true);
    expect(events.some((event) => event.type === "completed")).toBe(true);

    const cancelResponse = await bridge.cancelChatStream({
      sessionId: "session-2",
      requestId: response.data.requestId,
    });

    expect(cancelResponse.ok).toBe(false);
    if (!cancelResponse.ok) {
      expect(cancelResponse.error.code).toBe("CHAT_STREAM_NOT_FOUND");
    }

    bridge.stop();
  });

  it("reconnects after socket close while running", async () => {
    const sockets: FakeSocket[] = [];
    const bridge = createPocketpawBridge({
      createSocket: () => {
        const socket = new FakeSocket();
        sockets.push(socket);
        return socket;
      },
      healthcheck: async () => true,
      reconnectDelayMs: 5,
      heartbeatIntervalMs: 100_000,
    });

    await bridge.start();
    sockets[0]?.open();
    sockets[0]?.emitClose();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(sockets.length).toBeGreaterThanOrEqual(2);

    bridge.stop();
  });

  it("forwards run lifecycle events with correlation ids", async () => {
    const socket = new FakeSocket();
    const runEvents: RunStatusEvent[] = [];
    const bridge = createPocketpawBridge({
      createSocket: () => socket,
      healthcheck: async () => true,
      heartbeatIntervalMs: 100_000,
    });

    bridge.setRunStatusEventListener((event) => {
      runEvents.push(event);
    });

    await bridge.start();
    socket.open();

    socket.emitMessage({
      type: "run.running",
      runId: "run-1",
      correlationId: "corr-1",
      occurredAt: "2026-02-21T00:00:00.000Z",
      source: "drawer",
      skillId: "instagram-poster",
    });
    socket.emitMessage({
      type: "run.success",
      runId: "run-1",
      correlationId: "corr-1",
      occurredAt: "2026-02-21T00:00:05.000Z",
      source: "drawer",
      message: "Posted successfully",
    });

    expect(runEvents.length).toBe(2);
    expect(runEvents[0]).toMatchObject({
      status: "running",
      runId: "run-1",
      correlationId: "corr-1",
    });
    expect(runEvents[1]).toMatchObject({
      status: "success",
      runId: "run-1",
    });

    bridge.stop();
  });
});
