import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  private readonly resendClient: Resend | null;

  private readonly sender: {
    email: string;
    name: string;
  };

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');

    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY is not set!');
      this.resendClient = null;
    } else {
      this.resendClient = new Resend(apiKey);
    }

    this.sender = {
      email:
        this.configService.get<string>('EMAIL_FROM_ADDRESS') ??
        'onboarding@resend.dev',

      name: this.configService.get<string>('EMAIL_FROM_NAME') ?? 'IT Helpdesk',
    };
  }

  async sendEmail(to: string, subject: string, htmlContent: string) {
    if (!this.resendClient) {
      throw new Error('Cannot send email: RESEND_API_KEY is not configured.');
    }

    const from = `${this.sender.name} <${this.sender.email}>`;

    const { data, error } = await this.resendClient.emails.send({
      from,
      to: [to],
      subject,
      html: htmlContent,
    });

    if (error) {
      this.logger.error(
        `Resend error sending email to ${to}: ${error.message}`,
        error,
      );
      throw new Error(error.message);
    }

    this.logger.log(
      `Email accepted by Resend (id: ${data?.id ?? 'unknown'}) for ${to}`,
    );

    return data;
  }

  async sendPasswordResetEmail(input: {
    to: string;
    firstName: string | null;
    lastName: string | null;
    resetUrl: string;
    expiresAt: Date;
  }) {
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
