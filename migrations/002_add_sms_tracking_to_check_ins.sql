-- Add SMS tracking fields to car_check_ins table
-- This migration adds fields to track when SMS messages are sent to customers

ALTER TABLE car_check_ins 
ADD COLUMN sms_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN sms_sent_at TIMESTAMP WITH TIME ZONE;

-- Add index for better query performance
CREATE INDEX idx_car_check_ins_sms_sent ON car_check_ins(sms_sent);
CREATE INDEX idx_car_check_ins_sms_sent_at ON car_check_ins(sms_sent_at);

-- Add comment to document the purpose of these fields
COMMENT ON COLUMN car_check_ins.sms_sent IS 'Indicates whether an SMS has been sent to the customer for this check-in';
COMMENT ON COLUMN car_check_ins.sms_sent_at IS 'Timestamp when the SMS was sent to the customer';
