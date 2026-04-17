import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkSchedule } from './schedule.entity';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';
import { redisClientProvider } from '../../config/redis.config';

@Module({
  imports: [TypeOrmModule.forFeature([WorkSchedule])],
  providers: [ScheduleService, redisClientProvider],
  controllers: [ScheduleController],
  exports: [ScheduleService],
})
export class ScheduleModule {}
