import fs from "node:fs";
import path from "node:path";

export interface DatabaseHealth {
  databaseReady: boolean;
  reason: string;
}

export const checkDatabaseHealth = (databasePath: string): DatabaseHealth => {
  const directory = path.dirname(databasePath);
  const exists = fs.existsSync(directory);

  if (!exists) {
    return {
      databaseReady: false,
      reason: `Database directory does not exist: ${directory}`,
    };
  }

  return {
    databaseReady: true,
    reason: `Database directory is available: ${directory}`,
  };
};
