import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { WorkSchedule } from './schedule.entity';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { REDIS_CLIENT, RedisKeys, RedisTTL } from '../../config/redis.config';

@Injectable()
export class ScheduleService {
  constructor(
    @InjectRepository(WorkSchedule)
    private readonly scheduleRepository: Repository<WorkSchedule>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  /**
   * Get all schedules for a branch (Redis-cached)
   */
  async findByBranch(branchId: string): Promise<WorkSchedule[]> {
    const cacheKey = RedisKeys.schedule(branchId);
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as WorkSchedule[];
    }

    const schedules = await this.scheduleRepository.find({
      where: { branchId },
      order: { checkinTime: 'ASC' },
    });

    await this.redis.setex(
      cacheKey,
      RedisTTL.SCHEDULE,
      JSON.stringify(schedules),
    );

    return schedules;
  }

  /**
   * Get active schedule for a branch (for employee endpoint)
   */
  async findMySchedule(branchId: string): Promise<WorkSchedule[]> {
    const all = await this.findByBranch(branchId);
    return all.filter((s) => s.isActive);
  }

  async create(dto: CreateScheduleDto): Promise<WorkSchedule> {
    const schedule = this.scheduleRepository.create({
      branchId: dto.branch_id,
      shiftName: dto.shift_name,
      shiftType: dto.shift_type,
      checkinTime: dto.checkin_time,
      checkoutTime: dto.checkout_time,
      windowMinutes: dto.window_minutes ?? 15,
      activeDays: dto.active_days ?? [1, 2, 3, 4, 5],
      maxLateMinutes: dto.max_late_minutes ?? 60,
      isActive: dto.is_active ?? true,
    });

    const saved = await this.scheduleRepository.save(schedule);

    // Invalidate branch schedule cache
    await this.redis.del(RedisKeys.schedule(dto.branch_id));

    return saved;
  }

  async update(id: string, dto: UpdateScheduleDto): Promise<WorkSchedule> {
    const schedule = await this.scheduleRepository.findOne({ where: { id } });
    if (!schedule) {
      throw new NotFoundException('SCHEDULE_NOT_FOUND');
    }

    await this.scheduleRepository.update(id, {
      ...(dto.shift_name !== undefined && { shiftName: dto.shift_name }),
      ...(dto.shift_type !== undefined && { shiftType: dto.shift_type }),
      ...(dto.checkin_time !== undefined && { checkinTime: dto.checkin_time }),
      ...(dto.checkout_time !== undefined && { checkoutTime: dto.checkout_time }),
      ...(dto.window_minutes !== undefined && { windowMinutes: dto.window_minutes }),
      ...(dto.active_days !== undefined && { activeDays: dto.active_days }),
      ...(dto.max_late_minutes !== undefined && { maxLateMinutes: dto.max_late_minutes }),
      ...(dto.is_active !== undefined && { isActive: dto.is_active }),
    });

    // Invalidate cache
    await this.redis.del(RedisKeys.schedule(schedule.branchId));

    const updated = await this.scheduleRepository.findOne({ where: { id } });
    if (!updated) {
      throw new NotFoundException('SCHEDULE_NOT_FOUND');
    }
    return updated;
  }

  /**
   * Get the active schedule for a branch u2014 returns first active schedule
   * Used by attendance validation
   */
  async findActiveForBranch(branchId: string): Promise<WorkSchedule | null> {
    const schedules = await this.findMySchedule(branchId);
    return schedules[0] ?? null;
  }

  async findById(id: string): Promise<WorkSchedule> {
    const schedule = await this.scheduleRepository.findOne({ where: { id } });
    if (!schedule) {
      throw new NotFoundException('SCHEDULE_NOT_FOUND');
    }
    return schedule;
  }
}
