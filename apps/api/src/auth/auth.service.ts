import {
  Injectable,
  Inject,
  forwardRef,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { LoginResponseDto } from './dto/login-response.dto';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordResetRequestResultDto } from './dto/password-reset-request-result.dto';
import {
  JOB_NAMES,
  QUEUE_NAMES,
  RETRY_CONFIG,
} from '../queues/constants/queue.constants';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.MAIL) private readonly mailQueue: Queue,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    if (!this.isNonEmptyString(email)) {
      throw new BadRequestException('Email is required');
    }

    if (!this.isNonEmptyString(password)) {
      throw new BadRequestException('Password is required');
    }

    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.isActive !== true) {
      throw new UnauthorizedException('User account is inactive');
    }

    const isPasswordValid = await this.comparePassword(
      password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Return user without password hash
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...result } = user;
    return result;
  }

  login(user: any): LoginResponseDto {
    const payload = {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      sub: user.id,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      email: user.email,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      role: user.role,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      departmentId: user.departmentId,
    };

    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        id: user.id,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        email: user.email,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        firstName: user.firstName,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        lastName: user.lastName,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        role: user.role,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        departmentId: user.departmentId,
      },
    };
  }

  logout(): { message: string } {
    // Token invalidation is typically handled client-side
    // In production, you might maintain a token blacklist in Redis
    return { message: 'Logged out successfully' };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    if (!this.isNonEmptyString(currentPassword)) {
      throw new BadRequestException('Current password is required');
    }

    const user = await this.usersService.findOne(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordValid = await this.comparePassword(
      currentPassword,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedValue = await this.hashPassword(newPassword);
    await this.usersService.updatePasswordHash(userId, hashedValue);

    return { message: 'Password updated successfully' };
  }

  async requestPasswordReset(
    email: string,
    metadata: {
      requestIp?: string;
      userAgent?: string;
      frontendBaseUrl?: string;
    } = {},
  ): Promise<PasswordResetRequestResultDto | null> {
    const user = await this.usersService.findByEmail(email);

    if (!user || user.isActive !== true) {
      return null;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const ttlMinutes = this.getResetTokenTtlMinutes();
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        requestIp: metadata.requestIp,
        userAgent: metadata.userAgent,
      },
    });

    const resetUrl = this.buildResetUrl(metadata.frontendBaseUrl, token);

    try {
      await this.mailQueue.add(
        JOB_NAMES.SEND_PASSWORD_RESET_EMAIL,
        {
          to: user.email,
          firstName: user.firstName ?? null,
          lastName: user.lastName ?? null,
          resetUrl,
          expiresAt,
        },
        {
          attempts: RETRY_CONFIG.ATTEMPTS,
          backoff: {
            type: RETRY_CONFIG.BACKOFF_TYPE,
            delay: RETRY_CONFIG.BACKOFF_DELAY,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    } catch (error) {
      this.logger.warn(
        `Failed to queue reset email for ${user.email}: ${(error as Error).message}`,
      );
    }

    return {
      userId: user.id,
      email: user.email,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      token,
      expiresAt,
    };
  }

  async resetPassword(
    token: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<{ message: string }> {
    if (!this.isNonEmptyString(token)) {
      throw new BadRequestException('Reset token is required');
    }

    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const tokenHash = this.hashToken(token);
    const now = new Date();

    const resetToken = await this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: now },
      },
    });

    if (!resetToken) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const hashedValue = await this.hashPassword(newPassword);

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: now },
      }),
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash: hashedValue },
      }),
    ]);

    return { message: 'Password reset successfully' };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async comparePassword(
    password: string,
    passwordHash: string | null,
  ): Promise<boolean> {
    if (
      !this.isNonEmptyString(password) ||
      !this.isNonEmptyString(passwordHash)
    ) {
      return false;
    }

    try {
      return await bcrypt.compare(password, passwordHash);
    } catch (error) {
      this.logger.warn(
        `Password comparison failed: ${(error as Error).message}`,
      );
      return false;
    }
  }

  private async hashPassword(password: string): Promise<string> {
    if (!this.isNonEmptyString(password)) {
      throw new BadRequestException('Password is required');
    }

    const saltRounds = this.getSaltRounds();

    try {
      return await bcrypt.hash(password, saltRounds);
    } catch (error) {
      this.logger.error(`Password hashing failed: ${(error as Error).message}`);
      throw new BadRequestException('Invalid password');
    }
  }

  private getSaltRounds(): number {
    const rawValue = this.configService.get('BCRYPT_SALT_ROUNDS');
    const saltRounds = Number(rawValue);

    if (!Number.isFinite(saltRounds) || saltRounds < 8) {
      return 10;
    }

    return saltRounds;
  }

  private isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  }

  private getResetTokenTtlMinutes(): number {
    const rawValue = this.configService.get('RESET_TOKEN_TTL_MINUTES');
    const ttlMinutes = Number(rawValue);

    if (!Number.isFinite(ttlMinutes) || ttlMinutes <= 0) {
      return 60;
    }

    return ttlMinutes;
  }

  private buildResetUrl(frontendBaseUrl: string | undefined, token: string) {
    const configBaseUrl = this.configService.get<string>('FRONTEND_BASE_URL');
    const baseUrl = frontendBaseUrl || configBaseUrl || 'http://localhost:3000';
    const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
    const encodedToken = encodeURIComponent(token);

    return `${normalizedBaseUrl}/reset-password?token=${encodedToken}`;
  }
}
