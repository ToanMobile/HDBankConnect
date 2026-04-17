import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { REDIS_CLIENT } from '../../config/redis.config';
import Redis from 'ioredis';

interface RequestWithUser {
  user?: {
    sub: string;
    deviceId: string;
  };
}

@Injectable()
export class DeviceSessionGuard implements CanActivate {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user || !user.sub || !user.deviceId) {
      throw new UnauthorizedException('DEVICE_SESSION_INVALID');
    }

    // Check Redis for employee's registered device
    const cachedEmployeeRaw = await this.redis.get(`employee:${user.sub}`);
    if (cachedEmployeeRaw) {
      const cached = JSON.parse(cachedEmployeeRaw) as {
        registeredDeviceId?: string | null;
      };
      if (
        cached.registeredDeviceId &&
        cached.registeredDeviceId !== user.deviceId
      ) {
        throw new UnauthorizedException('DEVICE_SESSION_INVALID');
      }
    }
    // If not cached, session guard passes — the attendance validator will do DB check
    return true;
  }
}
