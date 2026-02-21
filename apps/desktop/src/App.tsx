import { useEffect } from "react";
import { NavLink, Route, Routes, useLocation } from "react-router-dom";

import * as UI from "@mmo-claw/ui";

import { MarketplacePanel } from "./components/marketplace-panel";
import { PagePlaceholder } from "./components/page-placeholder";
import { desktopPages } from "./lib/pages";
import { useShellStore } from "./store/use-shell-store";

const DashboardPage = (): JSX.Element => {
  const healthSnapshot = useShellStore((state) => state.healthSnapshot);
  const setHealthSnapshot = useShellStore((state) => state.setHealthSnapshot);

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
            <li>Database Ready: {String(healthSnapshot.databaseReady)}</li>
            <li>Runtime Manager Ready: {String(healthSnapshot.runtimeManagerReady)}</li>
            <li>Checked At: {healthSnapshot.checkedAt}</li>
          </ul>
        ) : (
          <UI.CardDescription>No health snapshot available yet.</UI.CardDescription>
        )}
      </UI.Card>
    </UI.PageShell>
  );
};

const ChatPage = (): JSX.Element => {
  return (
    <UI.PageShell
      title="PocketPaw Chat"
      description="Embedded PocketPaw UI surface at the default local daemon endpoint."
    >
      <UI.Card>
        <div className="desktop-row">
          <UI.Button
            onClick={() => void window.desktopApi.openPocketpaw({ baseUrl: "http://127.0.0.1:8888" })}
          >
            Open in External Browser
          </UI.Button>
        </div>
        <iframe
          className="desktop-iframe"
          src="http://127.0.0.1:8888"
          title="PocketPaw"
          loading="lazy"
        />
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
  return (
    <div className="desktop-layout">
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
          <Route path="/runs" element={<PagePlaceholder title="Runs" description="Run history shell is wired." />} />
          <Route path="/team" element={<PagePlaceholder title="Team" description="Team management shell is wired." />} />
          <Route path="/settings" element={<PagePlaceholder title="Settings" description="Settings shell is wired." />} />
        </Routes>
      </section>
    </div>
  );
};
