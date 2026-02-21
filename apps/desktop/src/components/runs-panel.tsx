import * as UI from "../ui";

import { useRunStore } from "../store/use-run-store";

export const RunsPanel = (): JSX.Element => {
  const events = useRunStore((state) => state.events);
  const clearEvents = useRunStore((state) => state.clearEvents);

  return (
    <UI.Card>
      <UI.CardTitle>Run Status Feed</UI.CardTitle>
      <UI.CardDescription>
        Latest actor lifecycle events from PocketPaw WebSocket bridge.
      </UI.CardDescription>
      <div className="desktop-row">
        <UI.Button
          variant="outline"
          onClick={() => clearEvents()}
          disabled={events.length === 0}
        >
          Clear Feed
        </UI.Button>
      </div>
      <div className="run-feed">
        {events.length === 0 ? (
          <p className="desktop-muted">No run lifecycle events received yet.</p>
        ) : (
          events.map((event) => (
            <article
              key={`${event.runId}-${event.occurredAt}-${event.status}`}
              className="run-feed__item"
            >
              <div className="run-feed__meta">
                <span
                  className={`run-feed__status run-feed__status--${event.status}`}
                >
                  {event.status}
                </span>
                <span>{event.occurredAt}</span>
              </div>
              <p className="run-feed__text">Run: {event.runId}</p>
              <p className="run-feed__text">
                Correlation: {event.correlationId}
              </p>
              {event.skillId ? (
                <p className="run-feed__text">Skill: {event.skillId}</p>
              ) : null}
              {event.status === "success" && event.message ? (
                <p className="run-feed__text">{event.message}</p>
              ) : null}
              {event.status === "fail" ? (
                <p className="run-feed__error">{event.error.message}</p>
              ) : null}
            </article>
          ))
        )}
      </div>
    </UI.Card>
  );
};
