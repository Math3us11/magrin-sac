import { Sequelize } from 'sequelize';

export function requiredEnvironmentValue(name: string): string {
  const value = process.env[name];

  if (value === undefined || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function configuredDatabaseName(): string {
  const database = requiredEnvironmentValue('DB_DATABASE');

  if (!/^[a-z0-9_]+$/.test(database)) {
    throw new Error('DB_DATABASE must contain only lowercase letters, numbers and underscores');
  }

  return database;
}

export function configuredDatabasePort(): number {
  const port = Number.parseInt(requiredEnvironmentValue('DB_PORT'), 10);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('DB_PORT must be a positive integer');
  }

  return port;
}

export function createDatabaseConnection(): Sequelize {
  const dialect = requiredEnvironmentValue('DB_DIALECT');

  if (dialect !== 'mariadb') {
    throw new Error(`Unsupported database dialect: ${dialect}`);
  }

  return new Sequelize({
    database: configuredDatabaseName(),
    dialect,
    host: requiredEnvironmentValue('DB_HOST'),
    logging: false,
    password: process.env.DB_PASSWORD ?? '',
    port: configuredDatabasePort(),
    timezone: '+00:00',
    username: requiredEnvironmentValue('DB_USERNAME'),
  });
}
