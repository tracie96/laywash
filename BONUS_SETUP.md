# Bonus Management Setup Guide

## Database Setup

The bonus management system requires a `bonuses` table to be created in your Supabase database. Follow these steps to set it up:

### Step 1: Access Supabase Dashboard
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to the **SQL Editor** in the left sidebar

### Step 2: Create the Bonuses Table
Copy and paste the following SQL script into the SQL Editor:

```sql
-- Create bonuses table for car wash management system
CREATE TABLE IF NOT EXISTS public.bonuses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('customer', 'washer')),
    recipient_id UUID NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL,
    milestone TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bonuses_type ON public.bonuses(type);
CREATE INDEX IF NOT EXISTS idx_bonuses_status ON public.bonuses(status);
CREATE INDEX IF NOT EXISTS idx_bonuses_recipient_id ON public.bonuses(recipient_id);
CREATE INDEX IF NOT EXISTS idx_bonuses_created_at ON public.bonuses(created_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bonuses_updated_at 
    BEFORE UPDATE ON public.bonuses 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.bonuses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow super admins to read all bonuses
CREATE POLICY "Super admins can read all bonuses" ON public.bonuses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

-- Allow super admins to insert bonuses
CREATE POLICY "Super admins can insert bonuses" ON public.bonuses
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

-- Allow super admins to update bonuses
CREATE POLICY "Super admins can update bonuses" ON public.bonuses
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

-- Allow super admins to delete bonuses
CREATE POLICY "Super admins can delete bonuses" ON public.bonuses
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

-- Grant necessary permissions
GRANT ALL ON public.bonuses TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
```

### Step 3: Run the Script
1. Click the **Run** button in the SQL Editor
2. Wait for the script to complete successfully
3. You should see a success message

### Step 4: Verify Setup
1. Go to the **Table Editor** in your Supabase dashboard
2. You should see a new `bonuses` table listed
3. The table should have the following columns:
   - `id` (UUID, Primary Key)
   - `type` (Text)
   - `recipient_id` (UUID)
   - `amount` (Decimal)
   - `reason` (Text)
   - `milestone` (Text, nullable)
   - `status` (Text)
   - `approved_by` (UUID, nullable)
   - `approved_at` (Timestamp, nullable)
   - `paid_at` (Timestamp, nullable)
   - `created_at` (Timestamp)
   - `updated_at` (Timestamp)

### Step 5: Test the Feature
1. Go back to your application
2. Navigate to **Financial > Bonuses**
3. The page should load without errors
4. You should be able to create, view, and manage bonuses

## Features Available

Once the table is set up, you'll have access to:

- ✅ **Create Bonuses** - For both customers and washers
- ✅ **View All Bonuses** - With filtering by type and status
- ✅ **Approve/Reject Bonuses** - For pending bonuses
- ✅ **Mark as Paid** - For approved bonuses
- ✅ **Delete Bonuses** - For non-paid bonuses
- ✅ **Dashboard Overview** - Summary cards with key metrics

## Troubleshooting

If you encounter any issues:

1. **"Table does not exist" error**: Make sure you've run the SQL script successfully
2. **Permission errors**: Ensure your user has the 'super_admin' role
3. **Data not loading**: Check the browser console for any API errors
4. **Foreign key errors**: The system uses separate queries instead of joins for flexibility

## Support

If you continue to have issues, check:
- Supabase logs in the dashboard
- Browser developer console for errors
- Network tab for failed API requests
