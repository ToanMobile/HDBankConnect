import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

export const redisClientProvider: Provider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): Redis => {
    const client = new Redis({
      host: configService.get<string>('REDIS_HOST', 'localhost'),
      port: configService.get<number>('REDIS_PORT', 6379),
      password: configService.get<string>('REDIS_PASSWORD'),
      db: configService.get<number>('REDIS_DB', 0),
      keyPrefix: 'smart_att:',
      retryStrategy: (times: number) => {
        if (times > 10) {
          return null; // stop retrying
        }
        return Math.min(times * 100, 3000);
      },
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      lazyConnect: false,
    });

    client.on('connect', () => {
      console.log('[Redis] Connected');
    });

    client.on('error', (err: Error) => {
      console.error('[Redis] Connection error:', err.message);
    });

    client.on('ready', () => {
      console.log('[Redis] Ready to receive commands');
    });

    return client;
  },
};

// Redis key helpers
export const RedisKeys = {
  employee: (id: string) => `employee:${id}`,
  branch: (id: string) => `branch:${id}`,
  schedule: (branchId: string) => `schedule:${branchId}`,
  refreshToken: (employeeId: string, jti: string) => `refresh:${employeeId}:${jti}`,
  otpToken: (email: string) => `otp:${email}`,
  deviceSession: (deviceId: string) => `device:${deviceId}`,
  rateLimitCheckin: (employeeId: string, date: string) => `rate:checkin:${employeeId}:${date}`,
} as const;

// TTL constants in seconds
export const RedisTTL = {
  EMPLOYEE: 3600,         // 1 hour
  BRANCH: 3600,           // 1 hour
  SCHEDULE: 3600,         // 1 hour
  REFRESH_TOKEN: 7 * 24 * 3600, // 7 days
  OTP: 300,               // 5 minutes
  DEVICE_SESSION: 3600,   // 1 hour
} as const;
