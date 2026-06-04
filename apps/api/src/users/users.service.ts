import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    // 1. Extract the raw password from the DTO
    const { passwordHash, departmentId, ...userData } = createUserDto;

    // 2. Generate the hash
    const saltRounds = 10;
    const hashedValue = await bcrypt.hash(passwordHash, saltRounds);

    // 3. Prepare data object
    const data: any = {
      ...userData,
      passwordHash: hashedValue,
    };

    // Only include departmentId if it's not null
    if (departmentId !== null) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      data.departmentId = departmentId;
    }

    // 4. Save to database
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    return await this.prisma.user.create({ data });
  }

  async findAll(search?: string) {
    const where: any = {};

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { firstName: { contains: term } },
        { lastName: { contains: term } },
        { email: { contains: term } },
      ];
    }

    return await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        departmentId: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { firstName: 'asc' },
    });
  }

  async findByEmail(email: string) {
    return await this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findOne(id: string) {
    return await this.prisma.user.findUnique({
      where: { id },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const data: { firstName?: string; lastName?: string } = {};

    if (updateUserDto.firstName !== undefined) {
      data.firstName = updateUserDto.firstName;
    }

    if (updateUserDto.lastName !== undefined) {
      data.lastName = updateUserDto.lastName;
    }

    return await this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async updatePasswordHash(id: string, passwordHash: string) {
    return await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
  }

  async resetPasswordToDefault(id: string) {
    const defaultPassword = '12345678password';
    const saltRounds = 10;
    const hashedValue = await bcrypt.hash(defaultPassword, saltRounds);

    return await this.prisma.user.update({
      where: { id },
      data: { passwordHash: hashedValue },
    });
  }

  async updateStatus(id: string, isActive: boolean) {
    return await this.prisma.user.update({
      where: { id },
      data: { isActive },
    });
  }

  async remove(id: string) {
    return await this.prisma.user.delete({
      where: { id },
    });
  }
}
