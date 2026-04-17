import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BranchService } from './branch.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { EmployeeRole } from '../employee/employee.entity';

@Controller('branches')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  @Get()
  @Roles(
    EmployeeRole.BRANCH_MANAGER,
    EmployeeRole.HR,
    EmployeeRole.SUPER_ADMIN,
  )
  async findAll(@Query() query: PaginationQueryDto) {
    return this.branchService.findAll(query);
  }

  @Get(':id')
  @Roles(
    EmployeeRole.BRANCH_MANAGER,
    EmployeeRole.HR,
    EmployeeRole.SUPER_ADMIN,
  )
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.branchService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(EmployeeRole.SUPER_ADMIN)
  async create(@Body() dto: CreateBranchDto) {
    return this.branchService.create(dto);
  }

  @Put(':id')
  @Roles(EmployeeRole.SUPER_ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.branchService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(EmployeeRole.SUPER_ADMIN)
  async softDelete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.branchService.softDelete(id);
  }
}
