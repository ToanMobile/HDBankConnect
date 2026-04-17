import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Branch } from './branch.entity';
import { BranchController } from './branch.controller';
import { BranchService } from './branch.service';
import { redisClientProvider } from '../../config/redis.config';

@Module({
  imports: [TypeOrmModule.forFeature([Branch])],
  providers: [BranchService, redisClientProvider],
  controllers: [BranchController],
  exports: [BranchService],
})
export class BranchModule {}
