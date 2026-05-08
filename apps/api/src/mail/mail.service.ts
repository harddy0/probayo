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
}
