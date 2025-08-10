-- Add next of kin and picture fields to car_washer_profiles table
ALTER TABLE car_washer_profiles 
ADD COLUMN IF NOT EXISTS picture_url TEXT,
ADD COLUMN IF NOT EXISTS next_of_kin JSONB DEFAULT '[]'::jsonb;

-- Create storage bucket for car washer pictures (no CV bucket needed for washers)
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('worker-pictures', 'worker-pictures', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for worker pictures
CREATE POLICY IF NOT EXISTS "Worker picture upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'worker-pictures');

CREATE POLICY IF NOT EXISTS "Worker picture view" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'worker-pictures');

-- Add comment explaining the next_of_kin structure
COMMENT ON COLUMN car_washer_profiles.next_of_kin IS 'Array of next of kin objects with structure: [{"name": "string", "phone": "string", "address": "string"}]';
