import twilio from 'twilio';

// SMS service using Twilio
// Configure with: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER environment variables

export interface SMSData {
  to: string;
  message: string;
}

export class SMSService {
  private static client: twilio.Twilio | null = null;

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

      // Format phone number (ensure it starts with +)
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

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

      // Format phone number (ensure it starts with +)
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

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
