# Email Configuration Troubleshooting Guide

## Issue: Users not receiving confirmation emails from Supabase

### Solution Applied:
Changed from `admin.createUser()` to `admin.inviteUserByEmail()` which automatically triggers Supabase's invitation email system.

### What the code now does:
1. Uses `supabaseAdmin.auth.admin.inviteUserByEmail()` - this sends a Supabase invitation email
2. Sets a temporary password after invitation
3. Also sends our custom email with credentials via SendGrid

### Supabase Settings to Check:

1. **Email Provider Configuration** (in Supabase Dashboard):
   - Go to Authentication > Settings > Email
   - Ensure email provider is configured (either built-in or custom SMTP)
   - Check if custom email templates are set up

2. **Email Template Configuration**:
   - Go to Authentication > Email Templates
   - Make sure "Invite user" template is enabled and configured
   - Check that the template includes proper links and formatting

3. **Environment Variables** (check your .env.local):
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   SENDGRID_API_KEY=your_sendgrid_key (for custom emails)
   ```

4. **Domain Settings**:
   - In Supabase Dashboard > Authentication > URL Configuration
   - Make sure your site URL is properly configured
   - Check redirect URLs are set correctly

### Testing Steps:

1. **Test the invitation flow**:
   ```bash
   # Check Supabase logs for any email delivery errors
   # Go to Supabase Dashboard > Logs > Auth logs
   ```

2. **Check spam folder**: Sometimes invitation emails end up in spam

3. **Test with different email providers**: 
   - Try Gmail, Outlook, etc. to rule out provider-specific issues

4. **Verify SendGrid configuration** (for our custom emails):
   - Check SendGrid dashboard for delivery status
   - Verify sender email is verified in SendGrid

### Current Email Flow:
1. **Supabase Invitation Email** - sent automatically by `inviteUserByEmail()`
2. **Custom Credentials Email** - sent by our SendGrid service with temporary password

### Manual Test:
You can test email delivery by temporarily adding this endpoint:

```typescript
// /api/test-email/route.ts
export async function POST() {
  const result = await supabaseAdmin.auth.admin.inviteUserByEmail('test@example.com');
  return NextResponse.json(result);
}
```

### Common Issues & Fixes:

1. **No email provider configured**: Configure SMTP or use Supabase's built-in service
2. **Domain not verified**: Add your domain to Supabase's allowed list
3. **Template disabled**: Enable invitation email template in Supabase
4. **Rate limiting**: Check if you've hit Supabase email limits
5. **SendGrid issues**: Verify API key and sender verification

### Expected Result:
Users should now receive:
1. A Supabase invitation email (for account confirmation)
2. A custom email with their temporary password and login instructions


