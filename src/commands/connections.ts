import chalk from 'chalk';
import Table from 'cli-table3';
import { getConnections, deleteConnection } from '../utils/config';
import inquirer from 'inquirer';

export async function showConnections(): Promise<void> {
  const connections = getConnections();

  if (connections.length === 0) {
    console.log(chalk.yellow('📭 No database connections found.'));
    console.log(chalk.gray(`Use: ${chalk.cyan('dbcli connect')} to add a new connection`));
    return;
  }

  console.log(chalk.cyan.bold('💾 Saved Database Connections\n'));

  const table = new Table({
    head: [
      chalk.cyan('ID'),
      chalk.cyan('Name'),
      chalk.cyan('Type'),
      chalk.cyan('Host/File'),
      chalk.cyan('Created')
    ],
    style: {
      head: [],
      border: ['gray']
    }
  });

  connections.forEach(conn => {
    const hostInfo = conn.host ? `${conn.host}:${conn.port}` : 
                    conn.filename ? conn.filename : 
                    conn.uri ? new URL(conn.uri).host : 'N/A';

    table.push([
      conn.id,
      chalk.yellow(conn.name),
      getTypeIcon(conn.type),
      hostInfo,
      new Date(conn.createdAt).toLocaleDateString()
    ]);
  });

  console.log(table.toString());

  // Action menu
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: '🔍 Query a connection', value: 'query' },
        { name: '🗑️  Delete a connection', value: 'delete' },
        { name: '❌ Exit', value: 'exit' }
      ]
    }
  ]);

  if (action === 'query') {
    const { connectionId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'connectionId',
        message: 'Select connection:',
        choices: connections.map(c => ({ name: c.name, value: c.id }))
      }
    ]);
    
    const { queryConsole } = await import('./query');
    await queryConsole(connectionId);
  } else if (action === 'delete') {
    const { connectionId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'connectionId',
        message: 'Select connection to delete:',
        choices: connections.map(c => ({ name: c.name, value: c.id }))
      }
    ]);

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Are you sure you want to delete this connection?',
        default: false
      }
    ]);

    if (confirm) {
      deleteConnection(connectionId);
      console.log(chalk.green('✅ Connection deleted successfully!'));
    }
  }
}

function getTypeIcon(type: string): string {
  const icons = {
    mysql: '🐬 MySQL',
    postgresql: '🐘 PostgreSQL',
    sqlite: '📁 SQLite',
    mongodb: '🍃 MongoDB'
  };
  return icons[type as keyof typeof icons] || type;
}