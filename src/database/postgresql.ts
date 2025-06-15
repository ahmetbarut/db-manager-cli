import { Client } from 'pg';
import { DatabaseConnection, QueryResult } from '../types/database';
import { DatabaseClient } from './factory';

export class PostgreSQLClient implements DatabaseClient {
  private client: Client;

  constructor(private config: DatabaseConnection) {
    this.client = new Client({
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

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    await this.client.end();
  }

  async query(sql: string): Promise<QueryResult> {
    const startTime = Date.now();
    const result = await this.client.query(sql);
    const executionTime = Date.now() - startTime;

    return {
      rows: result.rows,
      rowCount: result.rowCount || 0,
      executionTime,
      columns: result.fields.map(field => field.name)
    };
  }
}