import {
  IsDateString,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

/**
 * Employee self-service makeup attendance request.
 * work_date: the date being made up (yyyy-MM-dd).
 * check_in / check_out: ISO8601 datetimes (at least one must be provided).
 * note: mandatory reason.
 */
export class SelfManualCheckinDto {
  @IsDateString()
  work_date!: string; // yyyy-MM-dd

  @IsISO8601({ strict: true })
  @IsOptional()
  check_in?: string | null;

  @IsISO8601({ strict: true })
  @IsOptional()
  check_out?: string | null;

  @IsString()
  @IsNotEmpty()
  @Length(1, 500)
  note!: string;
}
