import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: Number(process.env.SMTP_PORT) || 587,
      auth: {
        user: process.env.SMTP_USER || 'test@example.com',
        pass: process.env.SMTP_PASS || 'password',
      },
    });
  }

  async sendWelcomeEmail(email: string, firstName?: string) {
    try {
      await this.transporter.sendMail({
        from: '"Pizza App" <no-reply@pizza-app.com>',
        to: email,
        subject: 'Добро пожаловать в Pizza App! 🍕',
        text: `Здравствуйте, ${firstName || 'пользователь'}! Ваш аккаунт успешно зарегистрирован.`,
      });
      this.logger.log(`Письмо о регистрации отправлено на ${email}`);
    } catch (error) {
      this.logger.error(
        `Ошибка отправки письма на ${email}: ${(error as Error).message}`,
      );
    }
  }

  async sendAccountDeletedEmail(email: string) {
    try {
      await this.transporter.sendMail({
        from: '"Pizza App" <no-reply@pizza-app.com>',
        to: email,
        subject: 'Аккаунт удален 🍕',
        text: 'Ваш аккаунт и связанные данные были успешно удалены из системы.',
      });
      this.logger.log(`Письмо об удалении аккаунта отправлено на ${email}`);
    } catch (error) {
      this.logger.error(
        `Ошибка отправки письма на ${email}: ${(error as Error).message}`,
      );
    }
  }
}
