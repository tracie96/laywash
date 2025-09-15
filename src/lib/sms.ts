import twilio from 'twilio';

// SMS service using Twilio
// Configure with: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER environment variables

export interface SMSData {
  to: string;
  message: string;
}

export class SMSService {
  private static client: twilio.Twilio | null = null;

  /**
   * Formats a Nigerian phone number to international format (+234)
   * Handles various input formats:
   * - 08169530309 -> +2348169530309
   * - 8169530309 -> +2348169530309
   * - +2348169530309 -> +2348169530309 (already formatted)
   * - 2348169530309 -> +2348169530309
   */
  private static formatNigerianPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // If it's already in international format with country code
    if (cleaned.startsWith('234') && cleaned.length === 13) {
      return `+${cleaned}`;
    }
    
    // If it starts with 0 (local format like 08169530309)
    if (cleaned.startsWith('0') && cleaned.length === 11) {
      return `+234${cleaned.substring(1)}`;
    }
    
    // If it's 10 digits (like 8169530309)
    if (cleaned.length === 10) {
      return `+234${cleaned}`;
    }
    
    // If it already starts with +, return as is
    if (phoneNumber.startsWith('+')) {
      return phoneNumber;
    }
    
    // Default: add + prefix
    return `+${cleaned}`;
  }

  private static getClient(): twilio.Twilio {
    if (!this.client) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;

      if (!accountSid || !authToken) {
        throw new Error('Twilio credentials not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.');
      }

      this.client = twilio(accountSid, authToken);
    }

    return this.client;
  }

  static async sendKeyCode(
    phoneNumber: string,
    customerName: string,
    keyCode: string,
    locationName?: string
  ): Promise<boolean> {
    try {
      const client = this.getClient();
      const fromNumber = process.env.TWILIO_PHONE_NUMBER;

      if (!fromNumber) {
        throw new Error('TWILIO_PHONE_NUMBER not configured');
      }

      // Format phone number to Nigerian international format
      // TEMPORARY: Hardcoded test number for development
      const formattedPhone = '+2348033242104';

      // Create the message
      const message = `Hi ${customerName}! Your car wash key code is: ${keyCode}${locationName ? ` at ${locationName}` : ''}. Please keep this code safe and present it when picking up your vehicle.`;

      // Send SMS
      const messageResponse = await client.messages.create({
        body: message,
        from: fromNumber,
        to: formattedPhone
      });

      console.log('SMS sent successfully:', messageResponse.sid);
      return true;

    } catch (error) {
      console.error('Failed to send SMS:', error);
      return false;
    }
  }

  static async sendCustomMessage(
    phoneNumber: string,
    message: string
  ): Promise<boolean> {
    try {
      const client = this.getClient();
      const fromNumber = process.env.TWILIO_PHONE_NUMBER;

      if (!fromNumber) {
        throw new Error('TWILIO_PHONE_NUMBER not configured');
      }

      // Format phone number to Nigerian international format
      // TEMPORARY: Hardcoded test number for development
      const formattedPhone = '+2348033242104';

      // Send SMS
      const messageResponse = await client.messages.create({
        body: message,
        from: fromNumber,
        to: formattedPhone
      });

      console.log('SMS sent successfully:', messageResponse.sid);
      return true;

    } catch (error) {
      console.error('Failed to send SMS:', error);
      return false;
    }
  }
}
