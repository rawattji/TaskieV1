import { Pool } from 'pg';
import crypto from 'crypto';
import { Logger } from '../../utils/logger';
import { EmailService } from '../notification/EmailService';

interface OTPRecord {
  id: string;
  email: string;
  otp: string;
  expires_at: Date;
  attempts: number;
  created_at: Date;
  is_used: boolean;
}

export class OTPService {
  private pool: Pool;
  private logger: Logger;
  private emailService: EmailService;
  private readonly OTP_EXPIRY_MINUTES = 15;
  private readonly MAX_ATTEMPTS = 3;
  private readonly OTP_LENGTH = 6;

  constructor(pool: Pool, emailService: EmailService, logger: Logger) {
    this.pool = pool;
    this.emailService = emailService;
    this.logger = logger;
  }

  /**
   * Generate and send OTP to email
   */
  async generateOTP(email: string): Promise<string> {
    try {
      // Generate random 6-digit OTP
      const otp = this.generateRandomOTP();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + this.OTP_EXPIRY_MINUTES);

      // Invalidate any existing OTPs for this email
      await this.invalidateExistingOTPs(email);

      // Store OTP in database
      const query = `
        INSERT INTO otps (email, otp, expires_at, attempts, is_used, created_at)
        VALUES ($1, $2, $3, 0, false, NOW())
        RETURNING id
      `;

      const result = await this.pool.query(query, [email, otp, expiresAt]);

      this.logger.info(`OTP generated for ${email}, expires at ${expiresAt}`);

      // Send OTP via email
      await this.emailService.sendOTPEmail(email, otp);

      // Return OTP for development/testing purposes (remove in production)
      if (process.env.NODE_ENV === 'development') {
        this.logger.info(`Development OTP for ${email}: ${otp}`);
      }

      return otp;
    } catch (error) {
      this.logger.error(`Failed to generate OTP for ${email}:`, error);
      throw new Error('Failed to generate OTP. Please try again.');
    }
  }

  /**
   * Verify OTP
   */
  async verifyOTP(email: string, otp: string): Promise<boolean> {
    try {
      // Get the latest valid OTP for this email
      const query = `
        SELECT id, otp, expires_at, attempts, is_used
        FROM otps
        WHERE email = $1 AND is_used = false
        ORDER BY created_at DESC
        LIMIT 1
      `;

      const result = await this.pool.query(query, [email]);

      if (result.rows.length === 0) {
        this.logger.warn(`No valid OTP found for ${email}`);
        return false;
      }

      const otpRecord: OTPRecord = result.rows[0];

      // Check if OTP has expired
      if (new Date() > new Date(otpRecord.expires_at)) {
        this.logger.warn(`Expired OTP verification attempt for ${email}`);
        await this.markOTPAsUsed(otpRecord.id);
        return false;
      }

      // Check if max attempts reached
      if (otpRecord.attempts >= this.MAX_ATTEMPTS) {
        this.logger.warn(`Max attempts reached for OTP verification for ${email}`);
        await this.markOTPAsUsed(otpRecord.id);
        return false;
      }

      // Increment attempt count
      await this.incrementAttempts(otpRecord.id);

      // Verify OTP
      if (otpRecord.otp === otp) {
        // Mark OTP as used
        await this.markOTPAsUsed(otpRecord.id);
        this.logger.info(`OTP verified successfully for ${email}`);
        return true;
      } else {
        this.logger.warn(`Invalid OTP verification attempt for ${email}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Failed to verify OTP for ${email}:`, error);
      return false;
    }
  }

  /**
   * Resend OTP (generate new one)
   */
  async resendOTP(email: string): Promise<string> {
    try {
      // Check if there's a recent OTP request (rate limiting)
      const recentOTPQuery = `
        SELECT created_at
        FROM otps
        WHERE email = $1
        ORDER BY created_at DESC
        LIMIT 1
      `;

      const recentResult = await this.pool.query(recentOTPQuery, [email]);

      if (recentResult.rows.length > 0) {
        const lastOTPTime = new Date(recentResult.rows[0].created_at);
        const timeDiff = (Date.now() - lastOTPTime.getTime()) / 1000; // seconds

        // Enforce 60-second cooldown between OTP requests
        if (timeDiff < 60) {
          const waitTime = Math.ceil(60 - timeDiff);
          throw new Error(`Please wait ${waitTime} seconds before requesting a new OTP`);
        }
      }

      // Generate new OTP
      return await this.generateOTP(email);
    } catch (error) {
      this.logger.error(`Failed to resend OTP for ${email}:`, error);
      throw error;
    }
  }

  /**
   * Clean up expired OTPs (run periodically)
   */
  async cleanupExpiredOTPs(): Promise<void> {
    try {
      const query = `
        DELETE FROM otps
        WHERE expires_at < NOW() OR created_at < NOW() - INTERVAL '24 hours'
      `;

      const result = await this.pool.query(query);
      this.logger.info(`Cleaned up ${result.rowCount} expired OTP records`);
    } catch (error) {
      this.logger.error('Failed to cleanup expired OTPs:', error);
    }
  }

  /**
   * Generate random 6-digit OTP
   */
  private generateRandomOTP(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Invalidate existing OTPs for email
   */
  private async invalidateExistingOTPs(email: string): Promise<void> {
    const query = `
      UPDATE otps
      SET is_used = true
      WHERE email = $1 AND is_used = false
    `;

    await this.pool.query(query, [email]);
  }

  /**
   * Mark OTP as used
   */
  private async markOTPAsUsed(otpId: string): Promise<void> {
    const query = `
      UPDATE otps
      SET is_used = true, used_at = NOW()
      WHERE id = $1
    `;

    await this.pool.query(query, [otpId]);
  }

  /**
   * Increment attempt count
   */
  private async incrementAttempts(otpId: string): Promise<void> {
    const query = `
      UPDATE otps
      SET attempts = attempts + 1
      WHERE id = $1
    `;

    await this.pool.query(query, [otpId]);
  }

  /**
   * Get OTP statistics for monitoring
   */
  async getOTPStats(): Promise<{
    totalGenerated: number;
    totalVerified: number;
    totalExpired: number;
    successRate: number;
  }> {
    try {
      const statsQuery = `
        SELECT
          COUNT(*) as total_generated,
          COUNT(CASE WHEN is_used = true AND used_at IS NOT NULL THEN 1 END) as total_verified,
          COUNT(CASE WHEN expires_at < NOW() AND is_used = false THEN 1 END) as total_expired
        FROM otps
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `;

      const result = await this.pool.query(statsQuery);
      const stats = result.rows[0];

      const successRate = stats.total_generated > 0 
        ? (stats.total_verified / stats.total_generated) * 100 
        : 0;

      return {
        totalGenerated: parseInt(stats.total_generated),
        totalVerified: parseInt(stats.total_verified),
        totalExpired: parseInt(stats.total_expired),
        successRate: Math.round(successRate * 100) / 100
      };
    } catch (error) {
      this.logger.error('Failed to get OTP stats:', error);
      return {
        totalGenerated: 0,
        totalVerified: 0,
        totalExpired: 0,
        successRate: 0
      };
    }
  }
}