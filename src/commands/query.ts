import chalk from 'chalk';
import Table from 'cli-table3';
import { getConnection } from '../utils/config';
import { createDatabaseClient } from '../database/factory';
import { QueryHistory } from '../utils/history';
import { QueryInput } from '../utils/query-input';
import { highlightSQL, highlightMongoDB } from '../utils/syntax-highlighter';
import ora from 'ora';
import inquirer from 'inquirer';

export async function queryConsole(connectionId?: string): Promise<void> {
  let connection;
  
  if (connectionId) {
    connection = getConnection(connectionId);
    if (!connection) {
      console.error(chalk.red(`❌ Connection with ID "${connectionId}" not found`));
      return;
    }
  } else {
    const connections = require('../utils/config').getConnections();
    if (connections.length === 0) {
      console.log(chalk.yellow('📭 No connections found. Use "dbcli connect" first.'));
      return;
    }

    const { selectedId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedId',
        message: 'Select database connection:',
        choices: connections.map((c: any) => ({ name: c.name, value: c.id }))
      }
    ]);
    
    connection = getConnection(selectedId);
  }

  if (!connection) return;

  const history = QueryHistory.getInstance();
  const input = new QueryInput();

  console.log(chalk.cyan.bold(`\n🔍 Query Console - ${connection.name}`));
  console.log(chalk.gray(`Database Type: ${connection.type}`));
  console.log(chalk.gray(`Connected: ${new Date().toLocaleString()}`));
  console.log(chalk.gray('Commands: .exit | .tables | .history | .clear'));
  console.log(chalk.gray(`Features: Query History ✓ | Syntax Highlighting ✓\n`));

  const client = createDatabaseClient(connection);
  
  try {
    await client.connect();
    console.log(chalk.green('✅ Connected successfully!\n'));

    while (true) {
      const recentQueries = history.getRecentQueries(connection.id, 15);
      
      let query: string;
      try {
        query = await input.getInput({
          prompt: 'Enter SQL query:',
          history: recentQueries,
          dbType: connection.type,
          client: client
        });
      } catch (error) {
        console.log(chalk.yellow('\n👋 Goodbye!'));
        break;
      }

      const trimmedQuery = query.trim();

      if (!trimmedQuery) {
        continue;
      }

      // Handle special commands
      if (trimmedQuery === '.exit') {
        console.log(chalk.yellow('👋 Goodbye!'));
        break;
      } else if (trimmedQuery === '.clear') {
        console.clear();
        console.log(chalk.cyan.bold(`🔍 Query Console - ${connection.name}`));
        console.log(chalk.gray(`Database Type: ${connection.type}\n`));
        continue;
      } else if (trimmedQuery === '.tables') {
        await showTables(client, connection.type);
        continue;
      } else if (trimmedQuery.startsWith('.history')) {
        await handleHistoryCommand(trimmedQuery, connection.id, connection.name);
        continue;
      }

      // Show highlighted query before execution
      console.log(chalk.gray('\n📝 Executing Query:'));
      console.log(chalk.gray('─'.repeat(50)));
      const highlighted = connection.type === 'mongodb' 
        ? highlightMongoDB(trimmedQuery)
        : highlightSQL(trimmedQuery);
      console.log(highlighted);
      console.log(chalk.gray('─'.repeat(50)));

      // Execute query
      const spinner = ora('Executing query...').start();
      const startTime = Date.now();

      try {
        const result = await client.query(trimmedQuery);
        const executionTime = Date.now() - startTime;
        
        spinner.succeed(chalk.green(`✅ Query executed successfully in ${executionTime}ms`));
        
        // Save successful query to history
        history.addQuery(
          trimmedQuery,
          connection.id,
          connection.name,
          true,
          executionTime
        );
        
        if (result.rows && result.rows.length > 0) {
          displayResults(result.rows);
          console.log(chalk.blue(`\n📊 Result: ${result.rows.length} row(s) returned\n`));
        } else {
          console.log(chalk.yellow('📝 Query executed successfully (no results returned)\n'));
        }
      } catch (err) {
        const executionTime = Date.now() - startTime;
        const error = err instanceof Error ? err.message : 'Unknown error';
        
        spinner.fail(chalk.red(`❌ Query failed after ${executionTime}ms`));
        console.error(chalk.red(`Error: ${error}\n`));
        
        // Save failed query to history
        history.addQuery(
          trimmedQuery,
          connection.id,
          connection.name,
          false,
          executionTime,
          error
        );
      }
    }
  } catch (error) {
    console.error(chalk.red(`❌ Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
  } finally {
    await client.disconnect();
    console.log(chalk.gray('📡 Disconnected from database'));
  }
}

async function handleHistoryCommand(command: string, connectionId: string, connectionName: string): Promise<void> {
  const history = QueryHistory.getInstance();
  const parts = command.split(' ');
  
  if (parts.length === 1) {
    // Show recent history
    const entries = history.getHistory(connectionId, 20);
    
    if (entries.length === 0) {
      console.log(chalk.yellow('\n📭 No query history found\n'));
      return;
    }
    
    console.log(chalk.cyan.bold(`\n📜 Query History - ${connectionName}`));
    console.log(chalk.gray(`Total queries: ${entries.length}\n`));
    
    const table = new Table({
      head: [
        chalk.cyan('#'),
        chalk.cyan('Time'),
        chalk.cyan('Query'),
        chalk.cyan('Status'),
        chalk.cyan('Duration')
      ],
      style: {
        head: [],
        border: ['gray']
      },
      colWidths: [4, 10, 50, 8, 10]
    });
    
    entries.slice(0, 15).forEach((entry, index) => {
      const time = entry.executedAt.toLocaleTimeString().slice(0, 8);
      const query = entry.query.length > 45 ? entry.query.substring(0, 42) + '...' : entry.query;
      const status = entry.success ? chalk.green('✓') : chalk.red('✗');
      const duration = entry.executionTime ? `${entry.executionTime}ms` : 'N/A';
      
      table.push([
        chalk.gray(index + 1),
        chalk.gray(time),
        query,
        status,
        chalk.gray(duration)
      ]);
    });
    
    console.log(table.toString());
    
    const stats = history.getStats(connectionId);
    if (stats.totalQueries > 0) {
      console.log(chalk.blue(`\n📈 Statistics:`));
      console.log(chalk.gray(`Total: ${stats.totalQueries} | Success: ${stats.successfulQueries} | Failed: ${stats.failedQueries}`));
      if (stats.averageExecutionTime > 0) {
        console.log(chalk.gray(`Average execution time: ${stats.averageExecutionTime}ms`));
      }
    }
    console.log('');
    
  } else if (parts[1] === 'clear') {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Clear all query history for ${connectionName}?`,
        default: false
      }
    ]);
    
    if (confirm) {
      history.clearHistory(connectionId);
      console.log(chalk.green('✅ Query history cleared\n'));
    }
  }
}

