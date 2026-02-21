import { create } from "zustand";

export interface ProfileItem {
  id: string;
  name: string;
  timezone: string;
}

export interface ProxyItem {
  id: string;
  label: string;
  endpoint: string;
}

export interface AccountItem {
  id: string;
  platform: string;
  username: string;
  profileId: string;
  proxyId: string;
}

export interface ScheduleItem {
  id: string;
  name: string;
  cron: string;
  command: string;
  enabled: boolean;
}

export interface TeamMemberItem {
  id: string;
  name: string;
  role: "admin" | "editor" | "viewer";
}

interface OpsStore {
  profiles: ProfileItem[];
  proxies: ProxyItem[];
  accounts: AccountItem[];
  schedules: ScheduleItem[];
  teamMembers: TeamMemberItem[];
  addProfile: (input: Omit<ProfileItem, "id">) => void;
  addProxy: (input: Omit<ProxyItem, "id">) => void;
  addAccount: (input: Omit<AccountItem, "id">) => void;
  addSchedule: (input: Omit<ScheduleItem, "id">) => void;
  toggleSchedule: (id: string) => void;
  addTeamMember: (input: Omit<TeamMemberItem, "id">) => void;
}

const makeId = (prefix: string): string =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

export const useOpsStore = create<OpsStore>((set) => ({
  profiles: [
    {
      id: "profile-main",
      name: "Main Creator",
      timezone: "Asia/Phnom_Penh",
    },
  ],
  proxies: [
    {
      id: "proxy-home",
      label: "Home IP",
      endpoint: "http://127.0.0.1:8080",
    },
  ],
  accounts: [],
  schedules: [],
  teamMembers: [
    {
      id: "member-owner",
      name: "Owner",
      role: "admin",
    },
  ],
  addProfile: (input) =>
    set((state) => ({
      profiles: [...state.profiles, { ...input, id: makeId("profile") }],
    })),
  addProxy: (input) =>
    set((state) => ({
      proxies: [...state.proxies, { ...input, id: makeId("proxy") }],
    })),
  addAccount: (input) =>
    set((state) => ({
      accounts: [...state.accounts, { ...input, id: makeId("acct") }],
    })),
  addSchedule: (input) =>
    set((state) => ({
      schedules: [...state.schedules, { ...input, id: makeId("schedule") }],
    })),
  toggleSchedule: (id) =>
    set((state) => ({
      schedules: state.schedules.map((schedule) =>
        schedule.id === id
          ? { ...schedule, enabled: !schedule.enabled }
          : schedule,
      ),
    })),
  addTeamMember: (input) =>
    set((state) => ({
      teamMembers: [...state.teamMembers, { ...input, id: makeId("member") }],
    })),
}));
