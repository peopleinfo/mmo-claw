import { beforeEach, describe, expect, it } from "vitest";

import { useChatStore } from "./use-chat-store";

describe("chat store", () => {
  beforeEach(() => {
    useChatStore.getState().reset();
  });

  it("supports optimistic send and streamed assistant transcript updates", () => {
    const store = useChatStore.getState();
    const sessionId = "session-a";
    store.setActiveSession(sessionId);

    const userMessageId = store.queueUserMessage(sessionId, "hello");
    store.acceptRequest(sessionId, "req-1", "corr-1");
    store.appendToken(sessionId, "req-1", "partial");
    store.completeRequest(sessionId, "req-1", "final");

    const session = useChatStore.getState().sessions[sessionId];
    const userMessage = session.messages.find((message) => message.id === userMessageId);
    const assistantMessage = session.messages.find((message) => message.id === "assistant-req-1");

    expect(userMessage?.status).toBe("sent");
    expect(assistantMessage?.status).toBe("complete");
    expect(assistantMessage?.content).toBe("partial");
    expect(session.streamState).toBe("idle");
    expect(session.activeRequestId).toBeNull();
  });

  it("retains transcript per session when switching active session", () => {
    const store = useChatStore.getState();
    store.setActiveSession("session-1");
    store.queueUserMessage("session-1", "first");

    store.setActiveSession("session-2");
    store.queueUserMessage("session-2", "second");

    const state = useChatStore.getState();
    expect(state.sessions["session-1"]?.messages.length).toBe(1);
    expect(state.sessions["session-2"]?.messages.length).toBe(1);
  });

  it("marks failed optimistic messages as retryable", () => {
    const store = useChatStore.getState();
    const sessionId = "session-error";
    store.setActiveSession(sessionId);
    const userMessageId = store.queueUserMessage(sessionId, "fail me");

    store.markLatestPendingFailed(sessionId, "bridge unavailable");

    const session = useChatStore.getState().sessions[sessionId];
    const userMessage = session.messages.find((message) => message.id === userMessageId);

    expect(userMessage?.status).toBe("error");
    expect(userMessage?.retryable).toBe(true);
    expect(session.streamState).toBe("error");
    expect(session.lastError).toBe("bridge unavailable");
  });
});
