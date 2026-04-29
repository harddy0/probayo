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
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { AssetsService } from './assets.service';

@ApiTags('assets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  @UseGuards(RolesGuard)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  @Roles(UserRole.Admin, UserRole.ItStaff)
  @ApiOperation({ summary: 'Create a new asset' })
  @ApiBody({ type: CreateAssetDto })
  @ApiResponse({ status: 201, description: 'Asset successfully created.' })
  create(@Body() createAssetDto: CreateAssetDto) {
    return this.assetsService.create(createAssetDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all assets' })
  @ApiResponse({ status: 200, description: 'Returns all assets.' })
  findAll() {
    return this.assetsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single asset by ID' })
  @ApiParam({
    name: 'id',
    description: 'UUID of the asset to retrieve',
    type: 'string',
  })
  @ApiResponse({ status: 200, description: 'Returns the requested asset.' })
  findOne(@Param('id') id: string) {
    return this.assetsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  @Roles(UserRole.Admin, UserRole.ItStaff)
  @ApiOperation({ summary: 'Update an existing asset' })
  @ApiParam({
    name: 'id',
    description: 'UUID of the asset to update',
    type: 'string',
  })
  @ApiBody({ type: CreateAssetDto })
  @ApiResponse({ status: 200, description: 'Asset successfully updated.' })
  update(@Param('id') id: string, @Body() updateAssetDto: UpdateAssetDto) {
    return this.assetsService.update(id, updateAssetDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Admin, UserRole.ItStaff)
  @ApiOperation({ summary: 'Delete an asset by ID' })
  @ApiParam({
    name: 'id',
    description: 'UUID of the asset to delete',
    type: 'string',
  })
  @ApiResponse({ status: 200, description: 'Asset successfully deleted.' })
  remove(@Param('id') id: string) {
    return this.assetsService.remove(id);
  }
}
