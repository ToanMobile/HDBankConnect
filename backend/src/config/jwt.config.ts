import { ConfigService } from '@nestjs/config';
import { JwtModuleAsyncOptions } from '@nestjs/jwt';

export const jwtConfig: JwtModuleAsyncOptions = {
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    secret: configService.get<string>('JWT_SECRET', 'change-me-in-production'),
    signOptions: {
      expiresIn: configService.get<string>('JWT_ACCESS_EXPIRES', '15m'),
      issuer: 'echeck-ai',
      audience: 'echeck-ai-client',
    },
  }),
};

export interface JwtPayload {
  sub: string;           // employee UUID
  email: string;
  role: string;
  branchId: string | null;
  deviceId: string;
  jti: string;           // unique token ID for revocation
  iat?: number;
  exp?: number;
}

export const JWT_REFRESH_EXPIRES = '7d';
export const JWT_REFRESH_EXPIRES_SECONDS = 7 * 24 * 60 * 60; // 604800 seconds
export const JWT_ACCESS_EXPIRES = '15m';
