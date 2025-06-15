import fs from 'fs';
import path from 'path';
import os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.dbcli');
const HISTORY_FILE = path.join(CONFIG_DIR, 'query_history.json');

export interface QueryHistoryEntry {
  id: string;
  query: string;
  connectionId: string;
  connectionName: string;
  executedAt: Date;
  executionTime?: number;
  success: boolean;
  error?: string;
}

export class QueryHistory {
  private static instance: QueryHistory;
  private history: QueryHistoryEntry[] = [];
  private maxEntries = 1000;

  private constructor() {
    this.loadHistory();
  }

  static getInstance(): QueryHistory {
    if (!QueryHistory.instance) {
      QueryHistory.instance = new QueryHistory();
    }
    return QueryHistory.instance;
  }

  private ensureConfigDir(): void {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
  }

  private loadHistory(): void {
    this.ensureConfigDir();
    if (fs.existsSync(HISTORY_FILE)) {
      try {
        const data = fs.readFileSync(HISTORY_FILE, 'utf8');
        this.history = JSON.parse(data).map((entry: any) => ({
          ...entry,
          executedAt: new Date(entry.executedAt)
        }));
      } catch (error) {
        console.warn('Failed to load query history:', error);
        this.history = [];
      }
    }
  }

  private saveHistory(): void {
    this.ensureConfigDir();
    try {
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(this.history, null, 2));
    } catch (error) {
      console.warn('Failed to save query history:', error);
    }
  }

  addQuery(
    query: string, 
    connectionId: string, 
    connectionName: string, 
    success: boolean, 
    executionTime?: number, 
    error?: string
  ): void {
    const entry: QueryHistoryEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      query: query.trim(),
      connectionId,
      connectionName,
      executedAt: new Date(),
      executionTime,
      success,
      error
    };

    this.history.unshift(entry);
    
    // Keep only the latest entries
    if (this.history.length > this.maxEntries) {
      this.history = this.history.slice(0, this.maxEntries);
    }

    this.saveHistory();
  }

  getHistory(connectionId?: string, limit: number = 50): QueryHistoryEntry[] {
    let filtered = this.history;
    
    if (connectionId) {
      filtered = this.history.filter(entry => entry.connectionId === connectionId);
    }
    
    return filtered.slice(0, limit);
  }

  getRecentQueries(connectionId?: string, limit: number = 10): string[] {
    const entries = this.getHistory(connectionId, limit);
    const uniqueQueries = new Set<string>();
    
    entries.forEach(entry => {
      if (entry.success && entry.query.length > 0) {
        uniqueQueries.add(entry.query);
      }
    });
    
    return Array.from(uniqueQueries);
  }

  searchHistory(searchTerm: string, connectionId?: string, limit: number = 20): QueryHistoryEntry[] {
    let filtered = this.history;
    
    if (connectionId) {
      filtered = this.history.filter(entry => entry.connectionId === connectionId);
    }
    
    return filtered
      .filter(entry => 
        entry.query.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .slice(0, limit);
  }

  clearHistory(connectionId?: string): void {
    if (connectionId) {
      this.history = this.history.filter(entry => entry.connectionId !== connectionId);
    } else {
      this.history = [];
    }
    
    this.saveHistory();
  }

  getStats(connectionId?: string): {
    totalQueries: number;
    successfulQueries: number;
    failedQueries: number;
    averageExecutionTime: number;
  } {
    let entries = this.history;
    
    if (connectionId) {
      entries = this.history.filter(entry => entry.connectionId === connectionId);
    }
    
    const totalQueries = entries.length;
    const successfulQueries = entries.filter(entry => entry.success).length;
    const failedQueries = totalQueries - successfulQueries;
    
    const executionTimes = entries
      .filter(entry => entry.executionTime !== undefined)
      .map(entry => entry.executionTime!);
    
    const averageExecutionTime = executionTimes.length > 0
      ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length
      : 0;
    
    return {
      totalQueries,
      successfulQueries,
      failedQueries,
      averageExecutionTime: Math.round(averageExecutionTime)
    };
  }
}