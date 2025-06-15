import { MongoClient, Db } from 'mongodb';
import { DatabaseConnection, QueryResult } from '../types/database';
import { DatabaseClient } from './factory';

export class MongoDBClient implements DatabaseClient {
  private client?: MongoClient;
  private db?: Db;

  constructor(private config: DatabaseConnection) {}

  async connect(): Promise<void> {
    this.client = new MongoClient(this.config.uri!);
    await this.client.connect();
    this.db = this.client.db();
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
    }
  }

  async query(command: string): Promise<QueryResult> {
    if (!this.db) {
      throw new Error('Not connected to database');
    }

    const startTime = Date.now();
    
    try {
      // Simple MongoDB query parser (you can extend this)
      let result;
      
      if (command.startsWith('db.')) {
        // Handle MongoDB shell-like commands
        const evalResult = eval(`this.db.${command.substring(3)}`);
        result = await evalResult.toArray();
      } else {
        throw new Error('MongoDB queries should start with "db."');
      }

      const executionTime = Date.now() - startTime;
      
      return {
        rows: result,
        rowCount: result.length,
        executionTime
      };
    } catch (error) {
      throw new Error(`MongoDB query error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}