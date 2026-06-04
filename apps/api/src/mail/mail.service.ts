import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrevoClient } from '@getbrevo/brevo';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  private readonly brevoClient: BrevoClient | null;

  private readonly sender: {
    email: string;
    name: string;
  };

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('MAILER_API_KEY');

    if (!apiKey) {
      this.logger.warn('MAILER_API_KEY is not set!');
      this.brevoClient = null;
    } else {
      this.brevoClient = new BrevoClient({ apiKey });
    }

    this.sender = {
      email:
        this.configService.get<string>('EMAIL_FROM_ADDRESS') ??
        'it-support@yourcompany.com',

      name: this.configService.get<string>('EMAIL_FROM_NAME') ?? 'IT Helpdesk',
    };
  }

  async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
  ): Promise<{ messageId: string | undefined }> {
    if (!this.brevoClient) {
      throw new Error('Cannot send email: MAILER_API_KEY is not configured.');
    }

    try {
      const result = await this.brevoClient.transactionalEmails.sendTransacEmail(
        {
          subject,
          htmlContent,
          sender: { name: this.sender.name, email: this.sender.email },
          to: [{ email: to }],
        },
      );

      this.logger.log(
        `Email accepted by Brevo (messageId: ${result.messageId}) for ${to}`,
      );

      return { messageId: result.messageId };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Brevo error sending email to ${to}: ${message}`, error);
      throw error;
    }
  }

  async sendPasswordResetEmail(input: {
    to: string;
    firstName: string | null;
    lastName: string | null;
    resetUrl: string;
    expiresAt: Date;
  }): Promise<{ messageId: string | undefined }> {
    const displayName = [input.firstName, input.lastName]
      .filter(Boolean)
      .join(' ');
    const greeting = displayName ? `Hi ${displayName},` : 'Hello,';
    const expiresAt = input.expiresAt.toUTCString();

    const subject = 'Reset your password';
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
        <p>${greeting}</p>
        <p>We received a request to reset your password.</p>
        <p>
          <a href="${input.resetUrl}">Click here to reset your password</a>
        </p>
        <p>This link expires at ${expiresAt} UTC.</p>
        <p>If you did not request this, you can safely ignore this email.</p>
      </div>
    `;

    return this.sendEmail(input.to, subject, htmlContent);
  }
}
