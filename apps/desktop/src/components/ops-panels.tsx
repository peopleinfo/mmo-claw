import { useMemo, useState } from "react";

import * as UI from "../ui";
import { useOpsStore } from "../store/use-ops-store";

export const ProfilesPanel = (): JSX.Element => {
  const profiles = useOpsStore((state) => state.profiles);
  const addProfile = useOpsStore((state) => state.addProfile);
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("Asia/Phnom_Penh");

  return (
    <UI.Card>
      <UI.CardTitle>Profile Manager</UI.CardTitle>
      <UI.CardDescription>
        Create browser identity profiles used by actors and account routing.
      </UI.CardDescription>
      <div className="desktop-row">
        <UI.Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Profile name"
        />
        <UI.Input
          value={timezone}
          onChange={(event) => setTimezone(event.target.value)}
          placeholder="Timezone"
        />
        <UI.Button
          onClick={() => {
            if (!name.trim()) return;
            addProfile({ name: name.trim(), timezone: timezone.trim() || "UTC" });
            setName("");
          }}
        >
          Add Profile
        </UI.Button>
      </div>
      <ul className="desktop-list">
        {profiles.map((profile) => (
          <li key={profile.id}>
            <strong>{profile.name}</strong> · {profile.timezone} · {profile.id}
          </li>
        ))}
      </ul>
    </UI.Card>
  );
};

export const ProxiesPanel = (): JSX.Element => {
  const proxies = useOpsStore((state) => state.proxies);
  const addProxy = useOpsStore((state) => state.addProxy);
  const [label, setLabel] = useState("");
  const [endpoint, setEndpoint] = useState("");

  return (
    <UI.Card>
      <UI.CardTitle>Proxy Manager</UI.CardTitle>
      <UI.CardDescription>
        Store proxy endpoints for anti-detect browser sessions.
      </UI.CardDescription>
      <div className="desktop-row">
        <UI.Input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Proxy label"
        />
        <UI.Input
          value={endpoint}
          onChange={(event) => setEndpoint(event.target.value)}
          placeholder="http://user:pass@host:port"
        />
        <UI.Button
          onClick={() => {
            if (!label.trim() || !endpoint.trim()) return;
            addProxy({ label: label.trim(), endpoint: endpoint.trim() });
            setLabel("");
            setEndpoint("");
          }}
        >
          Add Proxy
        </UI.Button>
      </div>
      <ul className="desktop-list">
        {proxies.map((proxy) => (
          <li key={proxy.id}>
            <strong>{proxy.label}</strong> · {proxy.endpoint}
          </li>
        ))}
      </ul>
    </UI.Card>
  );
};

export const AccountsPanel = (): JSX.Element => {
  const accounts = useOpsStore((state) => state.accounts);
  const profiles = useOpsStore((state) => state.profiles);
  const proxies = useOpsStore((state) => state.proxies);
  const addAccount = useOpsStore((state) => state.addAccount);

  const [platform, setPlatform] = useState("instagram");
  const [username, setUsername] = useState("");
  const [profileId, setProfileId] = useState("");
  const [proxyId, setProxyId] = useState("");

  const canAdd = useMemo(
    () => Boolean(username.trim() && profileId && proxyId),
    [profileId, proxyId, username],
  );

  return (
    <UI.Card>
      <UI.CardTitle>Account Binding</UI.CardTitle>
      <UI.CardDescription>
        Bind platform account to a profile and proxy assignment.
      </UI.CardDescription>
      <div className="desktop-row">
        <UI.Input
          value={platform}
          onChange={(event) => setPlatform(event.target.value)}
          placeholder="instagram / tiktok / x"
        />
        <UI.Input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="@username"
        />
      </div>
      <div className="desktop-row">
        <UI.Select value={profileId} onValueChange={setProfileId}>
          <UI.SelectTrigger>
            <UI.SelectValue placeholder="Select profile" />
          </UI.SelectTrigger>
          <UI.SelectContent>
            {profiles.map((profile) => (
              <UI.SelectItem key={profile.id} value={profile.id}>
                {profile.name}
              </UI.SelectItem>
            ))}
          </UI.SelectContent>
        </UI.Select>
        <UI.Select value={proxyId} onValueChange={setProxyId}>
          <UI.SelectTrigger>
            <UI.SelectValue placeholder="Select proxy" />
          </UI.SelectTrigger>
          <UI.SelectContent>
            {proxies.map((proxy) => (
              <UI.SelectItem key={proxy.id} value={proxy.id}>
                {proxy.label}
              </UI.SelectItem>
            ))}
          </UI.SelectContent>
        </UI.Select>
        <UI.Button
          disabled={!canAdd}
          onClick={() => {
            if (!canAdd) return;
            addAccount({
              platform: platform.trim(),
              username: username.trim(),
              profileId,
              proxyId,
            });
            setUsername("");
          }}
        >
          Add Account
        </UI.Button>
      </div>
      <ul className="desktop-list">
        {accounts.map((account) => (
          <li key={account.id}>
            <strong>{account.platform}</strong> {account.username} · profile: {account.profileId} · proxy: {account.proxyId}
          </li>
        ))}
      </ul>
    </UI.Card>
  );
};

