import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import nodemailer, { type SendMailOptions } from 'nodemailer';

export type ContactFormType = 'contact' | 'callback' | 'question';

export type ContactRequestBody = {
  name?: unknown;
  phone?: unknown;
  comment?: unknown;
  formType?: unknown;
  pageUrl?: unknown;
  consent?: unknown;
};

type ContactPayload = {
  name: string;
  phone?: string;
  comment?: string;
  formType: ContactFormType;
  pageUrl?: string;
};

type MailConfig = {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
  to: string;
};

const formLabels: Record<ContactFormType, string> = {
  contact: 'Contact page form',
  callback: 'Callback request',
  question: 'Question form',
};
const phoneAllowedPattern = /^[+0-9().\s-]+$/;

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  async sendContactRequest(body: ContactRequestBody) {
    const payload = this.normalizePayload(body);
    const config = this.getMailConfig();

    try {
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth:
          config.user && config.pass
            ? {
                user: config.user,
                pass: config.pass,
              }
            : undefined,
      });

      await transporter.sendMail(this.buildMessage(payload, config));
    } catch (error) {
      this.logger.error('Failed to send contact request email', error);
      throw new ServiceUnavailableException(
        'Contact email delivery is unavailable',
      );
    }

    return { ok: true };
  }

  private normalizePayload(body: ContactRequestBody): ContactPayload {
    const formType = this.normalizeFormType(body.formType);
    const name = this.normalizeString(body.name, 'Name', {
      required: true,
      maxLength: 120,
    });
    const phone = this.normalizePhone(body.phone, {
      required: formType === 'callback' || formType === 'question',
    });
    const comment = this.normalizeString(body.comment, 'Comment', {
      required: false,
      maxLength: 3000,
    });
    const pageUrl = this.normalizeString(body.pageUrl, 'Page URL', {
      required: false,
      maxLength: 500,
    });

    if (!this.hasConsent(body.consent)) {
      throw new BadRequestException('Personal data consent is required');
    }

    if (formType === 'contact' && !comment) {
      throw new BadRequestException('Comment is required');
    }

    return {
      name,
      phone: phone || undefined,
      comment: comment || undefined,
      formType,
      pageUrl: pageUrl || undefined,
    };
  }

  private normalizeString(
    value: unknown,
    label: string,
    options: { required: boolean; maxLength: number },
  ) {
    if (typeof value !== 'string') {
      if (options.required) {
        throw new BadRequestException(`${label} is required`);
      }

      return '';
    }

    const normalized = value.trim();

    if (options.required && !normalized) {
      throw new BadRequestException(`${label} is required`);
    }

    if (normalized.length > options.maxLength) {
      throw new BadRequestException(`${label} is too long`);
    }

    return normalized;
  }

  private normalizePhone(
    value: unknown,
    options: {
      required: boolean;
    },
  ) {
    const phone = this.normalizeString(value, 'Phone', {
      required: options.required,
      maxLength: 25,
    });

    if (!phone) {
      return '';
    }

    const digitCount = phone.replace(/\D/g, '').length;

    if (!phoneAllowedPattern.test(phone) || digitCount < 6 || digitCount > 20) {
      throw new BadRequestException('Phone is invalid');
    }

    return phone;
  }

  private normalizeFormType(value: unknown): ContactFormType {
    if (value === 'callback' || value === 'question' || value === 'contact') {
      return value;
    }

    return 'contact';
  }

  private hasConsent(value: unknown) {
    return value === true || value === 'true' || value === 'on';
  }

  private getMailConfig(): MailConfig {
    const host = this.readEnv('SMTP_HOST', 'MAIL_HOST');
    const user = this.readEnv('SMTP_USER', 'MAIL_USER');
    const pass = this.readEnv(
      'SMTP_PASS',
      'MAIL_PASS',
      'SMTP_PASSWORD',
    )?.replace(/\s/g, '');
    const from =
      this.readEnv('CONTACT_FROM_EMAIL', 'MAIL_FROM', 'SMTP_FROM') ??
      user ??
      this.readEnv('CONTACT_TO_EMAIL', 'MAIL_TO');
    const to = this.readEnv('CONTACT_TO_EMAIL', 'MAIL_TO', 'SMTP_TO');
    const port = this.getSmtpPort();
    const secure = this.getSmtpSecure(port);

    if (!host || !from || !to) {
      throw new ServiceUnavailableException('Contact email is not configured');
    }

    if ((user && !pass) || (!user && pass)) {
      throw new ServiceUnavailableException(
        'SMTP credentials are not configured completely',
      );
    }

    return {
      host,
      port,
      secure,
      user,
      pass,
      from,
      to,
    };
  }

  private getSmtpPort() {
    const value = this.readEnv('SMTP_PORT', 'MAIL_PORT');
    const port = Number(value ?? 587);

    if (!Number.isInteger(port) || port <= 0) {
      throw new ServiceUnavailableException('SMTP port is invalid');
    }

    return port;
  }

  private getSmtpSecure(port: number) {
    const value = this.readEnv('SMTP_SECURE', 'MAIL_SECURE');

    if (!value) {
      return port === 465;
    }

    return ['1', 'true', 'yes'].includes(value.toLowerCase());
  }

  private readEnv(...names: string[]) {
    for (const name of names) {
      const value = process.env[name]?.trim();

      if (value) {
        return value;
      }
    }

    return undefined;
  }

  private buildMessage(
    payload: ContactPayload,
    config: MailConfig,
  ): SendMailOptions {
    return {
      to: config.to,
      from: config.from,
      subject: 'New request from Foliart website',
      text: this.buildTextMessage(payload),
      html: this.buildHtmlMessage(payload),
    };
  }

  private buildTextMessage(payload: ContactPayload) {
    const lines = [
      'New request from Foliart website',
      '',
      `Form: ${formLabels[payload.formType]}`,
      `Name: ${payload.name}`,
    ];

    if (payload.phone) {
      lines.push(`Phone: ${payload.phone}`);
    }

    if (payload.comment) {
      lines.push('', 'Comment:', payload.comment);
    }

    if (payload.pageUrl) {
      lines.push('', `Page: ${payload.pageUrl}`);
    }

    return lines.join('\n');
  }

  private buildHtmlMessage(payload: ContactPayload) {
    const rows: Array<[string, string | undefined]> = [
      ['Form', formLabels[payload.formType]],
      ['Name', payload.name],
      ['Phone', payload.phone],
      ['Comment', payload.comment],
      ['Page', payload.pageUrl],
    ];

    const tableRows = rows
      .filter((row): row is [string, string] => Boolean(row[1]))
      .map(([label, value]) => {
        return `<tr><td style="padding:6px 12px;font-weight:700;border:1px solid #ddd;">${this.escapeHtml(
          label,
        )}</td><td style="padding:6px 12px;border:1px solid #ddd;">${this.escapeHtml(
          value,
        ).replace(/\n/g, '<br>')}</td></tr>`;
      })
      .join('');

    return `<h2>New request from Foliart website</h2><table style="border-collapse:collapse;">${tableRows}</table>`;
  }

  private escapeHtml(value: string) {
    return value.replace(/[&<>"']/g, (char) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };

      return entities[char];
    });
  }
}
