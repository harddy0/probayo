import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
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
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateAndAttachDto } from './dto/create-and-attach.dto';
import { CreateKnownIssueDto } from './dto/create-known-issue.dto';
import { UpdateKnownIssueDto } from './dto/update-known-issue.dto';
import { KnownIssuesService } from './known-issues.service';

@ApiTags('known-issues')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('known-issues')
export class KnownIssuesController {
  constructor(private readonly knownIssuesService: KnownIssuesService) {}

  @Get('active')
  @ApiOperation({ summary: 'List active known issues for deflection' })
  @ApiResponse({
    status: 200,
    description: 'Returns active known issues for deflection',
  })
  findAllActiveForDeflection() {
    return this.knownIssuesService.findAllActiveForDeflection();
  }

  @Get()
  @ApiOperation({ summary: 'List known issues' })
  @ApiQuery({
    name: 'includeResolved',
    required: false,
    type: Boolean,
    description: 'Include resolved known issues',
  })
  @ApiResponse({ status: 200, description: 'Returns known issues' })
  findAll(@Query('includeResolved') includeResolved?: string) {
    return this.knownIssuesService.findAll(includeResolved === 'true');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a known issue by ID' })
  @ApiParam({ name: 'id', description: 'Known issue UUID' })
  @ApiResponse({ status: 200, description: 'Returns the known issue' })
  @ApiResponse({ status: 404, description: 'Known issue not found' })
  findOne(@Param('id') id: string) {
    return this.knownIssuesService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.Admin, UserRole.ItStaff)
  @ApiOperation({ summary: 'Create a known issue' })
  @ApiBody({ type: CreateKnownIssueDto })
  @ApiResponse({ status: 201, description: 'Known issue created successfully' })
  create(
    @Request() req: { user: { id: string } },
    @Body() createKnownIssueDto: CreateKnownIssueDto,
  ) {
    return this.knownIssuesService.create(req.user.id, createKnownIssueDto);
  }

  @Post('create-and-attach')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Admin, UserRole.ItStaff)
  @ApiOperation({ summary: 'Create a known issue and attach tickets' })
  @ApiBody({ type: CreateAndAttachDto })
  @ApiResponse({
    status: 201,
    description: 'Known issue created and tickets attached successfully',
  })
  createAndAttach(
    @Request() req: { user: { id: string } },
    @Body() createAndAttachDto: CreateAndAttachDto,
  ) {
    return this.knownIssuesService.createAndAttach(
      req.user.id,
      createAndAttachDto,
    );
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Admin, UserRole.ItStaff)
  @ApiOperation({ summary: 'Update a known issue' })
  @ApiParam({ name: 'id', description: 'Known issue UUID' })
  @ApiBody({ type: UpdateKnownIssueDto })
  @ApiResponse({ status: 200, description: 'Known issue updated successfully' })
  update(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
    @Body() updateKnownIssueDto: UpdateKnownIssueDto,
  ) {
    return this.knownIssuesService.update(
      id,
      req.user.id,
      updateKnownIssueDto,
    );
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Admin, UserRole.ItStaff)
  @ApiOperation({ summary: 'Delete a known issue' })
  @ApiParam({ name: 'id', description: 'Known issue UUID' })
  @ApiResponse({ status: 200, description: 'Known issue deleted successfully' })
  remove(@Param('id') id: string) {
    return this.knownIssuesService.remove(id);
  }
}
