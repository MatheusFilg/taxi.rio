import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST ?? 'localhost',
      port: Number(process.env.MYSQL_PORT ?? 3306),
      user: process.env.MYSQL_USER ?? 'taxi',
      password: process.env.MYSQL_PASSWORD ?? 'taxi',
      database: process.env.MYSQL_DATABASE ?? 'taxi',
      waitForConnections: true,
      connectionLimit: 10,
    });
  }
  return pool;
}

export interface CorridaRow {
  id: number;
  passageiro_id: string;
  origem: string;
  destino: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export function rowToJson(row: CorridaRow) {
  return {
    id: row.id,
    passageiro_id: row.passageiro_id,
    origem: row.origem,
    destino: row.destino,
    status: row.status,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}