function displayResults(rows: any[]): void {
  if (rows.length === 0) return;

  const columns = Object.keys(rows[0]);
  
  // Create table with dynamic column widths
  const table = new Table({
    head: columns.map(col => chalk.cyan(col)),
    style: {
      head: [],
      border: ['gray'],
      'padding-left': 1,
      'padding-right': 1
    }
  });

  // Limit rows for better performance and readability
  const displayRows = rows.slice(0, 50); // Show max 50 rows
  
  displayRows.forEach(row => {
    table.push(columns.map(col => {
      const value = row[col];
      if (value === null || value === undefined) {
        return chalk.gray('NULL');
      }
      
      const stringValue = String(value);
      if (stringValue.length > 40) {
        return stringValue.substring(0, 37) + '...';
      }
      
      // Color code different data types
      if (typeof value === 'number') {
        return chalk.yellow(stringValue);
      } else if (typeof value === 'boolean') {
        return chalk.blue(stringValue);
      } else if (value instanceof Date) {
        return chalk.magenta(stringValue);
      }
      
      return stringValue;
    }));
  });

  console.log('\n' + table.toString());
  
  if (rows.length > 50) {
    console.log(chalk.yellow(`⚠️  Showing first 50 rows of ${rows.length} total rows`));
  }
}

async function showTables(client: any, dbType: string): Promise<void> {
  const spinner = ora('Fetching tables...').start();
  
  try {
    let query = '';
    switch (dbType) {
      case 'mysql':
        query = 'SHOW TABLES';
        break;
      case 'postgresql':
        query = "SELECT tablename FROM pg_tables WHERE schemaname = 'public'";
        break;
      case 'sqlite':
        query = "SELECT name FROM sqlite_master WHERE type='table'";
        break;
      default:
        spinner.fail('Table listing not supported for this database type');
        return;
    }

    const result = await client.query(query);
    spinner.succeed(`Found ${result.rows?.length || 0} tables`);
    
    if (result.rows && result.rows.length > 0) {
      console.log(chalk.yellow('\n📋 Database Tables:'));
      result.rows.forEach((row: any, index: number) => {
        const tableName = Object.values(row)[0];
        console.log(chalk.cyan(`  ${(index + 1).toString().padStart(2, ' ')}. ${tableName}`));
      });
      console.log('');
    } else {
      console.log(chalk.yellow('📭 No tables found in this database\n'));
    }
  } catch (error) {
    spinner.fail('Failed to fetch tables');
    console.error(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`));
  }
}