import { IsNotEmpty, IsUUID } from 'class-validator';

export class ResetDeviceDto {
  @IsUUID()
  @IsNotEmpty()
  employee_id!: string;
}
