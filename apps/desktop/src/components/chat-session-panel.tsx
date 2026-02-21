import { useEffect } from "react";

import type { ChatMessage } from "../store/use-chat-store";
import { useChatStore } from "../store/use-chat-store";

const CHAT_SESSION_ID = "local-session";
const QUICK_COMMAND_CHIPS: ReadonlyArray<{
  label: string;
  command: string;
}> = [
  {
    label: "IG Post",
    command: "/ig-post profile-1 /tmp/post.jpg | publish now",
  },
  {
    label: "List Runs",
    command: "/runs list recent",
  },
  {
    label: "Health Check",
    command: "/health check runtime",
  },
] as const;

const createErrorMessage = (message: ChatMessage): string => {
  return message.retryable ? "Failed to send. Retry is available." : "Message failed.";
};

export const ChatSessionPanel = (): JSX.Element => {
  const activeSessionId = useChatStore((state) => state.activeSessionId);
  const session = useChatStore((state) => state.sessions[state.activeSessionId]);
  const setActiveSession = useChatStore((state) => state.setActiveSession);
  const setDraft = useChatStore((state) => state.setDraft);
  const queueUserMessage = useChatStore((state) => state.queueUserMessage);
  const markLatestPendingFailed = useChatStore((state) => state.markLatestPendingFailed);
  const acceptRequest = useChatStore((state) => state.acceptRequest);
  const appendToken = useChatStore((state) => state.appendToken);
  const completeRequest = useChatStore((state) => state.completeRequest);
  const failRequest = useChatStore((state) => state.failRequest);
  const cancelRequest = useChatStore((state) => state.cancelRequest);

  useEffect(() => {
    setActiveSession(CHAT_SESSION_ID);
  }, [setActiveSession]);

  useEffect(() => {
    return window.desktopApi.onChatStreamEvent((event) => {
      if (event.type === "queued") {
        acceptRequest(event.sessionId, event.requestId, event.correlationId);
        return;
      }

      if (event.type === "token") {
        appendToken(event.sessionId, event.requestId, event.chunk);
        return;
      }

      if (event.type === "completed") {
        completeRequest(event.sessionId, event.requestId, event.message);
        return;
      }

      if (event.type === "failed") {
        failRequest(event.sessionId, event.requestId, event.error.message);
        return;
      }

      cancelRequest(event.sessionId, event.requestId);
    });
  }, [
    acceptRequest,
    appendToken,
    cancelRequest,
    completeRequest,
    failRequest,
  ]);

  if (!session) {
    return <p className="desktop-muted">Loading chat session...</p>;
  }

  const sendMessage = async (content: string): Promise<void> => {
    const message = content.trim();
    if (!message) {
      return;
    }

    queueUserMessage(activeSessionId, message);
    setDraft(activeSessionId, "");

    const response = await window.desktopApi.sendChatMessage({
      sessionId: activeSessionId,
      message,
      source: "drawer",
    });

    if (!response.ok) {
      markLatestPendingFailed(activeSessionId, response.error.message);
      return;
    }

    acceptRequest(activeSessionId, response.data.requestId, response.data.correlationId);
  };

  const submitDraft = (): Promise<void> => {
    return sendMessage(session.draft);
  };

  const cancelActiveRequest = async (): Promise<void> => {
    if (!session.activeRequestId) {
      return;
    }

    const response = await window.desktopApi.cancelChatStream({
      sessionId: activeSessionId,
      requestId: session.activeRequestId,
    });

    if (response.ok) {
      cancelRequest(activeSessionId, response.data.requestId);
      return;
    }

    failRequest(activeSessionId, session.activeRequestId, response.error.message);
  };

  return (
    <section className="chat-session">
      <header className="chat-session__header">
        <p className="chat-session__state">State: {session.streamState}</p>
        {session.lastError ? <p className="chat-session__error">{session.lastError}</p> : null}
      </header>

      <div className="chat-session__chips">
        {QUICK_COMMAND_CHIPS.map((chip) => (
          <button
            key={chip.label}
            type="button"
            className="ui-button ui-button--ghost"
            onClick={() => setDraft(activeSessionId, chip.command)}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="chat-session__transcript">
        {session.messages.length === 0 ? (
          <p className="desktop-muted">No messages yet. Start a new request below.</p>
        ) : (
          session.messages.map((message) => (
            <article
              key={message.id}
              className={
                message.role === "user" ? "chat-session__message chat-session__message--user" : "chat-session__message"
              }
            >
              <div className="chat-session__meta">
                <span>{message.role === "user" ? "You" : "Assistant"}</span>
                <span>{message.status}</span>
              </div>
              <p>{message.content || "..."}</p>
              {message.role === "user" && message.status === "error" ? (
                <div className="chat-session__actions">
                  <button
                    type="button"
                    className="ui-button ui-button--outline"
                    onClick={() => void sendMessage(message.content)}
                  >
                    Retry
                  </button>
                  <span className="desktop-muted">{createErrorMessage(message)}</span>
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>

      <div className="chat-session__composer">
        <textarea
          className="chat-session__input"
          value={session.draft}
          onChange={(event) => setDraft(activeSessionId, event.target.value)}
          placeholder="Type a command, for example: /ig-post profile-1 /tmp/post.jpg | launch now"
          rows={3}
        />
        <div className="desktop-row">
          <button type="button" className="ui-button ui-button--default" onClick={() => void submitDraft()}>
            Send
          </button>
          <button
            type="button"
            className="ui-button ui-button--outline"
            onClick={() => void cancelActiveRequest()}
            disabled={!session.activeRequestId}
          >
            Cancel Active
          </button>
        </div>
      </div>
    </section>
  );
};
