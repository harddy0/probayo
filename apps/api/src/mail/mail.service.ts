import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as brevo from '@getbrevo/brevo';

// Cast the Brevo SDK to `any` to avoid incompatible type definitions
const brevoAny: any = brevo;

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  // Use 'any' here to bypass the strict nodenext namespace type errors
  private apiInstance: any;
  private sender: { email: string; name: string };

  constructor(private readonly configService: ConfigService) {
    // Instantiate dynamically to avoid compiler namespace clashes
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    this.apiInstance = new brevoAny.TransactionalEmailsApi();

    const apiKey = this.configService.get<string>('BREVO_API_KEY');
    if (apiKey) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      this.apiInstance.setApiKey(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        brevoAny.TransactionalEmailsApiApiKeys.apiKey,
        apiKey,
      );
    } else {
      this.logger.warn('BREVO_API_KEY is not set!');
    }

    this.sender = {
      email:
        this.configService.get<string>('EMAIL_FROM_ADDRESS') ??
        'noreply@system.local',
      name: this.configService.get<string>('EMAIL_FROM_NAME') ?? 'IT Helpdesk',
    };
  }

  async sendEmail(to: string, subject: string, htmlContent: string) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const sendSmtpEmail = new brevoAny.SendSmtpEmail();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      sendSmtpEmail.subject = subject;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      sendSmtpEmail.htmlContent = htmlContent;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      sendSmtpEmail.sender = this.sender;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      sendSmtpEmail.to = [{ email: to }];

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
      const result = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      this.logger.log(`Email sent successfully to ${to}.`);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return result;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      throw error;
    }
  }
}
