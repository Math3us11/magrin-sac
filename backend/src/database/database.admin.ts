import mariadb from 'mariadb';
import {
  configuredDatabaseName,
  configuredDatabasePort,
  requiredEnvironmentValue,
} from './database.connection.js';

export async function createConfiguredDatabase(): Promise<string> {
  const database = configuredDatabaseName();
  const connection = await mariadb.createConnection({
    host: requiredEnvironmentValue('DB_HOST'),
    password: process.env.DB_PASSWORD ?? '',
    port: configuredDatabasePort(),
    user: requiredEnvironmentValue('DB_USERNAME'),
  });

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
  } finally {
    await connection.end();
  }

  return database;
}
