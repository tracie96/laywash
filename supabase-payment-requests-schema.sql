-- Car Washer Payment Requests Table
CREATE TABLE IF NOT EXISTS carwasher_payment_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  washer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_amount DECIMAL(10,2) NOT NULL,
  request_type VARCHAR(50) NOT NULL DEFAULT 'salary' CHECK (request_type IN ('salary', 'bonus', 'overtime', 'advance')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  request_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  requested_for_period_start DATE,
  requested_for_period_end DATE,
  description TEXT,
  notes TEXT,
  
  -- Admin fields
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  approved_amount DECIMAL(10,2),
  payment_method VARCHAR(50),
  payment_reference VARCHAR(100),
  paid_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_carwasher_payment_requests_washer_id ON carwasher_payment_requests(washer_id);
CREATE INDEX IF NOT EXISTS idx_carwasher_payment_requests_status ON carwasher_payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_carwasher_payment_requests_request_date ON carwasher_payment_requests(request_date);

-- Add RLS (Row Level Security) - you can adjust these based on your security needs
ALTER TABLE carwasher_payment_requests ENABLE ROW LEVEL SECURITY;

-- Car washers can view and create their own payment requests
CREATE POLICY "Car washers can manage their own payment requests" ON carwasher_payment_requests
  FOR ALL
  USING (
    auth.uid() = washer_id
    OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_carwasher_payment_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_carwasher_payment_requests_updated_at
  BEFORE UPDATE ON carwasher_payment_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_carwasher_payment_requests_updated_at();

-- Comments for documentation
COMMENT ON TABLE carwasher_payment_requests IS 'Stores payment requests from car washers for salary, bonuses, etc.';
COMMENT ON COLUMN carwasher_payment_requests.washer_id IS 'Reference to the car washer making the request';
COMMENT ON COLUMN carwasher_payment_requests.requested_amount IS 'Amount requested by the car washer';
COMMENT ON COLUMN carwasher_payment_requests.request_type IS 'Type of payment: salary, bonus, overtime, advance';
COMMENT ON COLUMN carwasher_payment_requests.status IS 'Request status: pending, approved, rejected, paid';
COMMENT ON COLUMN carwasher_payment_requests.requested_for_period_start IS 'Start date for the period this payment covers';
COMMENT ON COLUMN carwasher_payment_requests.requested_for_period_end IS 'End date for the period this payment covers';

