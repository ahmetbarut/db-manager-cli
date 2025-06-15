import inquirer from 'inquirer';
import chalk from 'chalk';
import { DatabaseConnection } from '../types/database';
import { saveConnection } from '../utils/config';
import { testConnection } from '../database/database';
import ora from 'ora';

export async function connectDatabase(): Promise<void> {
  console.log(chalk.yellow('📡 Add New Database Connection\n'));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Connection name:',
      validate: (input: string) => input.length > 0 || 'Name is required'
    },
    {
      type: 'list',
      name: 'type',
      message: 'Database type:',
      choices: [
        { name: '🐬 MySQL', value: 'mysql' },
        { name: '🐘 PostgreSQL', value: 'postgresql' },
        { name: '📁 SQLite', value: 'sqlite' },
        { name: '🍃 MongoDB', value: 'mongodb' }
      ]
    }
  ]);

  let connectionConfig: Partial<DatabaseConnection> = {
    id: Date.now().toString(),
    name: answers.name,
    type: answers.type,
    createdAt: new Date()
  };

  // Database-specific configuration
  if (answers.type === 'sqlite') {
    const sqliteAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'filename',
        message: 'SQLite file path:',
        validate: (input: string) => input.length > 0 || 'File path is required'
      }
    ]);
    connectionConfig.filename = sqliteAnswers.filename;
  } else if (answers.type === 'mongodb') {
    const mongoAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'uri',
        message: 'MongoDB URI:',
        default: 'mongodb://localhost:27017',
        validate: (input: string) => input.length > 0 || 'URI is required'
      }
    ]);
    connectionConfig.uri = mongoAnswers.uri;
  } else {
    // MySQL & PostgreSQL
    const dbAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'host',
        message: 'Host:',
        default: 'localhost'
      },
      {
        type: 'number',
        name: 'port',
        message: 'Port:',
        default: answers.type === 'mysql' ? 3306 : 5432
      },
      {
        type: 'input',
        name: 'username',
        message: 'Username:',
        validate: (input: string) => input.length > 0 || 'Username is required'
      },
      {
        type: 'password',
        name: 'password',
        message: 'Password:',
        mask: '*'
      },
      {
        type: 'input',
        name: 'database',
        message: 'Database name (optional):'
      },
      {
        type: 'confirm',
        name: 'ssl',
        message: 'Use SSL?',
        default: false
      }
    ]);

    connectionConfig = { ...connectionConfig, ...dbAnswers };
  }

  // Test connection
  const spinner = ora('Testing connection...').start();
  
  try {
    await testConnection(connectionConfig as DatabaseConnection);
    spinner.succeed(chalk.green('Connection successful!'));
    
    saveConnection(connectionConfig as DatabaseConnection);
    console.log(chalk.green(`\n✅ Connection "${answers.name}" saved successfully!`));
    console.log(chalk.gray(`Use: ${chalk.cyan(`dbcli query ${connectionConfig.id}`)} to start querying`));
  } catch (error) {
    spinner.fail(chalk.red('Connection failed!'));
    console.error(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
  }
}