import { POCKETPAW_FORK_MANIFEST } from "@mmo-claw/pocketpaw";

const normalizeBaseUrl = (url: string): string => {
  return url.replace(/\/+$/, "");
};

const envBaseUrl =
  typeof import.meta.env.VITE_POCKETPAW_BASE_URL === "string"
    ? import.meta.env.VITE_POCKETPAW_BASE_URL
    : "";

export const POCKETPAW_BASE_URL = normalizeBaseUrl(
  envBaseUrl || POCKETPAW_FORK_MANIFEST.localServiceUrl,
);
export const POCKETPAW_VIEW_URL = `${POCKETPAW_BASE_URL}/`;
export const POCKETPAW_API_DOCS_URL = `${POCKETPAW_BASE_URL}/api/v1/docs`;
