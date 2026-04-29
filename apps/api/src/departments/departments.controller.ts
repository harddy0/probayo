import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { DepartmentsService } from './departments.service';

@ApiTags('departments')
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  @Roles(UserRole.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new department' })
  @ApiBody({ type: CreateDepartmentDto })
  @ApiResponse({ status: 201, description: 'Department successfully created.' })
  create(@Body() createDepartmentDto: CreateDepartmentDto) {
    return this.departmentsService.create(createDepartmentDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all departments' })
  @ApiResponse({ status: 200, description: 'Returns all departments.' })
  findAll() {
    return this.departmentsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single department by ID' })
  @ApiParam({
    name: 'id',
    description: 'UUID of the department to retrieve',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the requested department.',
  })
  findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  @Roles(UserRole.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an existing department' })
  @ApiParam({
    name: 'id',
    description: 'UUID of the department to update',
    type: 'string',
  })
  @ApiBody({ type: CreateDepartmentDto })
  @ApiResponse({ status: 200, description: 'Department successfully updated.' })
  update(
    @Param('id') id: string,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
  ) {
    return this.departmentsService.update(id, updateDepartmentDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  @Roles(UserRole.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a department by ID' })
  @ApiParam({
    name: 'id',
    description: 'UUID of the department to delete',
    type: 'string',
  })
  @ApiResponse({ status: 200, description: 'Department successfully deleted.' })
  remove(@Param('id') id: string) {
    return this.departmentsService.remove(id);
  }
}
