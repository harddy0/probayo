import { Test, TestingModule } from '@nestjs/testing';
import { PriorityLevel } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SlaService } from './sla.service';

describe('SlaService', () => {
  let service: SlaService;
  const prismaMock = {
    slaPolicy: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlaService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<SlaService>(SlaService);
    prismaMock.slaPolicy.findUnique.mockReset();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('uses default minute-based SLA deadlines when no policy exists', async () => {
    prismaMock.slaPolicy.findUnique.mockResolvedValue(null);

    const startDate = new Date('2026-05-04T10:00:00.000Z');
    const deadlines = await service.calculateDeadlines(
      PriorityLevel.Critical,
      startDate,
    );

    expect(deadlines.ack.toISOString()).toBe(
      new Date(startDate.getTime() + 15 * 60 * 1000).toISOString(),
    );
    expect(deadlines.resolution.toISOString()).toBe(
      new Date(startDate.getTime() + 240 * 60 * 1000).toISOString(),
    );
  });
});
