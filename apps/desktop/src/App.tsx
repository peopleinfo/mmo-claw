import { useEffect, useState } from "react";
import { NavLink, Route, Routes, useLocation } from "react-router-dom";

import * as UI from "./ui";

import { ChatSessionPanel } from "./components/chat-session-panel";
import { MarketplacePanel } from "./components/marketplace-panel";
import {
  AccountsPanel,
  ProfilesPanel,
  ProxiesPanel,
  SchedulePanel,
  TeamPanel,
} from "./components/ops-panels";
import { PocketpawView } from "./components/pocketpaw-view";
import { RunsPanel } from "./components/runs-panel";
import { SettingsPanel } from "./components/settings-panel";
import { POCKETPAW_VIEW_URL } from "./lib/pocketpaw";
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
    const pollInterval = setInterval(() => {
      void loadHealthSnapshot();
    }, 5_000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [setHealthSnapshot]);

  return (
    <UI.PageShell
      title="Dashboard"
      description="Startup health checks for core foundation services."
    >
      <UI.Card>
        <UI.CardTitle>Runtime Snapshot</UI.CardTitle>
        {healthSnapshot ? (
          <ul className="desktop-list">
            <li>
              PocketPaw Reachable: {String(healthSnapshot.pocketpawReachable)}
            </li>
            <li>PocketPaw Daemon State: {healthSnapshot.daemonState}</li>
            <li>Database Ready: {String(healthSnapshot.databaseReady)}</li>
            <li>
              Runtime Manager Ready:{" "}
              {String(healthSnapshot.runtimeManagerReady)}
            </li>
            <li>Checked At: {healthSnapshot.checkedAt}</li>
          </ul>
        ) : (
          <UI.CardDescription>
            No health snapshot available yet.
          </UI.CardDescription>
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
            onClick={() =>
              void window.desktopApi.openPocketpaw({
                baseUrl: POCKETPAW_VIEW_URL,
              })
            }
          >
            Open in External Browser
          </UI.Button>
          <UI.Button variant="outline" onClick={() => setChatDrawerOpen(true)}>
            Open Right Drawer
          </UI.Button>
        </div>
        <UI.CardDescription>
          Drawer chat stays available across routes so command context is not
          lost while navigating.
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

// PocketPaw page fills the content area — no extra page padding so the native
// WebContentsView overlay aligns flush with the stage div.
const PocketpawPage = (): JSX.Element => {
  return <PocketpawView />;
};

interface AppNavigationProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

const AppNavigation = ({
  collapsed,
  onToggleCollapsed,
}: AppNavigationProps): JSX.Element => {
  const location = useLocation();
  const setSelectedPath = useShellStore((state) => state.setSelectedPath);

  useEffect(() => {
    setSelectedPath(location.pathname);
  }, [location.pathname, setSelectedPath]);

  return (
    <aside className="desktop-nav">
      <div className="desktop-nav__header">
        <h2 className="desktop-nav__title">
          {collapsed ? "MC" : "MMO Claw"}
        </h2>
        <button
          type="button"
          className="desktop-nav__toggle"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expand menu" : "Collapse menu"}
          title={collapsed ? "Expand menu" : "Collapse menu"}
        >
          {collapsed ? ">" : "<"}
        </button>
      </div>
      <ul className="desktop-nav__list">
        {desktopPages.map((page) => (
          <li key={page.path}>
            <NavLink
              to={page.path}
              end={page.path === "/"}
              className={({ isActive }) =>
                isActive ? "desktop-nav__link is-active" : "desktop-nav__link"
              }
              title={collapsed ? page.label : undefined}
            >
              <span className="desktop-nav__abbr" aria-hidden="true">
                {page.label.slice(0, 1).toUpperCase()}
              </span>
              <span className="desktop-nav__label">{page.label}</span>
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
  const [navCollapsed, setNavCollapsed] = useState(false);

  useEffect(() => {
    return window.desktopApi.onRunStatusEvent((event) => {
      appendRunEvent(event);
    });
  }, [appendRunEvent]);

  const layoutClassName = [
    "desktop-layout",
    chatDrawerOpen ? "has-chat-drawer" : "",
    navCollapsed ? "is-nav-collapsed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={layoutClassName}>
      <AppNavigation
        collapsed={navCollapsed}
        onToggleCollapsed={() => setNavCollapsed((current) => !current)}
      />
      <section className="desktop-content">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/pocketpaw" element={<PocketpawPage />} />
          <Route
            path="/profiles"
            element={
              <UI.PageShell
                title="Profiles"
                description="Profile CRUD for browser identity and actor routing."
              >
                <ProfilesPanel />
              </UI.PageShell>
            }
          />
          <Route
            path="/proxies"
            element={
              <UI.PageShell
                title="Proxies"
                description="Proxy endpoint management for anti-detect sessions."
              >
                <ProxiesPanel />
              </UI.PageShell>
            }
          />
          <Route
            path="/accounts"
            element={
              <UI.PageShell
                title="Accounts"
                description="Bind accounts to profile and proxy assignments."
              >
                <AccountsPanel />
              </UI.PageShell>
            }
          />
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route
            path="/schedule"
            element={
              <UI.PageShell
                title="Schedule"
                description="Cron schedule definitions for recurring automation runs."
              >
                <SchedulePanel />
              </UI.PageShell>
            }
          />
          <Route path="/runs" element={<RunsPage />} />
          <Route
            path="/team"
            element={
              <UI.PageShell
                title="Team"
                description="Role management for multi-user collaboration."
              >
                <TeamPanel />
              </UI.PageShell>
            }
          />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </section>
      <aside
        className={
          chatDrawerOpen ? "desktop-chat-drawer is-open" : "desktop-chat-drawer"
        }
      >
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
      <button
        type="button"
        className="desktop-chat-toggle"
        onClick={() => toggleChatDrawer()}
      >
        {chatDrawerOpen ? "Hide Chat" : "Open Chat"}
      </button>
    </div>
  );
};
