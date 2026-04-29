import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createAssetDto: CreateAssetDto) {
    const { purchasedAt, assignedToUserId, ...assetData } = createAssetDto;

    return await this.prisma.asset.create({
      data: {
        ...assetData,
        ...(assignedToUserId !== null && assignedToUserId !== undefined
          ? { assignedToUserId }
          : {}),
        ...(purchasedAt !== null && purchasedAt !== undefined
          ? { purchasedAt: new Date(purchasedAt) }
          : {}),
      },
    });
  }

  async findAll() {
    return await this.prisma.asset.findMany({
      include: {
        assignedToUser: true,
      },
    });
  }

  async findOne(id: string) {
    return await this.prisma.asset.findUnique({
      where: { id },
      include: {
        assignedToUser: true,
        tickets: true,
      },
    });
  }

  async update(id: string, updateAssetDto: UpdateAssetDto) {
    const { purchasedAt, assignedToUserId, ...assetData } = updateAssetDto;

    return await this.prisma.asset.update({
      where: { id },
      data: {
        ...assetData,
        ...(assignedToUserId !== null && assignedToUserId !== undefined
          ? { assignedToUserId }
          : {}),
        ...(purchasedAt !== null && purchasedAt !== undefined
          ? { purchasedAt: new Date(purchasedAt) }
          : {}),
      },
    });
  }

  async remove(id: string) {
    return await this.prisma.asset.delete({
      where: { id },
    });
  }
}
