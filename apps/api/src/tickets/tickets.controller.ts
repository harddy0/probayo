import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole, Prisma } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketResponseDto } from './dto/ticket-response.dto';

@ApiTags('tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new ticket' })
  @ApiBody({ type: CreateTicketDto })
  @ApiResponse({
    status: 201,
    description: 'Ticket created successfully',
    type: TicketResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(
    @Request()
    req: {
      user: { id: string; role?: UserRole; departmentId?: string | null };
    },
    @Body() createTicketDto: CreateTicketDto,
  ) {
    return this.ticketsService.create(req.user.id, createTicketDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all tickets (filtered by role)' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: [
      'open',
      'acknowledged',
      'in_progress',
      'pending_user',
      'resolved',
      'closed',
    ],
  })
  @ApiQuery({
    name: 'priority',
    required: false,
    enum: ['critical', 'high', 'medium', 'low'],
  })
  @ApiQuery({ name: 'assignedToUserId', required: false, type: 'string' })
  @ApiQuery({ name: 'departmentId', required: false, type: 'string' })
  @ApiQuery({ name: 'categoryId', required: false, type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Returns all tickets',
    type: [TicketResponseDto],
  })
  findAll(
    @Request()
    req: {
      user: { id: string; role?: UserRole; departmentId?: string | null };
    },
    @Query() filters: any,
  ) {
    return this.ticketsService.findAll(
      req.user.id,
      filters as Prisma.TicketWhereInput,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single ticket by ID' })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the ticket',
    type: TicketResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  findOne(
    @Param('id') id: string,
    @Request()
    req: {
      user: { id: string; role?: UserRole; departmentId?: string | null };
    },
  ) {
    return this.ticketsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a ticket' })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  @ApiBody({ type: UpdateTicketDto })
  @ApiResponse({
    status: 200,
    description: 'Ticket updated successfully',
    type: TicketResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  update(
    @Param('id') id: string,
    @Request()
    req: {
      user: { id: string; role?: UserRole; departmentId?: string | null };
    },
    @Body() updateTicketDto: UpdateTicketDto,
  ) {
    return this.ticketsService.update(id, req.user.id, updateTicketDto);
  }

  @Delete(':id')
  @Roles(UserRole.Admin, UserRole.ItStaff)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Delete/close a ticket (Admin/IT only)' })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  @ApiResponse({
    status: 200,
    description: 'Ticket closed/deleted successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin/IT only' })
  remove(
    @Param('id') id: string,
    @Request()
    req: {
      user: { id: string; role?: UserRole; departmentId?: string | null };
    },
  ) {
    return this.ticketsService.remove(id, req.user.id);
  }

  @Post(':id/assign/:userId')
  @Roles(UserRole.Admin, UserRole.ItStaff)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Assign ticket to IT staff (Admin/IT only)' })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  @ApiParam({ name: 'userId', description: 'User UUID to assign' })
  @ApiResponse({
    status: 200,
    description: 'Ticket assigned successfully',
  })
  assign(@Param('id') id: string, @Param('userId') userId: string) {
    return this.ticketsService.assignTicket(id, userId);
  }

  @Post(':id/unassign')
  @Roles(UserRole.Admin, UserRole.ItStaff)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Unassign ticket (Admin/IT only)' })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  @ApiResponse({
    status: 200,
    description: 'Ticket unassigned successfully',
  })
  unassign(@Param('id') id: string) {
    return this.ticketsService.unassignTicket(id);
  }
}
