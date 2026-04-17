import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Branch } from '../branch/branch.entity';

export enum ShiftType {
  MORNING = 'morning',
  AFTERNOON = 'afternoon',
  FULL_DAY = 'full_day',
  CUSTOM = 'custom',
}

@Entity('work_schedules')
@Index('idx_schedules_branch', ['branchId'])
@Index('idx_schedules_branch_active', ['branchId', 'isActive'])
export class WorkSchedule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId!: string;

  @ManyToOne(() => Branch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branch_id' })
  branch!: Branch;

  @Column({ name: 'shift_name', length: 50 })
  shiftName!: string;

  @Column({
    name: 'shift_type',
    type: 'enum',
    enum: ShiftType,
    default: ShiftType.FULL_DAY,
  })
  shiftType!: ShiftType;

  /**
   * Expected check-in time in HH:MM format (Vietnam time)
   * e.g. "08:00"
   */
  @Column({ name: 'checkin_time', length: 5 })
  checkinTime!: string;

  /**
   * Expected check-out time in HH:MM format (Vietnam time)
   * e.g. "17:30"
   */
  @Column({ name: 'checkout_time', length: 5 })
  checkoutTime!: string;

  /**
   * Tolerance window in minutes (+/- around schedule time)
   * e.g. 15 means 08:00 +/- 15min window
   */
  @Column({ name: 'window_minutes', type: 'int', default: 15 })
  windowMinutes!: number;

  /**
   * Days of week this schedule is active (ISO: 1=Mon, 7=Sun)
   * Stored as JSONB array e.g. [1,2,3,4,5]
   */
  @Column({ name: 'active_days', type: 'jsonb', default: [1, 2, 3, 4, 5] })
  activeDays!: number[];

  /**
   * Maximum late minutes before recording as absent
   * Default: 60 minutes
   */
  @Column({ name: 'max_late_minutes', type: 'int', default: 60 })
  maxLateMinutes!: number;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
