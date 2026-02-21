import fs from "node:fs/promises";
import path from "node:path";

import type {
  SecretSetting,
  SecretSettingKey,
} from "@mmo-claw/ipc";

const SECRET_DEFINITIONS: ReadonlyArray<{
  key: SecretSettingKey;
  account: string;
  label: string;
}> = [
  {
    key: "telegramBotToken",
    account: "telegram_bot_token",
    label: "Telegram Bot Token",
  },
  {
    key: "llmApiKey",
    account: "llm_api_key",
    label: "LLM API Key",
  },
] as const;

interface StoredSecretRecord {
  value: string;
  updatedAt: string;
}

interface KeytarLike {
  getPassword: (service: string, account: string) => Promise<string | null>;
  setPassword: (service: string, account: string, password: string) => Promise<void>;
  deletePassword: (service: string, account: string) => Promise<boolean>;
}

interface SafeStorageLike {
  isEncryptionAvailable: () => boolean;
  encryptString: (plainText: string) => Buffer;
  decryptString: (cipherText: Buffer) => string;
}

interface FilePayload {
  mode: "plain" | "encrypted";
  payload: Record<string, StoredSecretRecord> | string;
}

interface SecretBackend {
  get: (account: string) => Promise<StoredSecretRecord | null>;
  set: (account: string, record: StoredSecretRecord) => Promise<void>;
  remove: (account: string) => Promise<void>;
}

export interface DesktopSecretStoreOptions {
  filePath: string;
  serviceName?: string;
  keytar?: KeytarLike | null;
  safeStorageImpl?: SafeStorageLike;
  now?: () => Date;
}

export interface DesktopSecretStore {
  listSecretSettings: () => Promise<SecretSetting[]>;
  setSecretSetting: (
    key: SecretSettingKey,
    value: string,
  ) => Promise<SecretSetting>;
  clearSecretSetting: (key: SecretSettingKey) => Promise<SecretSetting>;
}

const createPlainSafeStorage = (): SafeStorageLike => {
  return {
    isEncryptionAvailable: () => false,
    encryptString: (plainText: string): Buffer => Buffer.from(plainText, "utf8"),
    decryptString: (cipherText: Buffer): string => cipherText.toString("utf8"),
  };
};

const toMaskedValue = (value: string): string => {
  if (value.length < 4) {
    return "********";
  }

  return `********${value.slice(-4)}`;
};

const toSecretSetting = (
  key: SecretSettingKey,
  record: StoredSecretRecord | null,
): SecretSetting => {
  const definition = SECRET_DEFINITIONS.find((candidate) => candidate.key === key);
  if (!definition) {
    throw new Error(`Unsupported secret key: ${key}`);
  }

  if (!record || !record.value) {
    return {
      key,
      label: definition.label,
      hasValue: false,
      maskedValue: null,
      updatedAt: null,
    };
  }

  return {
    key,
    label: definition.label,
    hasValue: true,
    maskedValue: toMaskedValue(record.value),
    updatedAt: record.updatedAt,
  };
};

const toStoredRecord = (
  value: string,
  now: () => Date,
): StoredSecretRecord => {
  return {
    value,
    updatedAt: now().toISOString(),
  };
};

const parseStoredRecord = (rawValue: string | null): StoredSecretRecord | null => {
  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<StoredSecretRecord>;
    if (typeof parsedValue.value === "string" && typeof parsedValue.updatedAt === "string") {
      return {
        value: parsedValue.value,
        updatedAt: parsedValue.updatedAt,
      };
    }
  } catch {
    return {
      value: rawValue,
      updatedAt: new Date(0).toISOString(),
    };
  }

  return null;
};

const createKeytarBackend = (
  serviceName: string,
  keytar: KeytarLike,
): SecretBackend => {
  return {
    async get(account) {
      const rawValue = await keytar.getPassword(serviceName, account);
      return parseStoredRecord(rawValue);
    },
    async set(account, record) {
      await keytar.setPassword(serviceName, account, JSON.stringify(record));
    },
    async remove(account) {
      await keytar.deletePassword(serviceName, account);
    },
  };
};

