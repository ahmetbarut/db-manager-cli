import chalk from 'chalk';
import { getConnection } from '../utils/config';
import { createDatabaseClient } from '../database/database';
import ora from 'ora';

export async function listDatabases(connectionId?: string): Promise<void> {
  if (!connectionId) {
    console.error(chalk.red('❌ Connection ID is required'));
    console.log(chalk.gray('Usage: dbcli databases <connection-id>'));
    return;
  }

  const connection = getConnection(connectionId);
  if (!connection) {
    console.error(chalk.red(`❌ Connection "${connectionId}" not found`));
    return;
  }

  console.log(chalk.cyan.bold(`📊 Databases in ${connection.name}\n`));

  const spinner = ora('Fetching databases...').start();
  const client = createDatabaseClient(connection);

  try {
    await client.connect();
    
    let query = '';
    switch (connection.type) {
      case 'mysql':
        query = 'SHOW DATABASES';
        break;
      case 'postgresql':
        query = 'SELECT datname FROM pg_database WHERE datistemplate = false';
        break;
      case 'sqlite':
        spinner.succeed('SQLite uses single file database');
        console.log(chalk.yellow(`📁 ${connection.filename}`));
        return;
      case 'mongodb':
        // MongoDB databases will be handled differently
        spinner.succeed('Connected to MongoDB');
        console.log(chalk.yellow('Use MongoDB-specific commands in query console'));
        return;
    }

    const result = await client.query(query);
    spinner.succeed('Databases fetched');

    if (result.rows && result.rows.length > 0) {
      result.rows.forEach((row: any, index: number) => {
        const dbName = Object.values(row)[0];
        console.log(chalk.cyan(`  ${index + 1}. ${dbName}`));
      });
    }
  } catch (error) {
    spinner.fail('Failed to fetch databases');
    console.error(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
  } finally {
    await client.disconnect();
  }
}