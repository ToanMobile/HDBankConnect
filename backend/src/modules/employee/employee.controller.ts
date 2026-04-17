import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { PaginationQueryDto } from '../branch/dto/pagination-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BranchScopeGuard } from '../../common/guards/branch-scope.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { EmployeeRole } from './employee.entity';

interface ScopedRequest extends Request {
  scopedBranchId?: string | null;
}

@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Get()
  @UseGuards(BranchScopeGuard)
  @Roles(
    EmployeeRole.BRANCH_MANAGER,
    EmployeeRole.HR,
    EmployeeRole.SUPER_ADMIN,
  )
  async findAll(@Query() query: PaginationQueryDto, @Req() req: ScopedRequest) {
    return this.employeeService.findAll(query, req.scopedBranchId);
  }

  @Get(':id')
  @Roles(
    EmployeeRole.BRANCH_MANAGER,
    EmployeeRole.HR,
    EmployeeRole.SUPER_ADMIN,
  )
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.employeeService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(EmployeeRole.HR, EmployeeRole.SUPER_ADMIN)
  async create(@Body() dto: CreateEmployeeDto) {
    return this.employeeService.create(dto);
  }

  @Put(':id')
  @Roles(EmployeeRole.HR, EmployeeRole.SUPER_ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.employeeService.update(id, dto);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(EmployeeRole.HR, EmployeeRole.SUPER_ADMIN)
  async setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('is_active') isActive: boolean,
  ): Promise<void> {
    await this.employeeService.setStatus(id, isActive);
  }

  @Post(':id/reset-device')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(
    EmployeeRole.BRANCH_MANAGER,
    EmployeeRole.HR,
    EmployeeRole.SUPER_ADMIN,
  )
  async resetDevice(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.employeeService.resetDevice(id);
  }
}
