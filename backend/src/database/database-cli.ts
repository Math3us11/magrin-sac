import type { MigrationMeta } from 'umzug';
import { createConfiguredDatabase } from './database.admin.js';
import {
  provisionAdministrator,
  readBootstrapAdministratorInput,
} from './database.bootstrap-admin.js';
import { createDatabaseConnection } from './database.connection.js';
import { createDatabaseMigrator } from './database.migrator.js';

type DatabaseCommand =
  'bootstrap:admin' | 'check' | 'create' | 'migrate' | 'migrate:status' | 'migrate:undo' | 'setup';

const DATABASE_COMMANDS = new Set<DatabaseCommand>([
  'bootstrap:admin',
  'check',
  'create',
  'migrate',
  'migrate:status',
  'migrate:undo',
  'setup',
]);

function parseCommand(value: string | undefined): DatabaseCommand {
  if (value !== undefined && DATABASE_COMMANDS.has(value as DatabaseCommand)) {
    return value as DatabaseCommand;
  }

  throw new Error(
    'Expected one command: bootstrap:admin, check, create, migrate, migrate:undo, migrate:status or setup',
  );
}

function printMigrationList(title: string, migrations: MigrationMeta[]): void {
  console.log(`\n${title}`);

  if (migrations.length === 0) {
    console.log('  none');
    return;
  }

  for (const migration of migrations) {
    console.log(`  - ${migration.name}`);
  }
}

async function run(): Promise<void> {
  const command = parseCommand(process.argv[2]);

  if (command === 'create' || command === 'setup') {
    const database = await createConfiguredDatabase();
    console.log(`Database ready: ${database}`);

    if (command === 'create') {
      return;
    }
  }

  const sequelize = createDatabaseConnection();
  const migrations = createDatabaseMigrator(sequelize);

  try {
    await sequelize.authenticate();

    switch (command) {
      case 'bootstrap:admin': {
        const pendingMigrations = await migrations.pending();

        if (pendingMigrations.length > 0) {
          throw new Error('Apply all pending migrations before provisioning an administrator.');
        }

        const result = await provisionAdministrator(sequelize, readBootstrapAdministratorInput());
        console.log(`Administrator ${result.action}: ${result.email}`);
        break;
      }
      case 'check':
        console.log('Database connection succeeded.');
        break;
      case 'migrate':
      case 'setup':
        printMigrationList('Applied migrations:', await migrations.up());
        break;
      case 'migrate:undo':
        printMigrationList('Reverted migrations:', await migrations.down());
        break;
      case 'migrate:status':
        printMigrationList('Executed migrations:', await migrations.executed());
        printMigrationList('Pending migrations:', await migrations.pending());
        break;
    }
  } finally {
    await sequelize.close();
  }
}

try {
  await run();
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Database command failed.');
  process.exitCode = 1;
}
