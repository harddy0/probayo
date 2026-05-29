import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaginateQuery } from 'nestjs-paginate';
import { PrismaService } from '../prisma/prisma.service';
import { PriorityLevel, Prisma, TicketStatus, UserRole } from '@prisma/client';

type DateRange = {
  start: Date;
  end: Date;
};

type DepartmentHeadTicketQuery = PaginateQuery & {
  status?: string;
  priority?: string;
  categoryId?: string;
  assignedToUserId?: string;
  fromDate?: string;
  toDate?: string;
};

@Injectable()
export class DepartmentHeadService {
  constructor(private readonly prisma: PrismaService) {}

  async getTickets(userId: string, query: DepartmentHeadTicketQuery) {
    const departmentId = await this.getDepartmentIdForHead(userId);

    const where: Prisma.TicketWhereInput = {
      departmentId,
    };

    if (query.status) {
      const normalizedStatus = this.normalizeTicketStatus(query.status);
      if (!normalizedStatus) {
        throw new BadRequestException('Invalid status filter');
      }
      where.status = normalizedStatus;
    }

    if (query.priority) {
      const normalizedPriority = this.normalizePriority(query.priority);
      if (!normalizedPriority) {
        throw new BadRequestException('Invalid priority filter');
      }
      where.priority = normalizedPriority;
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.assignedToUserId) {
      where.assignedToUserId = query.assignedToUserId;
    }

    if (query.fromDate || query.toDate) {
      const range = this.resolveDateRange(query.fromDate, query.toDate);
      where.createdAt = {
        gte: range.start,
        lte: range.end,
      };
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search } },
        { description: { contains: query.search } },
      ];
    }

    const { page, limit, orderBy, meta } = this.resolvePagination(query);

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          filedByUser: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          assignedToUser: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          department: true,
          category: true,
          asset: true,
          _count: {
            select: {
              comments: true,
              attachments: true,
            },
          },
        },
      }),
      this.prisma.ticket.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const links = this.buildPageLinks(query, page, totalPages, limit);

    return {
      data: items,
      meta: {
        itemsPerPage: limit,
        totalItems,
        currentPage: page,
        totalPages,
        sortBy: meta.sortBy,
        searchBy: ['title', 'description'],
        filter: meta.filter,
      },
      links,
    };
  }

  async getTicketById(userId: string, ticketId: string) {
    const departmentId = await this.getDepartmentIdForHead(userId);

    const ticket = await this.prisma.ticket.findFirst({
      where: {
        id: ticketId,
        departmentId,
      },
      include: {
        filedByUser: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        assignedToUser: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        department: true,
        category: true,
        asset: true,
        comments: {
          where: { isInternal: false },
          include: {
            authorUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            attachments: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        attachments: {
          where: { commentId: null },
        },
        statusHistory: {
          include: {
            changedByUser: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { changedAt: 'desc' },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket ${ticketId} not found`);
    }

    return ticket;
  }

  async getWeeklySummary(userId: string, fromDate?: string, toDate?: string) {
    const departmentId = await this.getDepartmentIdForHead(userId);
    const range = this.resolveDateRange(fromDate, toDate);

    const baseWhere = {
      departmentId,
      createdAt: { gte: range.start, lte: range.end },
    };

    const [
      totalCreated,
      statusGroups,
      priorityGroups,
      ackBreaches,
      resolutionBreaches,
      totalBreached,
      resolutionMetrics,
    ] = await Promise.all([
      this.prisma.ticket.count({ where: baseWhere }),
      this.prisma.ticket.groupBy({
        by: ['status'],
        _count: { _all: true },
        where: baseWhere,
      }),
      this.prisma.ticket.groupBy({
        by: ['priority'],
        _count: { _all: true },
        where: baseWhere,
      }),
      this.prisma.ticket.count({
        where: { ...baseWhere, slaAckBreached: true },
      }),
      this.prisma.ticket.count({
        where: { ...baseWhere, slaResolutionBreached: true },
      }),
      this.prisma.ticket.count({
        where: {
          ...baseWhere,
          OR: [{ slaAckBreached: true }, { slaResolutionBreached: true }],
        },
      }),
      this.buildResolutionMetrics(departmentId, range),
    ]);

    const byStatus = statusGroups.reduce<Record<string, number>>(
      (acc, group) => {
        acc[group.status] = group._count._all;
        return acc;
      },
      {},
    );

    const byPriority = priorityGroups.reduce<Record<string, number>>(
      (acc, group) => {
        acc[group.priority] = group._count._all;
        return acc;
      },
      {},
    );

    return {
      rangeStart: range.start,
      rangeEnd: range.end,
      totalCreated,
      byStatus,
      byPriority,
      slaBreaches: {
        acknowledgement: ackBreaches,
        resolution: resolutionBreaches,
        totalTicketsBreached: totalBreached,
      },
      averageResolutionMinutes: resolutionMetrics.averageMinutes,
    };
  }

  async getSlaBreaches(userId: string, fromDate?: string, toDate?: string) {
    const departmentId = await this.getDepartmentIdForHead(userId);
    const range = this.resolveDateRange(fromDate, toDate);

    const items = await this.prisma.ticket.findMany({
      where: {
        departmentId,
        createdAt: { gte: range.start, lte: range.end },
        OR: [{ slaAckBreached: true }, { slaResolutionBreached: true }],
      },
      select: {
        id: true,
        title: true,
        priority: true,
        status: true,
        slaAckBreached: true,
        slaResolutionBreached: true,
        slaAckDeadline: true,
        slaResolutionDeadline: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      rangeStart: range.start,
      rangeEnd: range.end,
      total: items.length,
      items,
    };
  }

  async getResolutionMetrics(
    userId: string,
    fromDate?: string,
    toDate?: string,
  ) {
    const departmentId = await this.getDepartmentIdForHead(userId);
    const range = this.resolveDateRange(fromDate, toDate);

    return this.buildResolutionMetrics(departmentId, range);
  }

  private async getDepartmentIdForHead(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, departmentId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== UserRole.DepartmentHead) {
      throw new ForbiddenException('User is not a department head');
    }

    if (!user.departmentId) {
      throw new BadRequestException(
        'Department head must belong to a department',
      );
    }

    return user.departmentId;
  }

  private resolveDateRange(fromDate?: string, toDate?: string): DateRange {
    if (fromDate || toDate) {
      const start = fromDate
        ? this.parseDate(fromDate, 'fromDate')
        : new Date(0);
      const end = toDate ? this.parseDate(toDate, 'toDate') : new Date();

      if (start > end) {
        throw new BadRequestException('fromDate must be before toDate');
      }

      return { start, end };
    }

    const now = new Date();
    const day = now.getDay();
    const daysSinceMonday = (day + 6) % 7;

    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - daysSinceMonday);
    startOfThisWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);

    const endOfLastWeek = new Date(startOfThisWeek.getTime() - 1);

    return { start: startOfLastWeek, end: endOfLastWeek };
  }

  private parseDate(value: string, label: string): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`Invalid ${label} value`);
    }
    return parsed;
  }

  private normalizeTicketStatus(value: string): TicketStatus | undefined {
    if (Object.values(TicketStatus).includes(value as TicketStatus)) {
      return value as TicketStatus;
    }

    const normalized = value.toString().trim().toLowerCase();
    const mapped: Record<string, TicketStatus> = {
      open: TicketStatus.Open,
      acknowledged: TicketStatus.Acknowledged,
      pending_user: TicketStatus.PendingUser,
      in_progress: TicketStatus.InProgress,
      resolved: TicketStatus.Resolved,
      closed: TicketStatus.Closed,
    };

    return mapped[normalized];
  }

  private normalizePriority(value: string): PriorityLevel | undefined {
    if (Object.values(PriorityLevel).includes(value as PriorityLevel)) {
      return value as PriorityLevel;
    }

    const normalized = value.toString().trim().toLowerCase();
    const mapped: Record<string, PriorityLevel> = {
      critical: PriorityLevel.Critical,
      high: PriorityLevel.High,
      medium: PriorityLevel.Medium,
      low: PriorityLevel.Low,
    };

    return mapped[normalized];
  }

  private resolvePagination(query: DepartmentHeadTicketQuery) {
    const page = this.parsePositiveNumber(query.page, 1);
    const limit = Math.min(this.parsePositiveNumber(query.limit, 50), 50);
    const sortBy = this.normalizeSortBy(query.sortBy);
    const orderBy = sortBy.map(([field, direction]) => ({
      [field]: direction,
    }));

    if (orderBy.length === 0) {
      orderBy.push({ createdAt: 'desc' });
    }

    return {
      page,
      limit,
      orderBy,
      meta: {
        sortBy: sortBy.map(([field, direction]) => `${field}:${direction}`),
        filter: this.buildMetaFilter(query),
      },
    };
  }

  private buildMetaFilter(query: DepartmentHeadTicketQuery) {
    const filter: Record<string, string> = {};

    if (query.status) filter.status = query.status;
    if (query.priority) filter.priority = query.priority;
    if (query.categoryId) filter.categoryId = query.categoryId;
    if (query.assignedToUserId)
      filter.assignedToUserId = query.assignedToUserId;
    if (query.fromDate) filter.fromDate = query.fromDate;
    if (query.toDate) filter.toDate = query.toDate;

    return Object.keys(filter).length > 0 ? filter : undefined;
  }

  private normalizeSortBy(value?: string[] | string | [string, string][]) {
    const raw = Array.isArray(value) ? value : value ? [value] : [];
    const allowed = new Set([
      'createdAt',
      'priority',
      'status',
      'slaAckDeadline',
      'slaResolutionDeadline',
    ]);

    return raw
      .map((entry) => {
        if (Array.isArray(entry)) {
          const [field, direction] = entry;
          if (!field || !allowed.has(field)) return null;
          const normalizedDirection =
            direction?.toLowerCase() === 'asc' ? 'asc' : 'desc';
          return [field, normalizedDirection] as const;
        }

        const [field, direction] = entry.split(':');
        if (!field || !allowed.has(field)) return null;
        const normalizedDirection =
          direction?.toLowerCase() === 'asc' ? 'asc' : 'desc';
        return [field, normalizedDirection] as const;
      })
      .filter((entry): entry is Readonly<[string, 'asc' | 'desc']> => !!entry);
  }

  private parsePositiveNumber(value: unknown, fallback: number): number {
    if (value == null) return fallback;
    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed <= 0) return fallback;
    return Math.floor(parsed);
  }

  private buildPageLinks(
    query: DepartmentHeadTicketQuery,
    page: number,
    totalPages: number,
    limit: number,
  ) {
    const buildUrl = (targetPage: number) => {
      const params = new URLSearchParams();
      params.set('page', String(targetPage));
      params.set('limit', String(limit));

      const sortBy = this.normalizeSortBy(query.sortBy);
      sortBy.forEach(([field, direction]) => {
        params.append('sortBy', `${field}:${direction}`);
      });

      if (query.search) params.set('search', query.search);
      if (query.status) params.set('status', query.status);
      if (query.priority) params.set('priority', query.priority);
      if (query.categoryId) params.set('categoryId', query.categoryId);
      if (query.assignedToUserId)
        params.set('assignedToUserId', query.assignedToUserId);
      if (query.fromDate) params.set('fromDate', query.fromDate);
      if (query.toDate) params.set('toDate', query.toDate);

      return `/department-head/tickets?${params.toString()}`;
    };

    const first = buildUrl(1);
    const last = buildUrl(totalPages);
    const previous = page > 1 ? buildUrl(page - 1) : undefined;
    const next = page < totalPages ? buildUrl(page + 1) : undefined;

    return {
      first,
      previous,
      next,
      last,
    };
  }

  private async buildResolutionMetrics(departmentId: string, range: DateRange) {
    const resolvedTickets = await this.prisma.ticket.findMany({
      where: {
        departmentId,
        OR: [
          { resolvedAt: { gte: range.start, lte: range.end } },
          { closedAt: { gte: range.start, lte: range.end } },
        ],
      },
      select: {
        id: true,
        createdAt: true,
        resolvedAt: true,
        closedAt: true,
        priority: true,
      },
    });

    const durations: number[] = [];
    const byPriority = new Map<PriorityLevel, number[]>();

    for (const ticket of resolvedTickets) {
      const resolvedAt = ticket.resolvedAt ?? ticket.closedAt;
      if (!resolvedAt) {
        continue;
      }

      const minutes = this.calculateResolutionMinutes(
        ticket.createdAt,
        resolvedAt,
      );

      durations.push(minutes);

      const bucket = byPriority.get(ticket.priority) ?? [];
      bucket.push(minutes);
      byPriority.set(ticket.priority, bucket);
    }

    const overall = this.buildStats(durations);

    const byPriorityMetrics = Array.from(byPriority.entries()).map(
      ([priority, values]) => ({
        priority,
        resolvedCount: values.length,
        averageMinutes: this.average(values),
        medianMinutes: this.median(values),
        maxMinutes: values.length ? Math.max(...values) : null,
      }),
    );

    return {
      rangeStart: range.start,
      rangeEnd: range.end,
      resolvedCount: durations.length,
      averageMinutes: overall.averageMinutes,
      medianMinutes: overall.medianMinutes,
      maxMinutes: overall.maxMinutes,
      byPriority: byPriorityMetrics,
    };
  }

  private calculateResolutionMinutes(start: Date, end: Date): number {
    const diffMs = end.getTime() - start.getTime();
    return Math.max(0, Math.round(diffMs / 60000));
  }

  private buildStats(values: number[]) {
    return {
      averageMinutes: this.average(values),
      medianMinutes: this.median(values),
      maxMinutes: values.length ? Math.max(...values) : null,
    };
  }

  private average(values: number[]): number | null {
    if (values.length === 0) return null;
    const sum = values.reduce((acc, value) => acc + value, 0);
    return Math.round(sum / values.length);
  }

  private median(values: number[]): number | null {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
    }
    return sorted[mid];
  }
}
