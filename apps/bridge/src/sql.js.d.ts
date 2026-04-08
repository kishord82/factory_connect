declare module 'sql.js' {
  interface Database {
    run(sql: string, params?: unknown[]): void;
    exec(sql: string, params?: unknown[]): Array<{ columns: string[]; values: unknown[][] }>;
    export(): Uint8Array;
    close(): void;
  }

  interface SqlJsStatic {
    new (data?: ArrayLike<number>): Database;
  }

  function initSqlJs(): Promise<{ Database: new (data?: ArrayLike<number>) => Database }>;

  export = initSqlJs;
}
