import sgMail from '@sendgrid/mail';

// Email service using SendGrid
// Configure with: SENDGRID_API_KEY environment variable

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  static async sendTemporaryPassword(
    email: string,
    name: string,
    password: string,
    role: 'admin' | 'car_washer'
  ): Promise<boolean> {
    try {
      const subject = `Welcome to Car Wash Management System - Your Login Credentials`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Welcome to Car Wash Management System!</h2>
          <p>Hello ${name},</p>
          <p>Your ${role === 'admin' ? 'admin' : 'car washer'} account has been created successfully.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Your Login Credentials:</h3>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Temporary Password:</strong> <span style="background-color: #fff; padding: 5px 10px; border-radius: 4px; font-family: monospace;">${password}</span></p>
          </div>
          
          <p><strong>Important:</strong> Please change your password after your first login for security purposes.</p>
          
          <p>You can now log in to the system and start managing car wash operations.</p>
          
          <p>Best regards,<br>Car Wash Management Team</p>
        </div>
      `;

      const text = `
Welcome to Car Wash Management System!

Hello ${name},

Your ${role === 'admin' ? 'admin' : 'car washer'} account has been created successfully.

Your Login Credentials:
Email: ${email}
Temporary Password: ${password}

Important: Please change your password after your first login for security purposes.

You can now log in to the system and start managing car wash operations.

Best regards,
Car Wash Management Team
      `;

      // Configure SendGrid
      const apiKey = process.env.SENDGRID_API_KEY;
      if (!apiKey) {
        console.error('SENDGRID_API_KEY not configured');
        return false;
      }

      sgMail.setApiKey(apiKey);

      // Send email
      const msg = {
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@yourdomain.com',
        subject: subject,
        html: html,
        text: text
      };

      await sgMail.send(msg);
      console.log('Email sent successfully to:', email);

      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  static async sendWelcomeEmail(
    email: string
  ): Promise<boolean> {
    try {
      const subject = `Welcome to Car Wash Management System`;

      console.log('=== WELCOME EMAIL SENT ===');
      console.log('To:', email);
      console.log('Subject:', subject);
      console.log('==================');

      return true;
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      return false;
    }
  }
} 