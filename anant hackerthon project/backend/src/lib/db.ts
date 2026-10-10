import mysql, { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { config } from './config';

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  insertId?: number;
}

export interface DbClient {
  query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
}

export type PoolClient = DbClient;

let poolInstance: Pool | null = null;

function parseDatabaseConfig(): mysql.PoolOptions {
  if (config.databaseUrl && (config.databaseUrl.startsWith('mysql://') || config.databaseUrl.startsWith('mysql2://'))) {
    try {
      const url = new URL(config.databaseUrl);
      return {
        host: url.hostname || config.mysqlHost,
        port: parseInt(url.port || String(config.mysqlPort), 10),
        user: decodeURIComponent(url.username || config.mysqlUser),
        password: decodeURIComponent(url.password || config.mysqlPassword),
        database: url.pathname.replace(/^\//, '') || config.mysqlDatabase,
        waitForConnections: true,
        connectionLimit: 20,
        queueLimit: 0,
        decimalNumbers: true,
        multipleStatements: true,
      };
    } catch {
      // Fallback below
    }
  }

  return {
    host: config.mysqlHost,
    port: config.mysqlPort,
    user: config.mysqlUser,
    password: config.mysqlPassword,
    database: config.mysqlDatabase,
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0,
    decimalNumbers: true,
    multipleStatements: true,
  };
}

export function getPool(): Pool {
  if (!poolInstance) {
    poolInstance = mysql.createPool(parseDatabaseConfig());
  }
  return poolInstance;
}

/**
 * Translates PostgreSQL-style parameterized queries ($1, $2, ...) and type casts (::type)
 * into MySQL-compatible queries with ? placeholders.
 */
export function translateSql(text: string, params?: any[]): { sql: string; values: any[] } {
  if (!params || params.length === 0) {
    // Strip common postgres-specific type casts
    const cleanedSql = text.replace(/::(text|jsonb|json|integer|int|boolean|numeric|timestamptz|interval)/gi, '');
    return { sql: cleanedSql, values: [] };
  }

  const values: any[] = [];
  const hasPgPlaceholders = /\$\d+/.test(text);

  let transformedSql = text;

  if (hasPgPlaceholders) {
    transformedSql = text.replace(/\$(\d+)(::[a-zA-Z0-9_]+)?/g, (_, indexStr) => {
      const idx = parseInt(indexStr, 10) - 1;
      if (idx >= 0 && idx < params.length) {
        values.push(params[idx]);
      } else {
        values.push(undefined);
      }
      return '?';
    });
  } else {
    values.push(...params);
  }

  // Strip type casts if any remain
  transformedSql = transformedSql.replace(/::(text|jsonb|json|integer|int|boolean|numeric|timestamptz|interval)/gi, '');

  return { sql: transformedSql, values };
}

export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const pool = getPool();
  const start = Date.now();
  const { sql, values } = translateSql(text, params);

  try {
    const [result] = await pool.query(sql, values);

    if (Array.isArray(result)) {
      return {
        rows: result as unknown as T[],
        rowCount: (result as RowDataPacket[]).length,
      };
    }

    const header = result as ResultSetHeader;
    return {
      rows: [],
      rowCount: header.affectedRows || 0,
      insertId: header.insertId,
    };
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`MySQL query error (${duration}ms):`, { sql, error });
    throw error;
  }
}

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const connection = await pool.getConnection();

  const client: DbClient = {
    async query<R = any>(text: string, params?: any[]): Promise<QueryResult<R>> {
      const { sql, values } = translateSql(text, params);
      const [result] = await connection.query(sql, values);

      if (Array.isArray(result)) {
        return {
          rows: result as unknown as R[],
          rowCount: (result as RowDataPacket[]).length,
        };
      }

      const header = result as ResultSetHeader;
      return {
        rows: [],
        rowCount: header.affectedRows || 0,
        insertId: header.insertId,
      };
    },
  };

  try {
    await connection.beginTransaction();
    const result = await callback(client);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function closePool(): Promise<void> {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
  }
}
