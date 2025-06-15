#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';

// Force color support for better terminal compatibility
chalk.level = 1; // Use basic 16 colors for better compatibility

import { connectDatabase } from './commands/connect';
import { listDatabases } from './commands/list';
import { queryConsole } from './commands/query';
import { showConnections } from './commands/connections';

const program = new Command();

console.log(chalk.cyan.bold('🗄️  Database CLI Tool v1.0.0'));
console.log(chalk.gray('Advanced database management with query console & history'));
console.log(chalk.gray(`👤 User: ${process.env.USER || 'Unknown'}`));
console.log(chalk.gray(`📅 ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n`));

program
  .name('dbcli')
  .description('Database CLI with query console, history & syntax highlighting')
  .version('1.0.0');

program
  .command('connect')
  .description('Connect to a database')
  .action(connectDatabase);

program
  .command('list')
  .description('List all saved database connections')
  .action(showConnections);

program
  .command('query [connection]')
  .description('Open advanced query console with history')
  .action(queryConsole);

program
  .command('databases [connection]')
  .description('List databases in a connection')
  .action(listDatabases);

program
  .command('history')
  .description('Show global query history statistics')
  .action(async () => {
    const { QueryHistory } = await import('./utils/history');
    const history = QueryHistory.getInstance();
    const stats = history.getStats();
    
    console.log(chalk.cyan.bold('\n📊 Global Query Statistics\n'));
    console.log(`${chalk.cyan('Total Queries:')} ${stats.totalQueries}`);
    console.log(`${chalk.green('Successful:')} ${stats.successfulQueries}`);
    console.log(`${chalk.red('Failed:')} ${stats.failedQueries}`);
    if (stats.averageExecutionTime > 0) {
      console.log(`${chalk.yellow('Average Execution Time:')} ${stats.averageExecutionTime}ms`);
    }
    
    if (stats.totalQueries > 0) {
      const successRate = ((stats.successfulQueries / stats.totalQueries) * 100).toFixed(1);
      console.log(`${chalk.blue('Success Rate:')} ${successRate}%`);
    }
    console.log('');
  });

program.parse();