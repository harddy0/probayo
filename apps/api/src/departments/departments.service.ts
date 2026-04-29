import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDepartmentDto: CreateDepartmentDto) {
    const { headUserId, ...departmentData } = createDepartmentDto;

    return await this.prisma.department.create({
      data: {
        ...departmentData,
        ...(headUserId !== null && headUserId !== undefined
          ? { headUserId }
          : {}),
      },
    });
  }

  async findAll() {
    return await this.prisma.department.findMany({
      include: {
        headUser: true,
      },
    });
  }

  async findOne(id: string) {
    return await this.prisma.department.findUnique({
      where: { id },
      include: {
        headUser: true,
        members: true,
      },
    });
  }

  async update(id: string, updateDepartmentDto: UpdateDepartmentDto) {
    const { headUserId, ...departmentData } = updateDepartmentDto;

    return await this.prisma.department.update({
      where: { id },
      data: {
        ...departmentData,
        ...(headUserId !== null && headUserId !== undefined
          ? { headUserId }
          : {}),
      },
    });
  }

  async remove(id: string) {
    return await this.prisma.department.delete({
      where: { id },
    });
  }
}