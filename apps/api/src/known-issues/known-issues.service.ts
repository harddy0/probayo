import { Injectable, NotFoundException } from '@nestjs/common';
import { KnownIssueStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAndAttachDto } from './dto/create-and-attach.dto';
import { CreateKnownIssueDto } from './dto/create-known-issue.dto';
import { UpdateKnownIssueDto } from './dto/update-known-issue.dto';

@Injectable()
export class KnownIssuesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAllActiveForDeflection() {
    return this.prisma.knownIssue.findMany({
      where: {
        status: KnownIssueStatus.Active,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, dto: CreateKnownIssueDto) {
    return this.prisma.knownIssue.create({
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status ?? KnownIssueStatus.Active,
        createdByUserId: userId,
      },
    });
  }

  async createAndAttach(userId: string, dto: CreateAndAttachDto) {
    return this.prisma.$transaction(async (tx) => {
      const issue = await tx.knownIssue.create({
        data: {
          title: dto.title,
          description: dto.description,
          status: dto.status ?? KnownIssueStatus.Active,
          createdByUserId: userId,
        },
      });

      await tx.ticket.updateMany({
        where: { id: { in: dto.ticketIds } },
        data: { knownIssueId: issue.id },
      });

      return tx.knownIssue.findUnique({
        where: { id: issue.id },
        include: {
          tickets: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
              filedByUser: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      });
    });
  }

  async findAll(includeResolved: boolean) {
    return this.prisma.knownIssue.findMany({
      where: {
        deletedAt: null,
        ...(includeResolved ? {} : { status: KnownIssueStatus.Active }),
      },
      include: {
        _count: {
          select: { tickets: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const issue = await this.prisma.knownIssue.findFirst({
      where: { id, deletedAt: null },
      include: {
        tickets: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            filedByUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!issue) {
      throw new NotFoundException(`Known issue ${id} not found`);
    }

    return issue;
  }

  async update(
    id: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    userId: string,
    dto: UpdateKnownIssueDto,
  ) {
    const existingIssue = await this.prisma.knownIssue.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existingIssue) {
      throw new NotFoundException(`Known issue ${id} not found`);
    }

    const isResolving =
      existingIssue.status === KnownIssueStatus.Active &&
      dto.status === KnownIssueStatus.Resolved;

    const updatedIssue = await this.prisma.knownIssue.update({
      where: { id },
      data: {
        ...dto,
        ...(isResolving ? { resolvedAt: new Date() } : {}),
      },
    });

    if (isResolving) {
      void this.notificationsService.notifyKnownIssueResolved(
        updatedIssue.id,
        updatedIssue.title,
        updatedIssue.description,
      );
    }

    return updatedIssue;
  }

  async remove(id: string) {
    const issue = await this.prisma.knownIssue.findFirst({
      where: { id, deletedAt: null },
    });

    if (!issue) {
      throw new NotFoundException(`Known issue ${id} not found`);
    }

    return this.prisma.knownIssue.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
