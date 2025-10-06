// SMS service using Kudisms
// Configure with: KUDISMS_TOKEN, KUDISMS_SENDER_ID environment variables

export interface SMSData {
  to: string;
  message: string;
}

export interface KudismsResponse {
  status: string;
  error_code: string;
  cost: string;
  data: string;
  msg: string;
  length: number;
  page: number;
  balance: string;
}

export class SMSService {;

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

  private static async sendSMS(phoneNumber: string, message: string): Promise<KudismsResponse> {
    const token = process.env.KUDISMS_TOKEN;
    const senderId = process.env.KUDISMS_SENDER_ID;

    if (!token || !senderId) {
      throw new Error('Kudisms credentials not configured. Please set KUDISMS_TOKEN and KUDISMS_SENDER_ID environment variables.');
    }

    console.log('SMS Debug Info:', {
      token: token ? `${token.substring(0, 10)}...` : 'NOT SET',
      senderId,
      phoneNumber,
      messageLength: message.length
    });

    const formData = new FormData();
    formData.append('token', token);
    formData.append('senderID', "Akumka ACC");
    formData.append('recipients', phoneNumber);
    formData.append('message', message);

    const response = await fetch('https://my.kudisms.net/api/otp', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Kudisms API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Kudisms API Response:', result);
    return result;
  }

  static async sendKeyCode(
    phoneNumber: string,
    customerName: string,
    keyCode: string
  ): Promise<boolean> {
    try {
      // Format phone number to Nigerian international format (remove + for Kudisms)
      const formattedPhone = this.formatNigerianPhoneNumber(phoneNumber).replace('+', '');

      // Create the message
      const message = `Hi ${customerName}! Your car wash key code is: ${keyCode}. Please keep this code safe and present it when picking up your vehicle.`;

      // Send SMS via Kudisms
      const response = await this.sendSMS(formattedPhone, message);

      if (response.status === 'success') {
        console.log('SMS sent successfully via Kudisms:', response.data);
        return true;
      } else {
        console.error('Kudisms SMS failed:', response.msg);
        return false;
      }

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
      // Format phone number to Nigerian international format (remove + for Kudisms)
      const formattedPhone = this.formatNigerianPhoneNumber(phoneNumber).replace('+', '');

      // Send SMS via Kudisms
      const response = await this.sendSMS(formattedPhone, message);

      if (response.status === 'success') {
        console.log('SMS sent successfully via Kudisms:', response.data);
        return true;
      } else {
        console.error('Kudisms SMS failed:', response.msg);
        return false;
      }

    } catch (error) {
      console.error('Failed to send SMS:', error);
      return false;
    }
  }
}
