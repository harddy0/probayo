import {
  Controller,
  Get,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ActiveUserGuard } from '../auth/guards/active-user.guard';
import { DepartmentHeadService } from './department-head.service';
import { TicketResponseDto } from '../tickets/dto/ticket-response.dto';
import { DepartmentHeadTicketPageDto } from './dto/department-head-ticket-page.dto';
import { DepartmentHeadWeeklySummaryDto } from './dto/department-head-weekly-summary.dto';
import { DepartmentHeadSlaBreachesResponseDto } from './dto/department-head-sla-breaches.dto';
import { DepartmentHeadResolutionMetricsDto } from './dto/department-head-resolution-metrics.dto';
import { PaginateQuery } from 'nestjs-paginate';

type DepartmentHeadTicketQuery = PaginateQuery & {
  status?: string;
  priority?: string;
  categoryId?: string;
  assignedToUserId?: string;
  fromDate?: string;
  toDate?: string;
};

@ApiTags('department-head')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
@Roles(UserRole.DepartmentHead)
@Controller('department-head')
export class DepartmentHeadController {
  constructor(private readonly departmentHeadService: DepartmentHeadService) {}

  @Get('tickets')
  @ApiOperation({ summary: 'List department tickets (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: [String],
    description: 'Format: field:ASC or field:DESC',
  })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'priority', required: false, type: String })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'assignedToUserId', required: false, type: String })
  @ApiQuery({
    name: 'fromDate',
    required: false,
    type: String,
    description: 'ISO date string for createdAt start filter',
  })
  @ApiQuery({
    name: 'toDate',
    required: false,
    type: String,
    description: 'ISO date string for createdAt end filter',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of department tickets',
    type: DepartmentHeadTicketPageDto,
  })
  getTickets(
    @Request() req: { user: { id: string } },
    @Query() query: DepartmentHeadTicketQuery,
  ) {
    return this.departmentHeadService.getTickets(req.user.id, query);
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Get a department ticket by ID' })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the ticket detail',
    type: TicketResponseDto,
  })
  getTicketById(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.departmentHeadService.getTicketById(req.user.id, id);
  }

  @Get('reports/weekly-summary')
  @ApiOperation({ summary: 'Weekly summary report for department' })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Weekly summary metrics',
    type: DepartmentHeadWeeklySummaryDto,
  })
  getWeeklySummary(
    @Request() req: { user: { id: string } },
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.departmentHeadService.getWeeklySummary(
      req.user.id,
      fromDate,
      toDate,
    );
  }

  @Get('reports/sla-breaches')
  @ApiOperation({ summary: 'SLA breach report for department' })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'SLA breach list and totals',
    type: DepartmentHeadSlaBreachesResponseDto,
  })
  getSlaBreaches(
    @Request() req: { user: { id: string } },
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.departmentHeadService.getSlaBreaches(
      req.user.id,
      fromDate,
      toDate,
    );
  }

  @Get('reports/resolution-metrics')
  @ApiOperation({ summary: 'Resolution time metrics for department' })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Resolution metrics',
    type: DepartmentHeadResolutionMetricsDto,
  })
  getResolutionMetrics(
    @Request() req: { user: { id: string } },
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.departmentHeadService.getResolutionMetrics(
      req.user.id,
      fromDate,
      toDate,
    );
  }
}
