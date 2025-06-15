import mysql from 'mysql2/promise';
import { DatabaseConnection, QueryResult } from '../types/database';
import { DatabaseClient } from './factory';

export class MySQLClient implements DatabaseClient {
  private connection?: mysql.Connection;

  constructor(private config: DatabaseConnection) {}

  async connect(): Promise<void> {
    this.connection = await mysql.createConnection({
      host: this.config.host,
      port: this.config.port,
      user: this.config.username,
      password: this.config.password,
      database: this.config.database,
      ssl: this.config.ssl ? {
        rejectUnauthorized: false
      } : undefined
    });
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
    }
  }

  async query(sql: string): Promise<QueryResult> {
    if (!this.connection) {
      throw new Error('Not connected to database');
    }

    const startTime = Date.now();
    const [rows, fields] = await this.connection.execute(sql);
    const executionTime = Date.now() - startTime;

    const result = Array.isArray(rows) ? rows : [];
    const columns = fields ? fields.map(field => field.name) : [];

    return {
      rows: result,
      rowCount: result.length,
      executionTime,
      columns
    };
  }
}