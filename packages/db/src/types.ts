export interface SqlMigration {
  id: string;
  sql: string;
}

export interface PreparedStatement<TResult = unknown> {
  all: (...params: unknown[]) => TResult[];
  get: (...params: unknown[]) => TResult | undefined;
  run: (...params: unknown[]) => { changes: number };
}

export interface SqliteDatabase {
  exec: (sql: string) => void;
  prepare: <TResult = unknown>(sql: string) => PreparedStatement<TResult>;
  transaction: <TArgs extends unknown[], TResult>(
    handler: (...args: TArgs) => TResult,
  ) => (...args: TArgs) => TResult;
}
