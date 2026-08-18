import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    const port = Number(process.env.SMTP_PORT) || 465;

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendWelcomeEmail(email: string, firstName?: string) {
    try {
      await this.transporter.sendMail({
        from: '"Pizza App" <no-reply@pizza-app.com>',
        to: email,
        subject: 'Welcome to Pizza App! 🍕',
        text: `Hello, ${firstName || 'user'}! Your account has been successfully registered.`,
      });
      this.logger.log(`Registration email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Error sending email to ${email}: ${(error as Error).message}`,
      );
    }
  }

  async sendAccountDeletedEmail(email: string) {
    try {
      await this.transporter.sendMail({
        from: '"Pizza App" <no-reply@pizza-app.com>',
        to: email,
        subject: 'Account Deleted',
        text: 'Your account and associated data have been successfully removed from the system.',
      });
      this.logger.log(`Account deletion email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Error sending email to ${email}: ${(error as Error).message}`,
      );
    }
  }
}
