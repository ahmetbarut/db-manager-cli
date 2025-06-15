import chalk from 'chalk';

// Check if colors are supported
function supportsColor(): boolean {
  return chalk.level > 0;
}

// Fallback function for terminals that don't support colors
function formatWithoutColors(text: string, prefix: string = ''): string {
  return prefix ? `${prefix}${text}` : text;
}

const SQL_KEYWORDS = [
  // DQL
  'SELECT', 'FROM', 'WHERE', 'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET',
  'DISTINCT', 'AS', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'ON',
  'UNION', 'INTERSECT', 'EXCEPT', 'ALL', 'EXISTS', 'IN', 'BETWEEN', 'LIKE', 'ILIKE',
  
  // DML
  'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'MERGE', 'UPSERT',
  
  // DDL
  'CREATE', 'TABLE', 'DATABASE', 'SCHEMA', 'INDEX', 'VIEW', 'ALTER', 'DROP', 'TRUNCATE',
  'ADD', 'COLUMN', 'CONSTRAINT', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES',
  'UNIQUE', 'CHECK', 'DEFAULT', 'NOT', 'NULL', 'AUTO_INCREMENT',
  
  // DCL & TCL
  'GRANT', 'REVOKE', 'COMMIT', 'ROLLBACK', 'SAVEPOINT', 'BEGIN', 'TRANSACTION',
  
  // Data Types
  'INT', 'INTEGER', 'VARCHAR', 'CHAR', 'TEXT', 'DATE', 'DATETIME', 'TIMESTAMP',
  'BOOLEAN', 'BOOL', 'DECIMAL', 'NUMERIC', 'FLOAT', 'DOUBLE', 'REAL',
  'BIGINT', 'SMALLINT', 'TINYINT', 'SERIAL', 'UUID', 'JSON', 'JSONB',
  
  // Functions
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'CONCAT', 'SUBSTRING', 'SUBSTR', 
  'UPPER', 'LOWER', 'TRIM', 'LENGTH', 'COALESCE', 'ISNULL', 'NULLIF',
  'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'IF', 'IFNULL',
  
  // Logical
  'AND', 'OR', 'XOR', 'IS', 'TRUE', 'FALSE', 'UNKNOWN'
];

const SQL_FUNCTIONS = [
  'NOW', 'CURRENT_TIMESTAMP', 'CURRENT_DATE', 'CURRENT_TIME',
  'DATE_FORMAT', 'STR_TO_DATE', 'YEAR', 'MONTH', 'DAY',
  'HOUR', 'MINUTE', 'SECOND', 'DAYOFWEEK', 'WEEKDAY',
  'REPLACE', 'REGEXP', 'MATCH', 'AGAINST', 'SOUNDEX'
];

export function highlightSQL(query: string): string {
  if (!query || typeof query !== 'string') return query;
  
  try {
    let highlighted = query;
    const colorSupport = supportsColor();
    
    // Highlight keywords (case insensitive)
    SQL_KEYWORDS.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      highlighted = highlighted.replace(regex, (match) => {
        const upperMatch = match.toUpperCase();
        return colorSupport ? chalk.blue(upperMatch) : `[${upperMatch}]`;
      });
    });

    // Highlight functions
    SQL_FUNCTIONS.forEach(func => {
      const regex = new RegExp(`\\b${func}\\s*\\(`, 'gi');
      highlighted = highlighted.replace(regex, (match) => {
        const upperMatch = match.toUpperCase();
        return colorSupport ? chalk.magenta(upperMatch) : upperMatch;
      });
    });
    
    // Highlight strings (single quotes)
    highlighted = highlighted.replace(/'([^'\\]*(\\.[^'\\]*)*)'/g, (match) => {
      return colorSupport ? chalk.green(match) : `"${match}"`;
    });
    
    // Highlight strings (double quotes)
    highlighted = highlighted.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match) => {
      return colorSupport ? chalk.green(match) : match;
    });
    
    // Highlight numbers
    highlighted = highlighted.replace(/\b\d+(\.\d+)?\b/g, (match) => {
      return colorSupport ? chalk.yellow(match) : match;
    });

    // Highlight operators (simplified)
    if (colorSupport) {
      highlighted = highlighted.replace(/(\s|^)(=|!=|<>|<=|>=|<|>)(\s|$)/g, (match, before, op, after) => {
        return before + chalk.red(op) + after;
      });
    }
    
    return highlighted;
    
  } catch (error) {
    return query;
  }
}

export function highlightMongoDB(query: string): string {
  if (!query || typeof query !== 'string') return query;
  
  try {
    let highlighted = query;
    
    const MONGO_METHODS = [
      'find', 'findOne', 'findOneAndUpdate', 'findOneAndDelete', 'findOneAndReplace',
      'insertOne', 'insertMany', 'updateOne', 'updateMany', 'replaceOne',
      'deleteOne', 'deleteMany', 'bulkWrite',
      'aggregate', 'count', 'countDocuments', 'estimatedDocumentCount',
      'distinct', 'createIndex', 'dropIndex', 'getIndexes'
    ];

    const MONGO_OPERATORS = [
      '$match', '$group', '$sort', '$limit', '$skip', '$project', '$unwind',
      '$lookup', '$addFields', '$replaceRoot', '$facet', '$bucket',
      '$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin',
      '$and', '$or', '$not', '$nor', '$exists', '$type', '$regex',
      '$sum', '$avg', '$min', '$max', '$push', '$addToSet', '$first', '$last'
    ];
    
    // Highlight methods
    MONGO_METHODS.forEach(method => {
      const regex = new RegExp(`\\b${method}\\b`, 'gi');
      highlighted = highlighted.replace(regex, (match) => {
        return chalk.blue.bold(match);
      });
    });

    // Highlight operators
    MONGO_OPERATORS.forEach(operator => {
      const regex = new RegExp(`"${operator}"`, 'g');
      highlighted = highlighted.replace(regex, (match) => {
        return chalk.magenta.bold(match);
      });
    });
    
    // Highlight field names (keys in objects)
    highlighted = highlighted.replace(/"([^"$][^"]*)"(\s*:)/g, (match, key, colon) => {
      return chalk.cyan(`"${key}"`) + colon;
    });
    
    // Highlight string values
    highlighted = highlighted.replace(/:\s*"([^"]*)"/g, (match, value) => {
      return match.replace(`"${value}"`, chalk.green(`"${value}"`));
    });
    
    // Highlight numbers
    highlighted = highlighted.replace(/:\s*(\d+(\.\d+)?)/g, (match, num) => {
      return match.replace(num, chalk.yellow(num));
    });
    
    // Highlight booleans
    highlighted = highlighted.replace(/:\s*(true|false)\b/gi, (match, bool) => {
      return match.replace(bool, chalk.yellow.bold(bool.toLowerCase()));
    });
    
    // Highlight null
    highlighted = highlighted.replace(/:\s*null\b/gi, (match) => {
      return match.replace(/null/i, chalk.gray.bold('null'));
    });

    // Highlight brackets and braces
    highlighted = highlighted.replace(/[{}[\]]/g, (match) => {
      return chalk.magenta.bold(match);
    });
    
    return highlighted;
    
  } catch (error) {
    return query;
  }
}