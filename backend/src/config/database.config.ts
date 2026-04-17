import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';
import { join } from 'path';

export const databaseConfig: TypeOrmModuleAsyncOptions = {
  inject: [ConfigService],
  useFactory: (configService: ConfigService): DataSourceOptions => ({
    type: 'postgres',
    host: configService.get<string>('DB_HOST', 'localhost'),
    port: configService.get<number>('DB_PORT', 5432),
    username: configService.get<string>('DB_USERNAME', 'postgres'),
    password: configService.get<string>('DB_PASSWORD', 'postgres'),
    database: configService.get<string>('DB_NAME', 'smart_attendance'),
    entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
    migrations: [join(__dirname, '..', 'migrations', '*.{ts,js}')],
    synchronize: false,
    logging: configService.get<string>('NODE_ENV') === 'development',
    ssl:
      configService.get<string>('DB_SSL') === 'true'
        ? { rejectUnauthorized: false }
        : false,
    extra: {
      max: configService.get<number>('DB_POOL_MAX', 20),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    },
  }),
};

// For TypeORM CLI migrations (reads from env directly)
export const AppDataSource = new DataSource({
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
