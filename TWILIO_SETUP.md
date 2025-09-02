# Twilio SMS Setup Guide

This guide will help you set up Twilio SMS functionality for sending key codes to customers.

## Prerequisites

1. A Twilio account (sign up at https://www.twilio.com)
2. A Twilio phone number for sending SMS messages

## Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

## Getting Your Twilio Credentials

1. **Account SID and Auth Token:**
   - Log in to your Twilio Console
   - Go to the Dashboard
   - Copy your Account SID and Auth Token from the "Account Info" section

2. **Phone Number:**
   - Go to Phone Numbers > Manage > Active numbers
   - Purchase a phone number if you don't have one
   - Copy the phone number in E.164 format (e.g., +1234567890)

## Features Implemented

### SMS Service (`src/lib/sms.ts`)
- `sendKeyCode()` - Sends key code to customer
- `sendCustomMessage()` - Sends custom messages

### API Endpoint (`src/app/api/admin/send-sms/route.ts`)
- POST `/api/admin/send-sms`
- Sends key code SMS to customer

### UI Changes
- Key codes remain visible in the admin interface
- "Send Key Code" button added next to each key code (visible only to super_admin users)
- Loading states and error handling for SMS sending
- SMS will be sent to the customer's phone number
- Permission-based access control ensures only super_admin can send SMS

## Usage

1. **Send Key Code:**
   - Admin can see the key code displayed
   - "Send Key Code" button only appears for registered customers (with customer_id)
   - Walk-in customers show "SMS not available for walk-in customers"
   - Admin clicks "Send Key Code" button next to any key code
   - SMS is sent to the customer's phone number from the customers table
   - Success/error feedback is provided

2. **Message Format:**
   ```
   Hi [Customer Name]! Your car wash key code is: [Key Code] at [Location Name]. 
   Please keep this code safe and present it when picking up your vehicle.
   ```

## Testing

1. Set up your Twilio credentials in `.env.local`
2. Create a test check-in with a user code
3. Click "Send Key Code" button
4. Check the customer's phone for the SMS message

## Troubleshooting

- **"Twilio credentials not configured"**: Check your environment variables
- **"Failed to send SMS"**: Verify your Twilio account has sufficient credits
- **Phone number format errors**: Ensure phone numbers are in E.164 format (+1234567890)

## Cost Considerations

- Twilio charges per SMS sent
- Check Twilio pricing for your region
- Consider implementing rate limiting for production use
