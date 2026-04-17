import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from './employee.entity';
import { EmployeeController } from './employee.controller';
import { EmployeeService } from './employee.service';
import { redisClientProvider } from '../../config/redis.config';

@Module({
  imports: [TypeOrmModule.forFeature([Employee])],
  providers: [EmployeeService, redisClientProvider],
  controllers: [EmployeeController],
  exports: [EmployeeService],
})
export class EmployeeModule {}
