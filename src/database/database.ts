import { DatabaseConnection, QueryResult } from '../types/database';
import { MySQLClient } from './mysql';
import { PostgreSQLClient } from './postgresql';
import { SQLiteClient } from './sqlite';
import { MongoDBClient } from './mongodb';

export interface DatabaseClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  query(sql: string): Promise<QueryResult>;
}

export function createDatabaseClient(connection: DatabaseConnection): DatabaseClient {
  switch (connection.type) {
    case 'mysql':
      return new MySQLClient(connection);
    case 'postgresql':
      return new PostgreSQLClient(connection);
    case 'sqlite':
      return new SQLiteClient(connection);
    case 'mongodb':
      return new MongoDBClient(connection);
    default:
      throw new Error(`Unsupported database type: ${connection.type}`);
  }
}

export async function testConnection(connection: DatabaseConnection): Promise<void> {
  const client = createDatabaseClient(connection);
  await client.connect();
  await client.disconnect();
}