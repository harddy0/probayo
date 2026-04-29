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

  async findAll() {
    return await this.prisma.user.findMany();
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
    const { departmentId, ...userData } = updateUserDto;
    const data: any = { ...userData };
    if (departmentId !== null && departmentId !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      data.departmentId = departmentId;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    return await this.prisma.user.update({
      where: { id },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data,
    });
  }

  async remove(id: string) {
    return await this.prisma.user.delete({
      where: { id },
    });
  }
}
