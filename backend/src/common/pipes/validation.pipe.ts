import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

@Injectable()
export class AppValidationPipe implements PipeTransform {
  async transform(value: unknown, { metatype }: ArgumentMetadata): Promise<unknown> {
    if (!metatype || !this.shouldValidate(metatype)) {
      return value;
    }

    const object = plainToInstance(metatype, value);
    const errors = await validate(object as object, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      const messages = errors
        .flatMap((err) => Object.values(err.constraints ?? {}))
        .filter(Boolean);
      throw new BadRequestException(messages.join('; '));
    }

    return object;
  }

  private shouldValidate(metatype: Function): boolean {
    const primitives: Function[] = [String, Boolean, Number, Array, Object];
    return !primitives.includes(metatype);
  }
}