export const SchedulePanel = (): JSX.Element => {
  const schedules = useOpsStore((state) => state.schedules);
  const addSchedule = useOpsStore((state) => state.addSchedule);
  const toggleSchedule = useOpsStore((state) => state.toggleSchedule);

  const [name, setName] = useState("");
  const [cron, setCron] = useState("0 */6 * * *");
  const [command, setCommand] = useState("/ig-post profile-main /tmp/post.jpg | publish now");

  return (
    <UI.Card>
      <UI.CardTitle>Schedule Queue</UI.CardTitle>
      <UI.CardDescription>
        Define cron triggers for automation commands.
      </UI.CardDescription>
      <div className="desktop-row">
        <UI.Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Schedule name"
        />
        <UI.Input
          value={cron}
          onChange={(event) => setCron(event.target.value)}
          placeholder="Cron expression"
        />
      </div>
      <div className="desktop-row">
        <UI.Input
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          placeholder="Command"
        />
        <UI.Button
          onClick={() => {
            if (!name.trim() || !cron.trim() || !command.trim()) return;
            addSchedule({
              name: name.trim(),
              cron: cron.trim(),
              command: command.trim(),
              enabled: true,
            });
            setName("");
          }}
        >
          Add Schedule
        </UI.Button>
      </div>
      <ul className="desktop-list">
        {schedules.map((schedule) => (
          <li key={schedule.id}>
            <strong>{schedule.name}</strong> · {schedule.cron} · {schedule.enabled ? "enabled" : "disabled"}
            <UI.Button
              variant="ghost"
              onClick={() => toggleSchedule(schedule.id)}
            >
              Toggle
            </UI.Button>
          </li>
        ))}
      </ul>
    </UI.Card>
  );
};

export const TeamPanel = (): JSX.Element => {
  const teamMembers = useOpsStore((state) => state.teamMembers);
  const addTeamMember = useOpsStore((state) => state.addTeamMember);
  const [name, setName] = useState("");
  const [role, setRole] = useState<"admin" | "editor" | "viewer">("editor");

  return (
    <UI.Card>
      <UI.CardTitle>Team Manager</UI.CardTitle>
      <UI.CardDescription>
        Manage access roles for desktop and remote operations.
      </UI.CardDescription>
      <div className="desktop-row">
        <UI.Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Member name"
        />
        <UI.Select value={role} onValueChange={(value) => setRole(value as "admin" | "editor" | "viewer")}>
          <UI.SelectTrigger>
            <UI.SelectValue placeholder="Role" />
          </UI.SelectTrigger>
          <UI.SelectContent>
            <UI.SelectItem value="admin">admin</UI.SelectItem>
            <UI.SelectItem value="editor">editor</UI.SelectItem>
            <UI.SelectItem value="viewer">viewer</UI.SelectItem>
          </UI.SelectContent>
        </UI.Select>
        <UI.Button
          onClick={() => {
            if (!name.trim()) return;
            addTeamMember({ name: name.trim(), role });
            setName("");
          }}
        >
          Add Member
        </UI.Button>
      </div>
      <ul className="desktop-list">
        {teamMembers.map((member) => (
          <li key={member.id}>
            <strong>{member.name}</strong> · {member.role}
          </li>
        ))}
      </ul>
    </UI.Card>
  );
};
