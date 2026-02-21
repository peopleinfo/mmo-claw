import { useEffect } from "react";
import { NavLink, Route, Routes, useLocation } from "react-router-dom";

import * as UI from "@mmo-claw/ui";

import { ChatSessionPanel } from "./components/chat-session-panel";
import { MarketplacePanel } from "./components/marketplace-panel";
import { PagePlaceholder } from "./components/page-placeholder";
import { RunsPanel } from "./components/runs-panel";
import { SettingsPanel } from "./components/settings-panel";
import { desktopPages } from "./lib/pages";
import { useRunStore } from "./store/use-run-store";
import { useShellStore } from "./store/use-shell-store";

const DashboardPage = (): JSX.Element => {
  const healthSnapshot = useShellStore((state) => state.healthSnapshot);
  const setHealthSnapshot = useShellStore((state) => state.setHealthSnapshot);
  const latestRunEvent = useRunStore((state) => state.events[0] ?? null);

  useEffect(() => {
    const loadHealthSnapshot = async () => {
      const response = await window.desktopApi.getHealthSnapshot();
      if (!response.ok) {
        setHealthSnapshot(null);
        return;
      }

      setHealthSnapshot(response.data);
    };

    void loadHealthSnapshot();
  }, [setHealthSnapshot]);

  return (
    <UI.PageShell title="Dashboard" description="Startup health checks for core foundation services.">
      <UI.Card>
        <UI.CardTitle>Runtime Snapshot</UI.CardTitle>
        {healthSnapshot ? (
          <ul className="desktop-list">
            <li>PocketPaw Reachable: {String(healthSnapshot.pocketpawReachable)}</li>
            <li>PocketPaw Daemon State: {healthSnapshot.daemonState}</li>
            <li>Database Ready: {String(healthSnapshot.databaseReady)}</li>
            <li>Runtime Manager Ready: {String(healthSnapshot.runtimeManagerReady)}</li>
            <li>Checked At: {healthSnapshot.checkedAt}</li>
          </ul>
        ) : (
          <UI.CardDescription>No health snapshot available yet.</UI.CardDescription>
        )}
      </UI.Card>
      <UI.Card>
        <UI.CardTitle>Latest Run Status</UI.CardTitle>
        {latestRunEvent ? (
          <ul className="desktop-list">
            <li>Status: {latestRunEvent.status}</li>
            <li>Run ID: {latestRunEvent.runId}</li>
            <li>Correlation ID: {latestRunEvent.correlationId}</li>
            <li>Occurred At: {latestRunEvent.occurredAt}</li>
          </ul>
        ) : (
          <UI.CardDescription>No run events received yet.</UI.CardDescription>
        )}
      </UI.Card>
    </UI.PageShell>
  );
};

const ChatPage = (): JSX.Element => {
  const setChatDrawerOpen = useShellStore((state) => state.setChatDrawerOpen);

  return (
    <UI.PageShell
      title="PocketPaw Chat Console"
      description="Use the global right drawer chat on every page, with streaming state and quick commands."
    >
      <UI.Card>
        <div className="desktop-row">
          <UI.Button
            onClick={() => void window.desktopApi.openPocketpaw({ baseUrl: "http://127.0.0.1:8888" })}
          >
            Open in External Browser
          </UI.Button>
          <UI.Button variant="outline" onClick={() => setChatDrawerOpen(true)}>
            Open Right Drawer
          </UI.Button>
        </div>
        <UI.CardDescription>
          Drawer chat stays available across routes so command context is not lost while navigating.
        </UI.CardDescription>
      </UI.Card>
    </UI.PageShell>
  );
};

const MarketplacePage = (): JSX.Element => {
  return (
    <UI.PageShell
      title="Marketplace"
      description="Manage uvx-backed runtime tools for actors and daemon extensions."
    >
      <MarketplacePanel />
    </UI.PageShell>
  );
};

const SettingsPage = (): JSX.Element => {
  return (
    <UI.PageShell
      title="Settings"
      description="Configure Telegram token and API keys with masked secure storage."
    >
      <SettingsPanel />
    </UI.PageShell>
  );
};

const RunsPage = (): JSX.Element => {
  return (
    <UI.PageShell
      title="Runs"
      description="Live run lifecycle feed from queued to success or fail states."
    >
      <RunsPanel />
    </UI.PageShell>
  );
};

const AppNavigation = (): JSX.Element => {
  const location = useLocation();
  const setSelectedPath = useShellStore((state) => state.setSelectedPath);

  useEffect(() => {
    setSelectedPath(location.pathname);
  }, [location.pathname, setSelectedPath]);

  return (
    <aside className="desktop-nav">
      <h2 className="desktop-nav__title">MMO Claw</h2>
      <ul className="desktop-nav__list">
        {desktopPages.map((page) => (
          <li key={page.path}>
            <NavLink
              to={page.path}
              end={page.path === "/"}
              className={({ isActive }) => (isActive ? "desktop-nav__link is-active" : "desktop-nav__link")}
            >
              {page.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </aside>
  );
};

export const App = (): JSX.Element => {
  const appendRunEvent = useRunStore((state) => state.appendEvent);
  const chatDrawerOpen = useShellStore((state) => state.chatDrawerOpen);
  const setChatDrawerOpen = useShellStore((state) => state.setChatDrawerOpen);
  const toggleChatDrawer = useShellStore((state) => state.toggleChatDrawer);

  useEffect(() => {
    return window.desktopApi.onRunStatusEvent((event) => {
      appendRunEvent(event);
    });
  }, [appendRunEvent]);

  return (
    <div className={chatDrawerOpen ? "desktop-layout has-chat-drawer" : "desktop-layout"}>
      <AppNavigation />
      <section className="desktop-content">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/profiles" element={<PagePlaceholder title="Profiles" description="Profile CRUD shell is wired." />} />
          <Route path="/proxies" element={<PagePlaceholder title="Proxies" description="Proxy CRUD shell is wired." />} />
          <Route path="/accounts" element={<PagePlaceholder title="Accounts" description="Account binding shell is wired." />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/schedule" element={<PagePlaceholder title="Schedule" description="Scheduling shell is wired." />} />
          <Route path="/runs" element={<RunsPage />} />
          <Route path="/team" element={<PagePlaceholder title="Team" description="Team management shell is wired." />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </section>
      <aside className={chatDrawerOpen ? "desktop-chat-drawer is-open" : "desktop-chat-drawer"}>
        <header className="desktop-chat-drawer__header">
          <h3 className="desktop-chat-drawer__title">Command Drawer</h3>
          <button
            type="button"
            className="ui-button ui-button--ghost"
            onClick={() => setChatDrawerOpen(false)}
          >
            Close
          </button>
        </header>
        <ChatSessionPanel />
      </aside>
      <button type="button" className="desktop-chat-toggle" onClick={() => toggleChatDrawer()}>
        {chatDrawerOpen ? "Hide Chat" : "Open Chat"}
      </button>
    </div>
  );
};
