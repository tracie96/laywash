# Nigerian SMS Setup Guide

This guide helps you set up SMS functionality for Nigerian phone numbers.

## The Problem

Twilio has geo restrictions and may not allow SMS to Nigerian phone numbers (+234) by default. You'll see this error:
```
Permission to send an SMS has not been enabled for the region indicated by the 'To' number: +234803324XXXX
```

## Solutions

### Option 1: Enable International SMS in Twilio (Recommended for Global Use)

1. **Log into Twilio Console**
2. **Go to Account Settings → Geo Permissions**
3. **Enable SMS for Nigeria (+234)**
4. **Complete account verification** (may require additional documentation)
5. **Add environment variables:**
   ```bash
   TWILIO_ACCOUNT_SID=your_twilio_account_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   TWILIO_PHONE_NUMBER=your_twilio_phone_number
   ```

### Option 2: Use Nigerian SMS Providers (Recommended for Nigeria)

#### Using Termii (Popular in Nigeria)

1. **Sign up at [Termii](https://termii.com)**
2. **Get your API key and Sender ID**
3. **Add environment variables:**
   ```bash
   TERMII_API_KEY=your_termii_api_key
   TERMII_SENDER_ID=your_sender_id
   ```
4. **Update the SMS service** to use `NigerianSMSService` instead of `SMSService`

#### Other Nigerian SMS Providers:
- **SendChamp** - https://sendchamp.com
- **BulkSMS Nigeria** - https://bulksms.ng
- **SMS Live 247** - https://smslive247.com

### Option 3: Hybrid Approach

Use both Twilio and Nigerian providers with fallback:

```typescript
// Try Twilio first, fallback to Nigerian provider
const smsSent = await SMSService.sendKeyCode(...) || 
                await NigerianSMSService.sendKeyCode(...);
```

## Implementation Steps

### For Termii Integration:

1. **Install dependencies:**
   ```bash
   npm install axios  # if using axios for HTTP requests
   ```

2. **Update SMS API to use Nigerian service:**
   ```typescript
   import { NigerianSMSService } from '@/lib/nigerian-sms';
   
   // Replace SMSService with NigerianSMSService
   const smsSent = await NigerianSMSService.sendKeyCode(...);
   ```

3. **Test with a Nigerian phone number**

## Phone Number Formatting

Nigerian phone numbers should be formatted as:
- **Input:** `08033241234` or `+2348033241234`
- **Output:** `2348033241234` (for API calls)

The `NigerianSMSService` handles this formatting automatically.

## Cost Considerations

- **Twilio:** ~$0.05-0.10 per SMS to Nigeria
- **Termii:** ~₦2-5 per SMS (much cheaper locally)
- **Other Nigerian providers:** Usually ₦1-3 per SMS

## Testing

1. **Test with your own Nigerian phone number first**
2. **Check delivery status in provider dashboard**
3. **Monitor for delivery failures**

## Troubleshooting

### Common Issues:

1. **"Invalid phone number"**
   - Check phone number formatting
   - Ensure it's a valid Nigerian number

2. **"Insufficient balance"**
   - Top up your SMS provider account
   - Check pricing for Nigerian numbers

3. **"Sender ID not approved"**
   - Register your sender ID with the provider
   - Use approved sender IDs only

### Debug Steps:

1. **Check environment variables are set**
2. **Verify API credentials**
3. **Test with a simple message first**
4. **Check provider logs/dashboard**

## Recommended Setup for Nigeria

For a Nigerian car wash business, I recommend:

1. **Use Termii or SendChamp** (local providers)
2. **Register a business sender ID** (e.g., "CarWash")
3. **Set up webhook for delivery reports**
4. **Monitor costs and delivery rates**

This will be more reliable and cost-effective than international providers.
