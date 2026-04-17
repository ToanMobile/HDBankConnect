import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { ShiftType } from '../schedule.entity';

export class UpdateScheduleDto {
  @IsString()
  @IsOptional()
  @Length(1, 50)
  shift_name?: string;

  @IsEnum(ShiftType)
  @IsOptional()
  shift_type?: ShiftType;

  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'checkin_time must be in HH:MM format',
  })
  checkin_time?: string;

  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'checkout_time must be in HH:MM format',
  })
  checkout_time?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(120)
  window_minutes?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  @IsOptional()
  active_days?: number[];

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(480)
  max_late_minutes?: number;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
