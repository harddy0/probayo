import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { ConfigService } from '@nestjs/config';

/** Matches mariadb SSL options (boolean or object with ca/cert/key/rejectUnauthorized) */
type SslOption =
  | boolean
  | {
      ca?: string | string[];
      cert?: string | string[];
      key?: string | string[];
      ciphers?: string;
      rejectUnauthorized?: boolean;
      checkServerIdentity?: (host: string, cert: object) => Error | undefined;
    };

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly configService: ConfigService) {
    const dbUrl = configService.get<string>('DATABASE_URL');

    if (!dbUrl) {
      throw new Error('CRITICAL: DATABASE_URL is missing from ConfigService');
    }

    const url = new URL(dbUrl);
    const ssl = PrismaService.resolveSslOption(url, configService);

    const adapter = new PrismaMariaDb({
      host: url.hostname,
      port: Number(url.port || 3306),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, ''),
      ssl,
    });

    super({
      adapter,
      log: ['error', 'warn'],
    });

    this.logger.log(
      `Connecting to ${url.hostname}:${url.port || 3306} with SSL: ${JSON.stringify(ssl)}`,
    );
  }

  async onModuleInit() {
    await this.$connect();
    await this.$executeRaw`SET time_zone = '+00:00'`;
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Resolve SSL/TLS options from DATABASE_URL query params or DATABASE_SSL env var.
   *
   * Supported DATABASE_URL query params:
   *   ssl=true|false
   *   ssl={"ca":"./cert.pem"}           ← JSON object (your current format)
   *   sslaccept=strict|preferred|disabled
   *   sslmode=require|verify-full|...
   *
   * The DATABASE_SSL env var overrides URL params.
   * Defaults to true for TiDB Cloud hosts, false for local dev compatibility.
   */
  private static resolveSslOption(
    url: URL,
    configService: ConfigService,
  ): SslOption {
    const host = url.hostname.toLowerCase();
    const isTiDb = host.includes('tidbcloud.com');

    // 1. Explicit env var override
    const envSsl = configService.get<string>('DATABASE_SSL');
    if (envSsl !== undefined) {
      const enabled = envSsl === 'true' || envSsl === '1';
      return enabled ? { rejectUnauthorized: true } : false;
    }

    // 2. Check DATABASE_URL query params
    const sslParam = url.searchParams.get('ssl');
    if (sslParam !== null) {
      // Handle JSON format: ssl={"ca":"./isrgrootx1.pem"}
      const trimmed = sslParam.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          return JSON.parse(trimmed) as SslOption;
        } catch {
          // Invalid JSON - fall through to boolean check
        }
      }
      // Handle boolean format: ssl=true or ssl=false
      if (sslParam === 'true' || sslParam === '1') {
        return { rejectUnauthorized: true };
      }
      if (!isTiDb) return false;
    }

    const sslAccept = url.searchParams.get('sslaccept');
    if (sslAccept !== null) {
      const normalized = sslAccept.toLowerCase();
      if (
        normalized === 'strict' ||
        normalized === 'required' ||
        normalized === 'verify-full' ||
        normalized === 'verify-identity' ||
        normalized === 'true' ||
        normalized === '1'
      ) {
        return { rejectUnauthorized: true };
      }
      if (normalized === 'preferred' || normalized === 'prefer') {
        return isTiDb ? { rejectUnauthorized: true } : true;
      }
      if (
        normalized === 'disabled' ||
        normalized === 'false' ||
        normalized === '0'
      ) {
        if (!isTiDb) return false;
      }
    }

    const sslMode = url.searchParams.get('sslmode');
    if (sslMode !== null) {
      switch (sslMode.toLowerCase()) {
        case 'require':
        case 'verify-full':
        case 'verify-identity':
          return { rejectUnauthorized: true };
        case 'prefer':
          return isTiDb ? { rejectUnauthorized: true } : true;
        case 'disable':
          if (!isTiDb) return false;
          break;
        default:
          if (!isTiDb) return false;
          break;
      }
    }

    // 3. Default: enforce SSL for TiDB Cloud, otherwise allow local MySQL
    if (isTiDb) return { rejectUnauthorized: true };

    return false;
  }
}
