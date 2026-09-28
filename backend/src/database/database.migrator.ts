import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DataTypes, type QueryInterface, type Sequelize } from 'sequelize';
import { SequelizeStorage, Umzug } from 'umzug';

function createMigrationRunner(sequelize: Sequelize): Umzug<QueryInterface> {
  const databaseDirectory = dirname(fileURLToPath(import.meta.url));
  const extension = import.meta.url.endsWith('.ts') ? 'ts' : 'js';

  return new Umzug<QueryInterface>({
    context: sequelize.getQueryInterface(),
    logger: console,
    migrations: {
      glob: [`migrations/*.migration.${extension}`, { cwd: databaseDirectory }],
    },
    storage: new SequelizeStorage({
      columnType: DataTypes.STRING(190),
      modelName: 'SequelizeMigrationMeta',
      sequelize,
      tableName: 'sequelize_migrations',
    }),
  });
}

export function createDatabaseMigrator(sequelize: Sequelize): Umzug<QueryInterface> {
  return createMigrationRunner(sequelize);
}
