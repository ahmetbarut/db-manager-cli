import { DatabaseClient } from '../database/factory';

export interface AutocompleteData {
  keywords: string[];
  tables: string[];
  columns: string[];
  functions: string[];
}

export class AutocompleteProvider {
  private data: AutocompleteData = {
    keywords: [],
    tables: [],
    columns: [],
    functions: []
  };

  constructor(private dbType: string, private client?: DatabaseClient) {
    this.loadKeywords();
  }

  private loadKeywords(): void {
    const commonKeywords = [
      'SELECT', 'FROM', 'WHERE', 'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT',
      'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM',
      'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'CREATE INDEX',
      'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN', 'ON',
      'UNION', 'UNION ALL', 'DISTINCT', 'AS', 'AND', 'OR', 'NOT',
      'IN', 'LIKE', 'BETWEEN', 'IS NULL', 'IS NOT NULL',
      'EXISTS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END'
    ];

    const sqlFunctions = [
      'COUNT(*)', 'COUNT()', 'SUM()', 'AVG()', 'MIN()', 'MAX()',
      'CONCAT()', 'SUBSTRING()', 'UPPER()', 'LOWER()', 'TRIM()',
      'NOW()', 'CURRENT_DATE', 'CURRENT_TIME', 'CURRENT_TIMESTAMP',
      'LENGTH()', 'COALESCE()', 'NULLIF()', 'ISNULL()'
    ];

    const mongoKeywords = [
      'db.', '.find()', '.findOne()', '.insertOne()', '.insertMany()',
      '.updateOne()', '.updateMany()', '.deleteOne()', '.deleteMany()',
      '.aggregate()', '.count()', '.distinct()', '.createIndex()',
      '$match', '$group', '$sort', '$limit', '$skip', '$project',
      '$unwind', '$lookup', '$addFields', '$replaceRoot',
      '$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin',
      '$and', '$or', '$not', '$nor', '$exists', '$type', '$regex'
    ];

    if (this.dbType === 'mongodb') {
      this.data.keywords = [...commonKeywords, ...mongoKeywords];
    } else {
      this.data.keywords = [...commonKeywords];
      this.data.functions = sqlFunctions;
    }

    // Add database-specific keywords
    switch (this.dbType) {
      case 'mysql':
        this.data.keywords.push(
          'AUTO_INCREMENT', 'UNSIGNED', 'ZEROFILL', 'BINARY',
          'SHOW TABLES', 'SHOW DATABASES', 'DESCRIBE', 'EXPLAIN'
        );
        break;
      case 'postgresql':
        this.data.keywords.push(
          'SERIAL', 'BIGSERIAL', 'RETURNING', 'ILIKE', 'SIMILAR TO',
          'ARRAY', 'JSONB', 'UUID', 'GENERATE_SERIES'
        );
        break;
      case 'sqlite':
        this.data.keywords.push(
          'AUTOINCREMENT', 'WITHOUT ROWID', 'PRAGMA',
          'ATTACH DATABASE', 'DETACH DATABASE'
        );
        break;
    }
  }

  async loadTableNames(): Promise<void> {
    if (!this.client) return;

    try {
      let query = '';
      switch (this.dbType) {
        case 'mysql':
          query = 'SHOW TABLES';
          break;
        case 'postgresql':
          query = "SELECT tablename FROM pg_tables WHERE schemaname = 'public'";
          break;
        case 'sqlite':
          query = "SELECT name FROM sqlite_master WHERE type='table'";
          break;
        case 'mongodb':
          // MongoDB collections are handled differently
          return;
      }

      const result = await this.client.query(query);
      if (result.rows) {
        this.data.tables = result.rows.map((row: any) => Object.values(row)[0] as string);
      }
    } catch (error) {
      console.warn('Failed to load table names for autocomplete:', error);
    }
  }

  async loadColumnNames(tableName: string): Promise<string[]> {
    if (!this.client || !tableName) return [];

    try {
      let query = '';
      switch (this.dbType) {
        case 'mysql':
          query = `DESCRIBE ${tableName}`;
          break;
        case 'postgresql':
          query = `SELECT column_name FROM information_schema.columns WHERE table_name = '${tableName}'`;
          break;
        case 'sqlite':
          query = `PRAGMA table_info(${tableName})`;
          break;
        case 'mongodb':
          return [];
      }

      const result = await this.client.query(query);
      if (result.rows) {
        return result.rows.map((row: any) => {
          if (this.dbType === 'mysql') return row.Field;
          if (this.dbType === 'postgresql') return row.column_name;
          if (this.dbType === 'sqlite') return row.name;
          return Object.values(row)[0] as string;
        });
      }
    } catch (error) {
      console.warn(`Failed to load columns for table ${tableName}:`, error);
    }

    return [];
  }

  getSuggestions(input: string): string[] {
    const suggestions: string[] = [];
    const inputLower = input.toLowerCase();
    const inputUpper = input.toUpperCase();

    // Match keywords
    this.data.keywords.forEach(keyword => {
      if (keyword.toLowerCase().includes(inputLower)) {
        suggestions.push(keyword);
      }
    });

    // Match functions
    this.data.functions.forEach(func => {
      if (func.toLowerCase().includes(inputLower)) {
        suggestions.push(func);
      }
    });

    // Match table names
    this.data.tables.forEach(table => {
      if (table.toLowerCase().includes(inputLower)) {
        suggestions.push(table);
      }
    });

    // Smart suggestions based on context
    const words = input.split(/\s+/);
    const lastWord = words[words.length - 1]?.toLowerCase() || '';
    const secondLastWord = words[words.length - 2]?.toLowerCase() || '';

    // Suggest table names after FROM, JOIN, UPDATE, INTO
    if (['from', 'join', 'update', 'into'].includes(secondLastWord)) {
      this.data.tables.forEach(table => {
        if (table.toLowerCase().startsWith(lastWord)) {
          suggestions.push(table);
        }
      });
    }

    // Suggest WHERE after table name
    if (this.data.tables.some(table => table.toLowerCase() === secondLastWord) && !lastWord) {
      suggestions.push('WHERE');
    }

    // Suggest common patterns
    if (inputLower.includes('select') && !inputLower.includes('from')) {
      suggestions.push('* FROM');
      suggestions.push('COUNT(*) FROM');
    }

    if (inputLower.includes('where') && !inputLower.includes('order')) {
      suggestions.push('ORDER BY');
      suggestions.push('GROUP BY');
      suggestions.push('LIMIT');
    }

    // Remove duplicates and sort
    const uniqueSuggestions = [...new Set(suggestions)];
    return uniqueSuggestions
      .sort((a, b) => {
        // Prioritize exact matches at the beginning
        const aStarts = a.toLowerCase().startsWith(inputLower);
        const bStarts = b.toLowerCase().startsWith(inputLower);
        
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        
        return a.length - b.length;
      })
      .slice(0, 10); // Limit to 10 suggestions
  }

  getQuickSuggestions(): string[] {
    const quick = [
      'SELECT * FROM',
      'SELECT COUNT(*) FROM',
      'INSERT INTO',
      'UPDATE',
      'DELETE FROM',
      'CREATE TABLE',
      'ALTER TABLE',
      'DROP TABLE'
    ];

    if (this.dbType === 'mongodb') {
      return [
        'db.collection.find()',
        'db.collection.findOne()',
        'db.collection.insertOne()',
        'db.collection.updateOne()',
        'db.collection.deleteOne()',
        'db.collection.aggregate()',
        'db.collection.count()',
        'db.collection.distinct()'
      ];
    }

    return quick;
  }

  getTableSuggestions(): string[] {
    return this.data.tables;
  }
} 