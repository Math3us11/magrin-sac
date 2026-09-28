import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule, type SequelizeModuleOptions } from '@nestjs/sequelize';
import type { DatabaseConfig } from '../config/database.config.js';
import { sequelizeModels } from '../models/index.js';

function createSequelizeOptions(database: DatabaseConfig): SequelizeModuleOptions {
  return {
    autoLoadModels: false,
    database: database.database,
    define: {
      freezeTableName: true,
      paranoid: true,
      timestamps: true,
      underscored: true,
    },
    dialect: database.dialect,
    host: database.host,
    logging: false,
    models: sequelizeModels,
    password: database.password,
    port: database.port,
    retryAttempts: 1,
    synchronize: false,
    timezone: '+00:00',
    username: database.username,
  };
}

@Module({
  exports: [SequelizeModule],
  imports: [
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): SequelizeModuleOptions =>
        createSequelizeOptions(configService.getOrThrow<DatabaseConfig>('database')),
    }),
  ],
})
export class DatabaseModule {}
