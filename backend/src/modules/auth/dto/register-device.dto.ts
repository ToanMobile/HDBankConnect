import { IsNotEmpty, IsString, Length } from 'class-validator';

export class RegisterDeviceDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  device_id!: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  device_model!: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  os_version!: string;
}
