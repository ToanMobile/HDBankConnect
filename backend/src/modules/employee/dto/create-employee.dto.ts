import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
} from 'class-validator';
import { EmployeeRole } from '../employee.entity';

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 20)
  employee_code!: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  full_name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @Length(8, 100)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'password must contain uppercase, lowercase, and a number',
  })
  password!: string;

  @IsString()
  @IsOptional()
  @Length(1, 20)
  phone_number?: string;

  @IsEnum(EmployeeRole)
  @IsOptional()
  role?: EmployeeRole;

  @IsUUID()
  @IsOptional()
  branch_id?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
