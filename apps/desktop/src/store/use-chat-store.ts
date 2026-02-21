import { create } from "zustand";

export type ChatMessageRole = "user" | "assistant";
export type ChatMessageStatus =
  | "pending"
  | "sent"
  | "streaming"
  | "complete"
  | "error"
  | "cancelled";
export type ChatStreamState =
  | "idle"
  | "queued"
  | "streaming"
  | "error"
  | "cancelled";

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  status: ChatMessageStatus;
  createdAt: string;
  requestId?: string;
  correlationId?: string;
  retryable?: boolean;
}

export interface ChatSessionState {
  sessionId: string;
  messages: ChatMessage[];
  draft: string;
  streamState: ChatStreamState;
  activeRequestId: string | null;
  lastError: string | null;
  pendingUserMessageIds: string[];
  requestToUserMessageId: Record<string, string>;
}

interface ChatStoreState {
  activeSessionId: string;
  sessions: Record<string, ChatSessionState>;
}

interface ChatStoreActions {
  reset: () => void;
  setActiveSession: (sessionId: string) => void;
  setDraft: (sessionId: string, draft: string) => void;
  queueUserMessage: (sessionId: string, content: string) => string;
  markLatestPendingFailed: (sessionId: string, errorMessage: string) => void;
  acceptRequest: (sessionId: string, requestId: string, correlationId: string) => void;
  appendToken: (sessionId: string, requestId: string, chunk: string) => void;
  completeRequest: (sessionId: string, requestId: string, message: string) => void;
  failRequest: (sessionId: string, requestId: string, errorMessage: string) => void;
  cancelRequest: (sessionId: string, requestId: string) => void;
}

export type ChatStore = ChatStoreState & ChatStoreActions;

const createMessageId = (prefix: string): string => {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
};

const createEmptySession = (sessionId: string): ChatSessionState => ({
  sessionId,
  messages: [],
  draft: "",
  streamState: "idle",
  activeRequestId: null,
  lastError: null,
  pendingUserMessageIds: [],
  requestToUserMessageId: {},
});

const ensureSession = (
  sessions: Record<string, ChatSessionState>,
  sessionId: string,
): ChatSessionState => {
  return sessions[sessionId] ?? createEmptySession(sessionId);
};

const DEFAULT_CHAT_SESSION_ID = "local-session";

const createInitialChatStoreState = (): ChatStoreState => ({
  activeSessionId: DEFAULT_CHAT_SESSION_ID,
  sessions: {
    [DEFAULT_CHAT_SESSION_ID]: createEmptySession(DEFAULT_CHAT_SESSION_ID),
  },
});

const upsertAssistantMessage = (
  session: ChatSessionState,
  requestId: string,
  correlationId?: string,
): ChatSessionState => {
  const assistantMessageId = `assistant-${requestId}`;
  const existingMessage = session.messages.find((message) => message.id === assistantMessageId);
  if (existingMessage) {
    return session;
  }

  return {
    ...session,
    messages: [
      ...session.messages,
      {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        status: "streaming",
        createdAt: new Date().toISOString(),
        requestId,
        correlationId,
      },
    ],
  };
};

