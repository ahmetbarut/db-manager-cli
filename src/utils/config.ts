import fs from 'fs';
import path from 'path';
import os from 'os';
import { DatabaseConnection } from '../types/database';

const CONFIG_DIR = path.join(os.homedir(), '.dbcli');
const CONNECTIONS_FILE = path.join(CONFIG_DIR, 'connections.json');

export function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function saveConnection(connection: DatabaseConnection): void {
  ensureConfigDir();
  const connections = getConnections();
  const existingIndex = connections.findIndex(c => c.id === connection.id);
  
  if (existingIndex >= 0) {
    connections[existingIndex] = connection;
  } else {
    connections.push(connection);
  }
  
  fs.writeFileSync(CONNECTIONS_FILE, JSON.stringify(connections, null, 2));
}

export function getConnections(): DatabaseConnection[] {
  ensureConfigDir();
  if (!fs.existsSync(CONNECTIONS_FILE)) {
    return [];
  }
  
  try {
    const data = fs.readFileSync(CONNECTIONS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

export function getConnection(id: string): DatabaseConnection | undefined {
  return getConnections().find(c => c.id === id);
}

export function deleteConnection(id: string): void {
  const connections = getConnections().filter(c => c.id !== id);
  fs.writeFileSync(CONNECTIONS_FILE, JSON.stringify(connections, null, 2));
}