import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { QueryResult } from '../types/database';

const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const XLSX = require('xlsx');

export interface ExportOptions {
  format: 'csv' | 'json' | 'excel' | 'sql';
  filename?: string;
  includeHeaders?: boolean;
  delimiter?: string;
}

export class QueryResultExporter {
  private static getDefaultExportDir(): string {
    const exportDir = path.join(os.homedir(), 'Downloads', 'dbcli-exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
    return exportDir;
  }

  private static generateFilename(format: string, query: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const queryPrefix = query.trim().split(' ')[0].toLowerCase().substring(0, 10);
    return `${queryPrefix}_${timestamp}.${format}`;
  }

  static async exportResults(
    result: QueryResult, 
    query: string, 
    connectionName: string
  ): Promise<void> {
    if (!result.rows || result.rows.length === 0) {
      console.log(chalk.yellow('⚠️  No data to export'));
      return;
    }

    console.log(chalk.cyan.bold('\n📤 Export Query Results'));
    console.log(chalk.gray(`Connection: ${connectionName}`));
    console.log(chalk.gray(`Rows: ${result.rows.length}`));
    console.log(chalk.gray(`Columns: ${result.columns?.length || Object.keys(result.rows[0]).length}`));

    const { format } = await inquirer.prompt([
      {
        type: 'list',
        name: 'format',
        message: 'Select export format:',
        choices: [
          { name: '📊 CSV (Comma Separated Values)', value: 'csv' },
          { name: '📋 JSON (JavaScript Object Notation)', value: 'json' },
          { name: '📈 Excel (XLSX)', value: 'excel' },
          { name: '🗃️  SQL Insert Statements', value: 'sql' },
          new inquirer.Separator(),
          { name: '❌ Cancel export', value: 'cancel' }
        ]
      }
    ]);

    if (format === 'cancel') {
      console.log(chalk.gray('Export cancelled'));
      return;
    }

    const defaultFilename = this.generateFilename(format === 'excel' ? 'xlsx' : format, query);
    const defaultPath = path.join(this.getDefaultExportDir(), defaultFilename);

    const { customPath, includeHeaders } = await inquirer.prompt([
      {
        type: 'input',
        name: 'customPath',
        message: 'Export file path:',
        default: defaultPath,
        validate: (input: string) => {
          const dir = path.dirname(input);
          if (!fs.existsSync(dir)) {
            try {
              fs.mkdirSync(dir, { recursive: true });
            } catch (error) {
              return `Cannot create directory: ${dir}`;
            }
          }
          return true;
        }
      },
      {
        type: 'confirm',
        name: 'includeHeaders',
        message: 'Include column headers?',
        default: true,
        when: () => format !== 'json'
      }
    ]);

    try {
      const exportPath = customPath || defaultPath;
      
      switch (format) {
        case 'csv':
          await this.exportToCsv(result, exportPath, includeHeaders);
          break;
        case 'json':
          await this.exportToJson(result, exportPath, query, connectionName);
          break;
        case 'excel':
          await this.exportToExcel(result, exportPath, includeHeaders, query, connectionName);
          break;
        case 'sql':
          await this.exportToSql(result, exportPath, query);
          break;
      }

      console.log(chalk.green(`✅ Successfully exported ${result.rows.length} rows to:`));
      console.log(chalk.cyan(`📁 ${exportPath}`));
      
      // Show file size
      const stats = fs.statSync(exportPath);
      const fileSizeKB = (stats.size / 1024).toFixed(2);
      console.log(chalk.gray(`📊 File size: ${fileSizeKB} KB\n`));

    } catch (error) {
      console.error(chalk.red(`❌ Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  private static async exportToCsv(
    result: QueryResult, 
    filePath: string, 
    includeHeaders: boolean = true
  ): Promise<void> {
    const columns = result.columns || Object.keys(result.rows[0]);
    
    const csvWriter = createCsvWriter({
      path: filePath,
      header: columns.map(col => ({ id: col, title: col })),
      encoding: 'utf8'
    });

    // Convert data to ensure proper CSV formatting
    const csvData = result.rows.map(row => {
      const csvRow: any = {};
      columns.forEach(col => {
        let value = row[col];
        
        // Handle null/undefined values
        if (value === null || value === undefined) {
          value = '';
        }
        // Handle dates
        else if (value instanceof Date) {
          value = value.toISOString();
        }
        // Handle objects/arrays
        else if (typeof value === 'object') {
          value = JSON.stringify(value);
        }
        // Convert to string
        else {
          value = String(value);
        }
        
        csvRow[col] = value;
      });
      return csvRow;
    });

    await csvWriter.writeRecords(csvData);
  }

  private static async exportToJson(
    result: QueryResult, 
    filePath: string, 
    query: string, 
    connectionName: string
  ): Promise<void> {
    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        connectionName,
        query: query.trim(),
        rowCount: result.rows.length,
        executionTime: result.executionTime,
        columns: result.columns || Object.keys(result.rows[0] || {})
      },
      data: result.rows
    };

    fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2), 'utf8');
  }

  private static async exportToExcel(
    result: QueryResult, 
    filePath: string, 
    includeHeaders: boolean = true,
    query: string,
    connectionName: string
  ): Promise<void> {
    const columns = result.columns || Object.keys(result.rows[0]);
    
    // Prepare data for Excel
    const excelData = result.rows.map(row => {
      const excelRow: any = {};
      columns.forEach(col => {
        let value = row[col];
        
        // Handle null/undefined values
        if (value === null || value === undefined) {
          value = '';
        }
        // Handle dates - Excel recognizes ISO dates
        else if (value instanceof Date) {
          value = value.toISOString();
        }
        // Handle objects/arrays
        else if (typeof value === 'object') {
          value = JSON.stringify(value);
        }
        
        excelRow[col] = value;
      });
      return excelRow;
    });

    // Create workbook
    const workbook = XLSX.utils.book_new();
    
    // Create main data worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Add column widths for better readability
    const columnWidths = columns.map(col => {
      const maxLength = Math.max(
        col.length,
        ...result.rows.slice(0, 100).map(row => {
          const value = row[col];
          return value ? String(value).length : 0;
        })
      );
      return { wch: Math.min(maxLength + 2, 50) };
    });
    worksheet['!cols'] = columnWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Query Results');
    
    // Create metadata worksheet
    const metadata = [
      ['Export Date', new Date().toISOString()],
      ['Connection', connectionName],
      ['Query', query.trim()],
      ['Row Count', result.rows.length],
      ['Execution Time (ms)', result.executionTime],
      ['Columns', columns.join(', ')]
    ];
    
    const metadataSheet = XLSX.utils.aoa_to_sheet(metadata);
    metadataSheet['!cols'] = [{ wch: 20 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Metadata');

    // Write file
    XLSX.writeFile(workbook, filePath);
  }

  private static async exportToSql(
    result: QueryResult, 
    filePath: string, 
    originalQuery: string
  ): Promise<void> {
    const columns = result.columns || Object.keys(result.rows[0]);
    
    // Try to extract table name from original query
    const tableNameMatch = originalQuery.match(/FROM\s+([`"]?)(\w+)\1/i);
    const tableName = tableNameMatch ? tableNameMatch[2] : 'exported_data';
    
    let sqlContent = `-- SQL Export Generated on ${new Date().toISOString()}\n`;
    sqlContent += `-- Original Query: ${originalQuery.trim()}\n`;
    sqlContent += `-- Rows: ${result.rows.length}\n\n`;
    
    // Generate CREATE TABLE statement
    sqlContent += `-- Create table structure\n`;
    sqlContent += `CREATE TABLE ${tableName} (\n`;
    
    const columnDefinitions = columns.map(col => {
      // Try to infer column types from data
      const sampleValues = result.rows.slice(0, 10).map(row => row[col]).filter(v => v !== null && v !== undefined);
      let columnType = 'TEXT';
      
      if (sampleValues.length > 0) {
        const firstValue = sampleValues[0];
        if (typeof firstValue === 'number') {
          columnType = Number.isInteger(firstValue) ? 'INTEGER' : 'DECIMAL(10,2)';
        } else if (firstValue instanceof Date) {
          columnType = 'DATETIME';
        } else if (typeof firstValue === 'boolean') {
          columnType = 'BOOLEAN';
        } else {
          const maxLength = Math.max(...sampleValues.map(v => String(v).length));
          columnType = maxLength > 255 ? 'TEXT' : `VARCHAR(${Math.max(maxLength * 2, 50)})`;
        }
      }
      
      return `  ${col} ${columnType}`;
    });
    
    sqlContent += columnDefinitions.join(',\n');
    sqlContent += '\n);\n\n';
    
    // Generate INSERT statements
    sqlContent += `-- Insert data\n`;
    
    const batchSize = 100;
    for (let i = 0; i < result.rows.length; i += batchSize) {
      const batch = result.rows.slice(i, i + batchSize);
      
      sqlContent += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES\n`;
      
      const valueRows = batch.map(row => {
        const values = columns.map(col => {
          const value = row[col];
          
          if (value === null || value === undefined) {
            return 'NULL';
          } else if (typeof value === 'string') {
            return `'${value.replace(/'/g, "''")}'`;
          } else if (value instanceof Date) {
            return `'${value.toISOString()}'`;
          } else if (typeof value === 'boolean') {
            return value ? '1' : '0';
          } else {
            return String(value);
          }
        });
        
        return `  (${values.join(', ')})`;
      });
      
      sqlContent += valueRows.join(',\n');
      sqlContent += ';\n\n';
    }
    
    fs.writeFileSync(filePath, sqlContent, 'utf8');
  }
} 