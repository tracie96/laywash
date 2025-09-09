-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_type VARCHAR(50) NOT NULL CHECK (service_type IN ('checkin', 'salary', 'sales', 'free_will', 'deposit_to_bank', 'other')),
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  description TEXT,
  admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  check_in_id UUID REFERENCES car_check_ins(id) ON DELETE SET NULL,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  expense_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_expenses_service_type ON expenses(service_type);
CREATE INDEX IF NOT EXISTS idx_expenses_admin_id ON expenses(admin_id);
CREATE INDEX IF NOT EXISTS idx_expenses_location_id ON expenses(location_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at);

-- Add comments for documentation
COMMENT ON TABLE expenses IS 'Tracks various types of business expenses including free services, salaries, and other costs';
COMMENT ON COLUMN expenses.service_type IS 'Type of expense: checkin (free car wash), salary (admin/washer pay), sales (free sales), free_will (voluntary), deposit_to_bank (bank deposits), other';
COMMENT ON COLUMN expenses.amount IS 'Amount of the expense in Naira';
COMMENT ON COLUMN expenses.reason IS 'Brief reason for the expense';
COMMENT ON COLUMN expenses.description IS 'Detailed description of the expense';
COMMENT ON COLUMN expenses.admin_id IS 'Admin who recorded the expense';
COMMENT ON COLUMN expenses.check_in_id IS 'Related check-in if expense is for a free car wash';
COMMENT ON COLUMN expenses.location_id IS 'Location where expense occurred';
COMMENT ON COLUMN expenses.expense_date IS 'Date when the expense actually occurred';
