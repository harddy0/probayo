import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JOB_NAMES, QUEUE_NAMES } from '../queues/constants/queue.constants';

jest.mock('crypto', () => {
  const actual = jest.requireActual('crypto');
  return {
    ...actual,
    randomBytes: jest.fn(),
  };
});

jest.mock('bcrypt', () => {
  const actual = jest.requireActual('bcrypt');
  return {
    ...actual,
    hash: jest.fn(),
    compare: jest.fn(),
  };
});

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    findByEmail: jest.fn(),
    findOne: jest.fn(),
    updatePasswordHash: jest.fn(),
  };

  const mockPrismaService = {
    passwordResetToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockMailQueue = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: getQueueToken(QUEUE_NAMES.MAIL), useValue: mockMailQueue },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('requestPasswordReset', () => {
    it('returns null when user not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const result = await service.requestPasswordReset('missing@test.com');

      expect(result).toBeNull();
      expect(mockMailQueue.add).not.toHaveBeenCalled();
    });

    it('returns null when user inactive', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'user@test.com',
        isActive: false,
      });

      const result = await service.requestPasswordReset('user@test.com');

      expect(result).toBeNull();
      expect(mockMailQueue.add).not.toHaveBeenCalled();
    });

    it('queues a password reset email job', async () => {
      const user = {
        id: 'user-1',
        email: 'user@test.com',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
      };

      mockUsersService.findByEmail.mockResolvedValue(user);
      mockPrismaService.passwordResetToken.create.mockResolvedValue({});
      mockMailQueue.add.mockResolvedValue({});
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'RESET_TOKEN_TTL_MINUTES') return 60;
        if (key === 'FRONTEND_BASE_URL') return 'https://app.example.com';
        return undefined;
      });

      const tokenBuffer = Buffer.from('a'.repeat(32));
      (crypto.randomBytes as jest.Mock).mockReturnValue(tokenBuffer);

      const result = await service.requestPasswordReset('user@test.com', {
        requestIp: '127.0.0.1',
        userAgent: 'jest',
        frontendBaseUrl: 'https://custom.example.com',
      });

      expect(result).not.toBeNull();
      expect(mockPrismaService.passwordResetToken.create).toHaveBeenCalled();
      expect(mockMailQueue.add).toHaveBeenCalledWith(
        JOB_NAMES.SEND_PASSWORD_RESET_EMAIL,
        expect.objectContaining({
          to: 'user@test.com',
          firstName: 'Test',
          lastName: 'User',
          resetUrl: expect.stringContaining('https://custom.example.com'),
        }),
        expect.objectContaining({
          attempts: 3,
          removeOnComplete: true,
          removeOnFail: false,
        }),
      );
    });
  });

  describe('resetPassword', () => {
    it('throws when passwords do not match', async () => {
      await expect(
        service.resetPassword('token', 'newpass', 'different'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws when token is invalid', async () => {
      mockPrismaService.passwordResetToken.findFirst.mockResolvedValue(null);

      await expect(
        service.resetPassword('token', 'newpass', 'newpass'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('resets password when token is valid', async () => {
      mockPrismaService.passwordResetToken.findFirst.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
      });
      mockPrismaService.passwordResetToken.update.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.$transaction.mockResolvedValue([]);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

      await service.resetPassword('token', 'newpass', 'newpass');

      expect(mockPrismaService.passwordResetToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'token-1' },
        }),
      );
      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: { passwordHash: 'hashed' },
        }),
      );
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    });
  });
});
