export interface DatabaseConnection {
    id: string;
    name: string;
    type: 'mysql' | 'postgresql' | 'sqlite' | 'mongodb';
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    database?: string;
    filename?: string; // for SQLite
    uri?: string; // for MongoDB
    ssl?: boolean;
    createdAt: Date;
  }
  
  export interface QueryResult {
    rows: any[];
    rowCount: number;
    executionTime: number;
    columns?: string[];
  }