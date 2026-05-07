import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrevoClient } from '@getbrevo/brevo';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly brevoClient: BrevoClient | null;
  private sender: { email: string; name: string };

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('BREVO_API_KEY');
    if (apiKey) {
      this.brevoClient = new BrevoClient({ apiKey });
    } else {
      this.brevoClient = null;
      this.logger.warn('BREVO_API_KEY is not set!');
    }

    this.sender = {
      email:
        this.configService.get<string>('EMAIL_FROM_ADDRESS') ??
        'noreply@system.local',
      name: this.configService.get<string>('EMAIL_FROM_NAME') ?? 'IT Helpdesk',
    };
  }

  async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
  ): Promise<unknown> {
    if (!this.brevoClient) {
      throw new Error('Cannot send email: BREVO_API_KEY is not configured.');
    }

    try {
      const result =
        await this.brevoClient.transactionalEmails.sendTransacEmail({
          subject,
          htmlContent,
          sender: this.sender,
          to: [{ email: to }],
        });
      this.logger.log(`Email sent successfully to ${to}.`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      throw error;
    }
  }
}