const createFileBackend = (
  filePath: string,
  safeStorageImpl: SafeStorageLike,
): SecretBackend => {
  const readRecords = async (): Promise<Record<string, StoredSecretRecord>> => {
    try {
      const fileContent = await fs.readFile(filePath, "utf8");
      const parsedPayload = JSON.parse(fileContent) as Partial<FilePayload>;
      if (!parsedPayload || (parsedPayload.mode !== "plain" && parsedPayload.mode !== "encrypted")) {
        return {};
      }

      if (parsedPayload.mode === "plain") {
        if (typeof parsedPayload.payload !== "object" || parsedPayload.payload === null) {
          return {};
        }

        return parsedPayload.payload as Record<string, StoredSecretRecord>;
      }

      if (typeof parsedPayload.payload !== "string") {
        return {};
      }

      if (!safeStorageImpl.isEncryptionAvailable()) {
        return {};
      }

      const decrypted = safeStorageImpl.decryptString(
        Buffer.from(parsedPayload.payload, "base64"),
      );
      const parsedDecrypted = JSON.parse(decrypted) as Record<string, StoredSecretRecord>;
      return parsedDecrypted;
    } catch {
      return {};
    }
  };

  const writeRecords = async (
    records: Record<string, StoredSecretRecord>,
  ): Promise<void> => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    if (safeStorageImpl.isEncryptionAvailable()) {
      const encryptedPayload = safeStorageImpl
        .encryptString(JSON.stringify(records))
        .toString("base64");
      const filePayload: FilePayload = {
        mode: "encrypted",
        payload: encryptedPayload,
      };
      await fs.writeFile(filePath, JSON.stringify(filePayload, null, 2), "utf8");
      return;
    }

    const filePayload: FilePayload = {
      mode: "plain",
      payload: records,
    };
    await fs.writeFile(filePath, JSON.stringify(filePayload, null, 2), "utf8");
  };

  return {
    async get(account) {
      const records = await readRecords();
      return records[account] ?? null;
    },
    async set(account, record) {
      const records = await readRecords();
      records[account] = record;
      await writeRecords(records);
    },
    async remove(account) {
      const records = await readRecords();
      delete records[account];
      await writeRecords(records);
    },
  };
};

const loadKeytar = async (): Promise<KeytarLike | null> => {
  const dynamicImport = new Function(
    "specifier",
    "return import(specifier);",
  ) as (specifier: string) => Promise<unknown>;

  try {
    const loadedModule = (await dynamicImport("keytar")) as
      | KeytarLike
      | { default?: KeytarLike };
    const candidate =
      "default" in loadedModule && loadedModule.default
        ? loadedModule.default
        : (loadedModule as KeytarLike);
    if (
      candidate &&
      typeof candidate.getPassword === "function" &&
      typeof candidate.setPassword === "function" &&
      typeof candidate.deletePassword === "function"
    ) {
      return candidate;
    }
    return null;
  } catch {
    return null;
  }
};

const loadElectronSafeStorage = async (): Promise<SafeStorageLike> => {
  const dynamicImport = new Function(
    "specifier",
    "return import(specifier);",
  ) as (specifier: string) => Promise<unknown>;

  try {
    const loadedModule = (await dynamicImport("electron")) as
      | { safeStorage?: SafeStorageLike; default?: { safeStorage?: SafeStorageLike } }
      | unknown;
    const asRecord =
      typeof loadedModule === "object" && loadedModule !== null
        ? (loadedModule as { safeStorage?: SafeStorageLike; default?: { safeStorage?: SafeStorageLike } })
        : null;
    const candidate =
      asRecord?.safeStorage ?? asRecord?.default?.safeStorage ?? null;
    if (
      candidate &&
      typeof candidate.isEncryptionAvailable === "function" &&
      typeof candidate.encryptString === "function" &&
      typeof candidate.decryptString === "function"
    ) {
      return candidate;
    }
  } catch {
    return createPlainSafeStorage();
  }

  return createPlainSafeStorage();
};

export const createDesktopSecretStore = (
  options: DesktopSecretStoreOptions,
): DesktopSecretStore => {
  const serviceName = options.serviceName ?? "mmo-claw.desktop";
  const now = options.now ?? (() => new Date());
  let backendPromise: Promise<SecretBackend> | null = null;

  const getDefinition = (key: SecretSettingKey) => {
    const definition = SECRET_DEFINITIONS.find((candidate) => candidate.key === key);
    if (!definition) {
      throw new Error(`Unsupported secret key: ${key}`);
    }
    return definition;
  };

  const getBackend = async (): Promise<SecretBackend> => {
    if (!backendPromise) {
      backendPromise = (async () => {
        const keytar = options.keytar ?? (await loadKeytar());
        if (keytar) {
          return createKeytarBackend(serviceName, keytar);
        }

        const safeStorageImpl =
          options.safeStorageImpl ?? (await loadElectronSafeStorage());
        return createFileBackend(options.filePath, safeStorageImpl);
      })();
    }

    return backendPromise;
  };

  return {
    listSecretSettings: async (): Promise<SecretSetting[]> => {
      const backend = await getBackend();
      const entries = await Promise.all(
        SECRET_DEFINITIONS.map(async (definition) => {
          const record = await backend.get(definition.account);
          return toSecretSetting(definition.key, record);
        }),
      );
      return entries;
    },
    setSecretSetting: async (
      key: SecretSettingKey,
      value: string,
    ): Promise<SecretSetting> => {
      const trimmedValue = value.trim();
      if (trimmedValue.length === 0) {
        throw new Error("Secret values cannot be empty.");
      }

      const backend = await getBackend();
      const definition = getDefinition(key);
      const record = toStoredRecord(trimmedValue, now);
      await backend.set(definition.account, record);
      return toSecretSetting(key, record);
    },
    clearSecretSetting: async (key: SecretSettingKey): Promise<SecretSetting> => {
      const backend = await getBackend();
      const definition = getDefinition(key);
      await backend.remove(definition.account);
      return toSecretSetting(key, null);
    },
  };
};
