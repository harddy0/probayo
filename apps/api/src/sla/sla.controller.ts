import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
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
import { SlaService } from './sla.service';
import { CreateSlaPolicyDto } from './dto/create-sla-policy.dto';
import { UpdateSlaPolicyDto } from './dto/update-sla-policy.dto';
import { SlaPolicyResponseDto } from './dto/sla-policy-response.dto';

@ApiTags('SLA Policies')
@ApiBearerAuth('bearer') // ← Changed to match main.ts
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sla-policies')
export class SlaController {
  constructor(private readonly slaService: SlaService) {}

  @Post()
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: 'Create a new SLA policy (Admin only)' })
  @ApiBody({ type: CreateSlaPolicyDto })
  @ApiResponse({
    status: 201,
    description: 'SLA policy created successfully',
    type: SlaPolicyResponseDto,
  })
  create(@Body() createSlaPolicyDto: CreateSlaPolicyDto) {
    return this.slaService.create(createSlaPolicyDto);
  }

  @Get()
  @Roles(UserRole.Admin, UserRole.ItStaff)
  @ApiOperation({ summary: 'Get all SLA policies' })
  @ApiResponse({
    status: 200,
    description: 'Returns all SLA policies',
    type: [SlaPolicyResponseDto],
  })
  findAll() {
    return this.slaService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.Admin, UserRole.ItStaff)
  @ApiOperation({ summary: 'Get a single SLA policy by ID' })
  @ApiParam({ name: 'id', description: 'SLA policy UUID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the SLA policy',
    type: SlaPolicyResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'SLA policy not found',
  })
  findOne(@Param('id') id: string) {
    return this.slaService.findOne(id);
  }

  @Get('priority/:priority')
  @Roles(UserRole.Admin, UserRole.ItStaff)
  @ApiOperation({ summary: 'Get SLA policy by priority level' })
  @ApiParam({ name: 'priority', enum: ['critical', 'high', 'medium', 'low'] })
  @ApiResponse({
    status: 200,
    description: 'Returns the SLA policy',
  })
  async findByPriority(@Param('priority') priority: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.slaService.findByPriority(priority as any);
  }

  @Patch(':id')
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: 'Update an SLA policy (Admin only)' })
  @ApiParam({ name: 'id', description: 'SLA policy UUID' })
  @ApiBody({ type: UpdateSlaPolicyDto })
  @ApiResponse({
    status: 200,
    description: 'SLA policy updated successfully',
    type: SlaPolicyResponseDto,
  })
  // eslint-disable-next-line prettier/prettier
  update(@Param('id') id: string, @Body() updateSlaPolicyDto: UpdateSlaPolicyDto) {
    return this.slaService.update(id, updateSlaPolicyDto);
  }

  @Delete(':id')
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: 'Delete an SLA policy (Admin only)' })
  @ApiParam({ name: 'id', description: 'SLA policy UUID' })
  @ApiResponse({
    status: 200,
    description: 'SLA policy deleted successfully',
  })
  remove(@Param('id') id: string) {
    return this.slaService.remove(id);
  }
}
