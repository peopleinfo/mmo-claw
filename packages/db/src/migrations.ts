import { getCoreMigrations } from "./schema";
import type { SqliteDatabase } from "./types";

export const applyMigrations = (database: SqliteDatabase): string[] => {
  database.exec(
    `
CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);
`,
  );

  const selectMigration = database.prepare<{ id: string }>(
    "SELECT id FROM schema_migrations WHERE id = ?",
  );
  const insertMigration = database.prepare(
    "INSERT INTO schema_migrations (id, applied_at) VALUES (?, datetime('now'))",
  );

  const applied: string[] = [];
  for (const migration of getCoreMigrations()) {
    const exists = selectMigration.get(migration.id);
    if (exists) {
      continue;
    }

    const runTransaction = database.transaction((sql: string, id: string) => {
      database.exec(sql);
      insertMigration.run(id);
    });

    runTransaction(migration.sql, migration.id);
    applied.push(migration.id);
  }

  return applied;
};
