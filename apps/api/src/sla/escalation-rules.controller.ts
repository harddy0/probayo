import { Controller, Get, Body, Patch, Param, UseGuards } from '@nestjs/common';
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
import { EscalationRulesService } from './escalation-rules.service';
import { UpdateEscalationRuleDto } from './dto/update-escalation-rule.dto';
import { EscalationRuleResponseDto } from './dto/escalation-rule-response.dto';

@ApiTags('SLA Escalation Rules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sla-escalation-rules')
export class EscalationRulesController {
  constructor(
    private readonly escalationRulesService: EscalationRulesService,
  ) {}

  @Get()
  @Roles(UserRole.Admin, UserRole.ItStaff)
  @ApiOperation({ summary: 'Get all escalation rules' })
  @ApiResponse({
    status: 200,
    description: 'Returns all escalation rules',
    type: [EscalationRuleResponseDto],
  })
  findAll() {
    return this.escalationRulesService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.Admin, UserRole.ItStaff)
  @ApiOperation({ summary: 'Get a single escalation rule by ID' })
  @ApiParam({ name: 'id', description: 'Escalation rule UUID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the escalation rule',
    type: EscalationRuleResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Escalation rule not found' })
  findOne(@Param('id') id: string) {
    return this.escalationRulesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: 'Update an escalation rule (Admin only)' })
  @ApiParam({ name: 'id', description: 'Escalation rule UUID' })
  @ApiBody({ type: UpdateEscalationRuleDto })
  @ApiResponse({
    status: 200,
    description: 'Escalation rule updated successfully',
    type: EscalationRuleResponseDto,
  })
  update(
    @Param('id') id: string,
    @Body() updateEscalationRuleDto: UpdateEscalationRuleDto,
  ) {
    return this.escalationRulesService.update(id, updateEscalationRuleDto);
  }
}
