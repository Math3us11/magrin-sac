import { registerAs } from '@nestjs/config';

export type DatabaseConfig = {
  database: string;
  dialect: 'mariadb';
  host: string;
  password: string;
  port: number;
  username: string;
};

export default registerAs('database', (): DatabaseConfig => ({
  database: process.env.DB_DATABASE as string,
  dialect: process.env.DB_DIALECT as DatabaseConfig['dialect'],
  host: process.env.DB_HOST as string,
  password: process.env.DB_PASSWORD as string,
  port: Number.parseInt(process.env.DB_PORT as string, 10),
  username: process.env.DB_USERNAME as string,
}));