export const useChatStore = create<ChatStore>((set) => ({
  ...createInitialChatStoreState(),
  reset: () => {
    set(createInitialChatStoreState());
  },
  setActiveSession: (sessionId: string) => {
    set((state) => ({
      ...state,
      activeSessionId: sessionId,
      sessions: {
        ...state.sessions,
        [sessionId]: ensureSession(state.sessions, sessionId),
      },
    }));
  },
  setDraft: (sessionId: string, draft: string) => {
    set((state) => {
      const session = ensureSession(state.sessions, sessionId);
      return {
        ...state,
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            draft,
          },
        },
      };
    });
  },
  queueUserMessage: (sessionId: string, content: string) => {
    const messageId = createMessageId("user");
    set((state) => {
      const session = ensureSession(state.sessions, sessionId);
      return {
        ...state,
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            lastError: null,
            streamState: "queued",
            messages: [
              ...session.messages,
              {
                id: messageId,
                role: "user",
                content,
                status: "pending",
                createdAt: new Date().toISOString(),
                retryable: false,
              },
            ],
            pendingUserMessageIds: [...session.pendingUserMessageIds, messageId],
          },
        },
      };
    });

    return messageId;
  },
  markLatestPendingFailed: (sessionId: string, errorMessage: string) => {
    set((state) => {
      const session = ensureSession(state.sessions, sessionId);
      const latestPendingId = session.pendingUserMessageIds[0];
      if (!latestPendingId) {
        return {
          ...state,
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...session,
              streamState: "error",
              lastError: errorMessage,
            },
          },
        };
      }

      return {
        ...state,
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            streamState: "error",
            lastError: errorMessage,
            pendingUserMessageIds: session.pendingUserMessageIds.slice(1),
            messages: session.messages.map((message) => {
              if (message.id !== latestPendingId) {
                return message;
              }

              return {
                ...message,
                status: "error",
                retryable: true,
              };
            }),
          },
        },
      };
    });
  },
  acceptRequest: (sessionId: string, requestId: string, correlationId: string) => {
    set((state) => {
      const session = ensureSession(state.sessions, sessionId);
      const latestPendingId = session.pendingUserMessageIds[0];
      const nextSession = upsertAssistantMessage(
        {
          ...session,
          streamState: "queued",
          activeRequestId: requestId,
          lastError: null,
          pendingUserMessageIds: latestPendingId
            ? session.pendingUserMessageIds.slice(1)
            : session.pendingUserMessageIds,
          requestToUserMessageId: latestPendingId
            ? {
                ...session.requestToUserMessageId,
                [requestId]: latestPendingId,
              }
            : session.requestToUserMessageId,
          messages: session.messages.map((message) => {
            if (message.id !== latestPendingId) {
              return message;
            }

            return {
              ...message,
              status: "sent",
              requestId,
              correlationId,
            };
          }),
        },
        requestId,
        correlationId,
      );

      return {
        ...state,
        sessions: {
          ...state.sessions,
          [sessionId]: nextSession,
        },
      };
    });
  },
  appendToken: (sessionId: string, requestId: string, chunk: string) => {
    set((state) => {
      const session = upsertAssistantMessage(ensureSession(state.sessions, sessionId), requestId);
      return {
        ...state,
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            streamState: "streaming",
            activeRequestId: requestId,
            messages: session.messages.map((message) => {
              if (message.id !== `assistant-${requestId}`) {
                return message;
              }

              return {
                ...message,
                status: "streaming",
                content: `${message.content}${chunk}`,
              };
            }),
          },
        },
      };
    });
  },
  completeRequest: (sessionId: string, requestId: string, message: string) => {
    set((state) => {
      const session = upsertAssistantMessage(ensureSession(state.sessions, sessionId), requestId);
      const userMessageId = session.requestToUserMessageId[requestId];
      const nextRequestToMessage = { ...session.requestToUserMessageId };
      delete nextRequestToMessage[requestId];

      return {
        ...state,
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            streamState: "idle",
            activeRequestId: null,
            requestToUserMessageId: nextRequestToMessage,
            messages: session.messages.map((entry) => {
              if (entry.id === `assistant-${requestId}`) {
                return {
                  ...entry,
                  status: "complete",
                  content: entry.content.length > 0 ? entry.content : message,
                };
              }

              if (entry.id === userMessageId) {
                return {
                  ...entry,
                  status: "sent",
                  retryable: false,
                };
              }

              return entry;
            }),
          },
        },
      };
    });
  },
  failRequest: (sessionId: string, requestId: string, errorMessage: string) => {
    set((state) => {
      const session = upsertAssistantMessage(ensureSession(state.sessions, sessionId), requestId);
      const userMessageId = session.requestToUserMessageId[requestId];
      const nextRequestToMessage = { ...session.requestToUserMessageId };
      delete nextRequestToMessage[requestId];

      return {
        ...state,
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            streamState: "error",
            lastError: errorMessage,
            activeRequestId: null,
            requestToUserMessageId: nextRequestToMessage,
            messages: session.messages.map((entry) => {
              if (entry.id === `assistant-${requestId}`) {
                return {
                  ...entry,
                  status: "error",
                  content: entry.content.length > 0 ? entry.content : errorMessage,
                };
              }

              if (entry.id === userMessageId) {
                return {
                  ...entry,
                  status: "error",
                  retryable: true,
                };
              }

              return entry;
            }),
          },
        },
      };
    });
  },
  cancelRequest: (sessionId: string, requestId: string) => {
    set((state) => {
      const session = upsertAssistantMessage(ensureSession(state.sessions, sessionId), requestId);
      const userMessageId = session.requestToUserMessageId[requestId];
      const nextRequestToMessage = { ...session.requestToUserMessageId };
      delete nextRequestToMessage[requestId];

      return {
        ...state,
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            streamState: "cancelled",
            activeRequestId: null,
            requestToUserMessageId: nextRequestToMessage,
            messages: session.messages.map((entry) => {
              if (entry.id === `assistant-${requestId}`) {
                return {
                  ...entry,
                  status: "cancelled",
                  content: entry.content.length > 0 ? entry.content : "Request cancelled.",
                };
              }

              if (entry.id === userMessageId) {
                return {
                  ...entry,
                  status: "cancelled",
                  retryable: true,
                };
              }

              return entry;
            }),
          },
        },
      };
    });
  },
}));
