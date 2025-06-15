import sqlite3 from 'sqlite3';
import { DatabaseConnection, QueryResult } from '../types/database';
import { DatabaseClient } from './factory';

export class SQLiteClient implements DatabaseClient {
  private db?: sqlite3.Database;

  constructor(private config: DatabaseConnection) {}

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.config.filename!, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  async query(sql: string): Promise<QueryResult> {
    if (!this.db) {
      throw new Error('Not connected to database');
    }

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      this.db!.all(sql, [], (err, rows) => {
        const executionTime = Date.now() - startTime;
        
        if (err) {
          reject(err);
        } else {
          const resultRows = (rows || []) as any[];
          const columns = resultRows.length > 0 ? Object.keys(resultRows[0]) : [];
          resolve({
            rows: resultRows,
            rowCount: resultRows.length,
            executionTime,
            columns
          });
        }
      });
    });
  }
}