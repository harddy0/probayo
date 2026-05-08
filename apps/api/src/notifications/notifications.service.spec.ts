// src/notifications/notifications.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { getQueueToken } from '@nestjs/bullmq';
import { JOB_NAMES } from '../queues/constants/queue.constants';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const mockPrismaService = {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  };

  const mockNotificationsQueue = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: getQueueToken('notifications'),
          useValue: mockNotificationsQueue,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findITStaff', () => {
    it('should find all active IT staff and admin users', async () => {
      const mockUsers = [
        {
          id: '1',
          email: 'admin@test.com',
          firstName: 'Admin',
          lastName: 'User',
          role: 'Admin',
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.findITStaff();
      expect(result).toEqual(mockUsers);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: {
          role: {
            in: ['ItStaff', 'Admin'],
          },
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      });
    });
  });

  describe('notifyTicketCreated', () => {
    it('should queue a notification job', async () => {
      mockNotificationsQueue.add.mockResolvedValue({});

      const notificationsService = service as {
        notifyTicketCreated: (
          ticketId: string,
          ticketTitle: string,
          filedByName: string,
          departmentName: string,
          priority: string,
        ) => Promise<void>;
      };

      await notificationsService.notifyTicketCreated(
        'ticket1',
        'Test Ticket',
        'John Doe',
        'IT',
        'High',
      );

      expect(mockNotificationsQueue.add).toHaveBeenCalledWith(
        JOB_NAMES.SEND_TICKET_CREATED_NOTIFICATION,
        {
          ticketId: 'ticket1',
          ticketTitle: 'Test Ticket',
          filedByName: 'John Doe',
          departmentName: 'IT',
          priority: 'High',
        },
        expect.objectContaining({
          attempts: 3,
          removeOnComplete: true,
          removeOnFail: false,
        }),
      );
    });

    it('should create notifications for all IT staff', async () => {
      const mockITStaff = [
        {
          id: '1',
          email: 'admin@test.com',
          firstName: 'Admin',
          lastName: 'User',
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockITStaff);
      mockPrismaService.notification.create.mockResolvedValue({});

      const notificationsService = service as {
        createTicketCreatedNotifications: (
          ticketId: string,
          ticketTitle: string,
          filedByName: string,
          departmentName: string,
          priority: string,
        ) => Promise<void>;
      };

      await notificationsService.createTicketCreatedNotifications(
        'ticket1',
        'Test Ticket',
        'John Doe',
        'IT',
        'High',
      );

      expect(mockPrismaService.notification.create).toHaveBeenCalledTimes(1);
    });

    it('should handle no IT staff gracefully', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);

      const notificationsService = service as {
        createTicketCreatedNotifications: (
          ticketId: string,
          ticketTitle: string,
          filedByName: string,
          departmentName: string,
          priority: string,
        ) => Promise<void>;
      };

      await expect(
        notificationsService.createTicketCreatedNotifications(
          'ticket1',
          'Test',
          'John',
          'IT',
          'High',
        ),
      ).resolves.not.toThrow();
    });
  });
});
