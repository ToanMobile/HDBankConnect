import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';
import { EmployeeRole } from '../employee.entity';

export class UpdateEmployeeDto {
  @IsString()
  @IsOptional()
  @Length(1, 100)
  full_name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @Length(1, 20)
  phone_number?: string;

  @IsEnum(EmployeeRole)
  @IsOptional()
  role?: EmployeeRole;

  @IsUUID()
  @IsOptional()
  branch_id?: string | null;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
