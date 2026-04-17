// This file is used by TypeORM CLI for migrations
// It must remain a standalone file that doesn't need NestJS DI
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

export default new DataSource({
  type: 'postgres',
  host: process.env['DB_HOST'] ?? 'localhost',
  port: parseInt(process.env['DB_PORT'] ?? '5432', 10),
  username: process.env['DB_USERNAME'] ?? 'postgres',
  password: process.env['DB_PASSWORD'] ?? 'postgres',
  database: process.env['DB_NAME'] ?? 'smart_attendance',
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, '..', 'migrations', '*.{ts,js}')],
  synchronize: false,
  logging: process.env['NODE_ENV'] === 'development',
  ssl:
    process.env['DB_SSL'] === 'true' ? { rejectUnauthorized: false } : false,
});
