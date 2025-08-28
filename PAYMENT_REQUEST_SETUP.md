# Payment Request System Setup Guide

## Database Setup

The payment request system requires a `payment_request` table to be created in your Supabase database. Follow these steps to set it up:

### Step 1: Access Supabase Dashboard
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to the **SQL Editor** in the left sidebar

### Step 2: Create the Payment Request Table
Copy and paste the following SQL script into the SQL Editor:

```sql
-- Create payment_request table for car wash management system
CREATE TABLE IF NOT EXISTS public.payment_request (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    washer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    approval_date TIMESTAMP WITH TIME ZONE,
    total_earnings NUMERIC(10,2) NOT NULL DEFAULT 0,
    material_deductions NUMERIC(10,2) NOT NULL DEFAULT 0,
    tool_deductions NUMERIC(10,2) NOT NULL DEFAULT 0,
    status CHARACTER VARYING(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_request_washer_id ON public.payment_request(washer_id);
CREATE INDEX IF NOT EXISTS idx_payment_request_admin_id ON public.payment_request(admin_id);
CREATE INDEX IF NOT EXISTS idx_payment_request_status ON public.payment_request(status);
CREATE INDEX IF NOT EXISTS idx_payment_request_created_at ON public.payment_request(created_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payment_request_updated_at 
    BEFORE UPDATE ON public.payment_request 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.payment_request ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow users to read their own payment requests
CREATE POLICY "Users can read their own payment requests" ON public.payment_request
    FOR SELECT USING (auth.uid() = washer_id);

-- Allow users to create their own payment requests
CREATE POLICY "Users can create their own payment requests" ON public.payment_request
    FOR INSERT WITH CHECK (auth.uid() = washer_id);

-- Allow users to update their own pending payment requests
CREATE POLICY "Users can update their own pending payment requests" ON public.payment_request
    FOR UPDATE USING (auth.uid() = washer_id AND status = 'pending');

-- Allow users to delete their own pending payment requests
CREATE POLICY "Users can delete their own pending payment requests" ON public.payment_request
    FOR DELETE USING (auth.uid() = washer_id AND status = 'pending');

-- Allow admins to read all payment requests
CREATE POLICY "Admins can read all payment requests" ON public.payment_request
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin')
        )
    );

-- Allow admins to update payment requests
CREATE POLICY "Admins can update payment requests" ON public.payment_request
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin')
        )
    );

-- Allow admins to delete payment requests
CREATE POLICY "Admins can delete payment requests" ON public.payment_request
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin')
        )
    );
```

### Step 3: Verify the Table Creation
After running the script, you should see:
- A new `payment_request` table in your database
- Proper indexes for performance
- Row Level Security (RLS) enabled with appropriate policies
- An automatic `updated_at` trigger

## Features

The payment request system now includes:

### For Workers (Car Washers):
- **Create Payment Requests**: Workers can request payments based on their earnings
- **Earnings Validation**: Cannot request more than available earnings
- **Deductions Support**: Material and tool deductions are tracked
- **Status Tracking**: View pending, approved, rejected, and paid requests
- **Request Management**: Cancel pending requests

### For Admins:
- **Review Requests**: View all payment requests from workers
- **Approve/Reject**: Take action on pending requests
- **Mark as Paid**: Update status when payment is completed
- **Admin Notes**: Add notes and comments to requests
- **Dashboard**: Overview of request counts by status

### Key Benefits:
1. **Earnings Integration**: Directly connected to `car_washer_profiles.total_earnings`
2. **Validation**: Prevents over-requesting beyond available earnings
3. **Transparency**: Clear tracking of deductions and net amounts
4. **Workflow**: Proper approval process with admin oversight
5. **Audit Trail**: Complete history of all payment requests

## Usage

### Workers:
- Navigate to `/payment-requests` to create and manage payment requests
- View current earnings and request history
- Submit requests with optional deductions and notes

### Admins:
- Navigate to `/admin/payment-requests` to manage all requests
- Review and take action on pending requests
- Track payment status across all workers

## Database Schema

The `payment_request` table structure:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `washer_id` | UUID | Reference to worker (required) |
| `admin_id` | UUID | Reference to admin who reviewed (optional) |
| `approval_date` | TIMESTAMP | When the request was approved/rejected |
| `total_earnings` | NUMERIC | Worker's total earnings at request time |
| `material_deductions` | NUMERIC | Material cost deductions |
| `tool_deductions` | NUMERIC | Tool cost deductions |
| `status` | VARCHAR | Request status (pending/approved/rejected/paid) |
| `admin_notes` | TEXT | Admin comments and notes |
| `created_at` | TIMESTAMP | When request was created |
| `updated_at` | TIMESTAMP | When request was last updated |

## Security

- **Row Level Security (RLS)** is enabled
- Workers can only access their own requests
- Admins can access all requests
- Proper role-based access control
- Secure API endpoints with authentication

## Next Steps

After setting up the database:

1. **Test the System**: Create a test payment request as a worker
2. **Admin Review**: Test the admin approval workflow
3. **Integration**: Ensure the system works with your existing car washer profiles
4. **Customization**: Adjust the deduction types or add additional fields as needed

The system is now ready to handle payment requests efficiently while maintaining proper security and workflow controls.
