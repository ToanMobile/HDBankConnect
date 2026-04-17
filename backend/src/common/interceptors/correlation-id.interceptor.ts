import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { correlationId: string }>();
    const response = context.switchToHttp().getResponse<Response>();

    const correlationId =
      (request.headers['x-correlation-id'] as string) ?? uuidv4();
    request.correlationId = correlationId;
    response.setHeader('x-correlation-id', correlationId);

    return next.handle();
  }
}
