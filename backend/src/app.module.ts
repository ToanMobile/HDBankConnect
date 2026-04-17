import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule as CronModule } from '@nestjs/schedule';
import { databaseConfig } from './config/database.config';
import { AuthModule } from './modules/auth/auth.module';
import { BranchModule } from './modules/branch/branch.module';
import { EmployeeModule } from './modules/employee/employee.module';
import { ScheduleModule } from './modules/schedule/schedule.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { FraudModule } from './modules/fraud/fraud.module';
import { SyncModule } from './modules/sync/sync.module';
import { NotificationModule } from './modules/notification/notification.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    // Config (global)
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Database
    TypeOrmModule.forRootAsync(databaseConfig),

    // Rate limiting (global)
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 1 minute window
        limit: 60,  // 60 requests per minute per IP by default
      },
    ]),

    // Cron scheduler
    CronModule.forRoot(),

    // Feature modules
    AuthModule,
    BranchModule,
    EmployeeModule,
    ScheduleModule,
    AttendanceModule,
    FraudModule,
    SyncModule,
    NotificationModule,
    RealtimeModule,
    HealthModule,
  ],
})
export class AppModule {}
