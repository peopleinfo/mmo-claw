import { z } from "zod";

import type { SqliteDatabase } from "../types";

export const profileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  fingerprintJson: z.string().min(2),
  timezone: z.string().optional(),
});

export type ProfileRecord = z.infer<typeof profileSchema>;

export interface ProfileRepository {
  upsert: (profile: ProfileRecord) => void;
  list: () => ProfileRecord[];
}

export const createProfileRepository = (database: SqliteDatabase): ProfileRepository => {
  const upsertStatement = database.prepare(
    `
INSERT INTO profiles (id, name, fingerprint_json, timezone, created_at, updated_at)
VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
ON CONFLICT(id) DO UPDATE SET
  name = excluded.name,
  fingerprint_json = excluded.fingerprint_json,
  timezone = excluded.timezone,
  updated_at = datetime('now');
`,
  );

  const listStatement = database.prepare<ProfileRecord>(
    `
SELECT id, name, fingerprint_json AS fingerprintJson, timezone
FROM profiles
ORDER BY created_at DESC;
`,
  );

  return {
    upsert(profile) {
      const validProfile = profileSchema.parse(profile);
      upsertStatement.run(
        validProfile.id,
        validProfile.name,
        validProfile.fingerprintJson,
        validProfile.timezone ?? null,
      );
    },
    list() {
      return listStatement.all();
    },
  };
};
