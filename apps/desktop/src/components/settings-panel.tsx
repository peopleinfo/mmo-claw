import { useEffect, useState } from "react";

import type { SecretSetting, SecretSettingKey } from "@mmo-claw/ipc";
import * as UI from "@mmo-claw/ui";

const EMPTY_DRAFTS: Record<SecretSettingKey, string> = {
  telegramBotToken: "",
  llmApiKey: "",
};

export const SettingsPanel = (): JSX.Element => {
  const [entries, setEntries] = useState<SecretSetting[]>([]);
  const [drafts, setDrafts] = useState<Record<SecretSettingKey, string>>(EMPTY_DRAFTS);
  const [statusMessage, setStatusMessage] = useState("Loading secret settings...");
  const [busyKey, setBusyKey] = useState<SecretSettingKey | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      const response = await window.desktopApi.listSecretSettings();
      if (!response.ok) {
        setStatusMessage(`Unable to load settings: ${response.error.message}`);
        return;
      }

      setEntries(response.data);
      setStatusMessage("Secret settings loaded.");
    };

    void loadSettings();
  }, []);

  const upsertEntry = (nextEntry: SecretSetting): void => {
    setEntries((currentEntries) =>
      currentEntries.map((entry) => (entry.key === nextEntry.key ? nextEntry : entry)),
    );
  };

  const saveSecretSetting = async (key: SecretSettingKey): Promise<void> => {
    const value = drafts[key]?.trim() ?? "";
    if (!value) {
      setStatusMessage("Enter a value before saving.");
      return;
    }

    setBusyKey(key);
    const response = await window.desktopApi.setSecretSetting({
      key,
      value,
    });
    setBusyKey(null);

    if (!response.ok) {
      setStatusMessage(response.error.message);
      return;
    }

    upsertEntry(response.data);
    setDrafts((currentDrafts) => ({
      ...currentDrafts,
      [key]: "",
    }));
    setStatusMessage(`${response.data.label} saved.`);
  };

  const clearSecretSetting = async (key: SecretSettingKey): Promise<void> => {
    setBusyKey(key);
    const response = await window.desktopApi.clearSecretSetting({ key });
    setBusyKey(null);

    if (!response.ok) {
      setStatusMessage(response.error.message);
      return;
    }

    upsertEntry(response.data);
    setStatusMessage(`${response.data.label} cleared.`);
  };

  return (
    <UI.Card>
      <UI.CardTitle>Secret Storage</UI.CardTitle>
      <UI.CardDescription>{statusMessage}</UI.CardDescription>
      <div className="settings-panel">
        {entries.map((entry) => (
          <section key={entry.key} className="settings-panel__item">
            <header>
              <h3 className="settings-panel__title">{entry.label}</h3>
              <p className="desktop-muted">
                Stored: {entry.maskedValue ?? "Not configured"}
              </p>
            </header>
            <input
              className="settings-panel__input"
              type="password"
              value={drafts[entry.key] ?? ""}
              onChange={(event) =>
                setDrafts((currentDrafts) => ({
                  ...currentDrafts,
                  [entry.key]: event.target.value,
                }))
              }
              placeholder={
                entry.hasValue
                  ? "Enter a new value to replace current secret"
                  : "Enter value"
              }
            />
            <div className="desktop-row">
              <UI.Button
                onClick={() => void saveSecretSetting(entry.key)}
                disabled={busyKey === entry.key}
              >
                Save
              </UI.Button>
              <UI.Button
                variant="outline"
                onClick={() => void clearSecretSetting(entry.key)}
                disabled={!entry.hasValue || busyKey === entry.key}
              >
                Clear
              </UI.Button>
            </div>
          </section>
        ))}
      </div>
    </UI.Card>
  );
};
