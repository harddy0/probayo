import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTicketCategoryDto } from '../dto/categories/create-category.dto';
import { UpdateTicketCategoryDto } from '../dto/categories/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(createCategoryDto: CreateTicketCategoryDto) {
    return this.prisma.ticketCategory.create({
      data: {
        name: createCategoryDto.name,
        description: createCategoryDto.description,
        isActive: createCategoryDto.isActive ?? true,
      },
    });
  }

  async findAll(includeInactive: boolean = false) {
    const where = includeInactive ? {} : { isActive: true, deletedAt: null };

    return this.prisma.ticketCategory.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { tickets: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.ticketCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { tickets: true },
        },
      },
    });

    if (!category || category.deletedAt) {
      throw new NotFoundException(`Category ${id} not found`);
    }

    return category;
  }

  async update(id: string, updateCategoryDto: UpdateTicketCategoryDto) {
    await this.findOne(id);

    return this.prisma.ticketCategory.update({
      where: { id },
      data: {
        name: updateCategoryDto.name,
        description: updateCategoryDto.description,
        isActive: updateCategoryDto.isActive,
        deletedAt: updateCategoryDto.deletedAt,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    // Soft delete
    return this.prisma.ticketCategory.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
