import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
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
import { UserRole } from '@prisma/client';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CategoriesService } from './categories.service';
import { CreateTicketCategoryDto } from '../dto/categories/create-category.dto';
import { UpdateTicketCategoryDto } from '../dto/categories/update-category.dto';
import { CategoryResponseDto } from '../dto/categories/category-response.dto';

@ApiTags('ticket-categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ticket-categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @Roles(UserRole.Admin)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Create a new ticket category (Admin only)' })
  @ApiBody({ type: CreateTicketCategoryDto })
  @ApiResponse({
    status: 201,
    description: 'Category created successfully',
    type: CategoryResponseDto,
  })
  create(@Body() createCategoryDto: CreateTicketCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all ticket categories' })
  @ApiQuery({ name: 'includeInactive', required: false, type: 'boolean' })
  @ApiResponse({
    status: 200,
    description: 'Returns all categories',
    type: [CategoryResponseDto],
  })
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.categoriesService.findAll(includeInactive === 'true');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single category by ID' })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the category',
    type: CategoryResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Category not found',
  })
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.Admin)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update a category (Admin only)' })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @ApiBody({ type: UpdateTicketCategoryDto })
  @ApiResponse({
    status: 200,
    description: 'Category updated successfully',
    type: CategoryResponseDto,
  })
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateTicketCategoryDto,
  ) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @Roles(UserRole.Admin)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Soft delete a category (Admin only)' })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @ApiResponse({
    status: 200,
    description: 'Category deleted successfully',
  })
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
