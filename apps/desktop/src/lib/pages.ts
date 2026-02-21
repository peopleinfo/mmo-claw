export interface DesktopPageDefinition {
  path: string;
  label: string;
  description: string;
}

export const desktopPages: DesktopPageDefinition[] = [
  { path: "/", label: "Dashboard", description: "Runtime status and health checks." },
  { path: "/chat", label: "Chat", description: "PocketPaw embedded chat surface." },
  { path: "/profiles", label: "Profiles", description: "Fingerprint profile management." },
  { path: "/proxies", label: "Proxies", description: "Proxy CRUD and assignment." },
  { path: "/accounts", label: "Accounts", description: "Social and MMO account mapping." },
  { path: "/marketplace", label: "Marketplace", description: "Install and manage actor runtimes." },
  { path: "/schedule", label: "Schedule", description: "Cron-based run scheduling." },
  { path: "/runs", label: "Runs", description: "Execution logs and artifacts." },
  { path: "/team", label: "Team", description: "Roles and team administration." },
  { path: "/settings", label: "Settings", description: "Tokens, provider config, and preferences." },
];
