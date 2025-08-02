import nodemailer, { Transporter } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

import { UserRepository } from '../../models/repositories/UserRepository';
import { Logger } from '../../utils/logger';

export class EmailService {
  private userRepository: UserRepository;
  private logger: Logger;
  private transporter: Transporter<SMTPTransport.SentMessageInfo>;

  constructor(userRepository: UserRepository, logger: Logger) {
    this.userRepository = userRepository;
    this.logger = logger;
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: true,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      family: 4,
      tls: {
        rejectUnauthorized: false,
      },
    } as SMTPTransport.Options);
  }
  /**
   * Send OTP email
   */
  async sendOTPEmail(email: string, otp: string): Promise<void> {
    const mailOptions = {
      from: `"Taskie" <${process.env.EMAIL_FROM || 'noreply@taskie.com'}>`,
      to: email,
      subject: 'Your Taskie Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3498db;">Taskie Verification Code</h2>
          <p>Hello,</p>
          <p>Your verification code is:</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2c3e50;">${otp}</span>
          </div>
          <p>This code will expire in 15 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
          <p>Thanks,<br>The Taskie Team</p>
        </div>
      `
    };

   try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.info(`OTP email sent to ${email}, messageId: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${email}:`, error);
      
      // Provide specific error guidance
      if (error instanceof Error) {
        if (error.message.includes('EAUTH')) {
          throw new Error('Email authentication failed. Please check your email configuration.');
        } else if (error.message.includes('ENOTFOUND')) {
          throw new Error('Email server not found. Please check your internet connection.');
        } else if (error.message.includes('ETIMEDOUT')) {
          throw new Error('Email sending timed out. Please try again.');
        }
      }
      
      throw new Error('Failed to send verification email. Please try again later.');
    }
  }


  /**
   * Send notification email
   */
  async sendNotificationEmail(
    email: string,
    title: string,
    message: string,
    type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS'
  ): Promise<void> {
    // Get color based on notification type
    const getColor = () => {
      switch (type) {
        case 'SUCCESS': return '#22c55e';
        case 'WARNING': return '#f59e0b';
        case 'ERROR': return '#ef4444';
        default: return '#3b82f6'; // INFO
      }
    };

    const mailOptions = {
      from: `"Taskie" <${process.env.EMAIL_FROM || 'noreply@taskie.com'}>`,
      to: email,
      subject: title,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid ${getColor()};">
            <h2 style="color: #2c3e50; margin-top: 0;">${title}</h2>
            <p style="color: #4b5563; line-height: 1.6;">${message}</p>
          </div>
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
            This is an automated notification from Taskie. If you believe you received this in error, please contact support.
          </p>
          <p style="color: #6b7280; font-size: 14px;">
            Thanks,<br>The Taskie Team
          </p>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.info(`Notification email sent to ${email}: ${title}`);
    } catch (error) {
      this.logger.error(`Failed to send notification email to ${email}:`, error);
      // Don't throw error for notification emails to avoid disrupting the main flow
    }
  }

  /**
   * Send workspace invitation email
   */
  async sendInvitationEmail(
    email: string,
    workspaceName: string,
    invitedBy: string,
    invitationLink: string
  ): Promise<void> {
    const mailOptions = {
      from: `"Taskie" <${process.env.EMAIL_FROM || 'noreply@taskie.com'}>`,
      to: email,
      subject: `You've been invited to join ${workspaceName} on Taskie`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3498db;">You've been invited to join ${workspaceName}</h2>
          <p>Hello,</p>
          <p>${invitedBy} has invited you to join their workspace <strong>${workspaceName}</strong> on Taskie.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${invitationLink}" style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
              Accept Invitation
            </a>
          </div>
          <p>If the button above doesn't work, you can copy and paste the following link into your browser:</p>
          <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 4px;">
            ${invitationLink}
          </p>
          <p>This invitation will expire in 7 days.</p>
          <p>Thanks,<br>The Taskie Team</p>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.info(`Invitation email sent to ${email} for workspace ${workspaceName}`);
    } catch (error) {
      this.logger.error(`Failed to send invitation email to ${email}:`, error);
      throw error;
    }
  }
}