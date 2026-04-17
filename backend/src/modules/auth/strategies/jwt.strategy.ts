import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../../../config/jwt.config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'JWT_SECRET',
        'change-me-in-production',
      ),
      issuer: 'smart-attendance',
      audience: 'smart-attendance-client',
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    if (!payload.sub || !payload.email || !payload.role) {
      throw new UnauthorizedException('INVALID_TOKEN_PAYLOAD');
    }
    return payload;
  }
}
