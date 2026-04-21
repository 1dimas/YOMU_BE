import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
    private transporter: nodemailer.Transporter;
    private readonly logger = new Logger(MailService.name);

    constructor() {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    async sendPasswordResetEmail(to: string, resetToken: string) {
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/reset-password?token=${resetToken}`;

        const mailOptions = {
            from: '"Yomu Library" <noreply@yomu.com>',
            to,
            subject: 'Yomu - Reset Password',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Reset Password Anda</h2>
          <p>Anda menerima email ini karena Anda (atau seseorang) meminta reset password untuk akun Anda di sistem Perpustakaan Yomu.</p>
          <p>Silakan klik tombol di bawah ini untuk mengatur ulang password Anda:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
          </div>
          <p>Atau klik/copy link berikut:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>Jika Anda tidak meminta ini, silakan abaikan email ini dan password Anda akan tetap sama.</p>
          <hr style="border-top: 1px solid #e5e7eb; margin-top: 30px;">
          <p style="font-size: 12px; color: #6b7280;">Link ini akan kadaluarsa dalam 1 jam.</p>
        </div>
      `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            this.logger.log(`Password reset email sent to ${to}`);
        } catch (error) {
            this.logger.error(`Failed to send password reset email to ${to}`, error);
            throw error;
        }
    }
}
