-- Add new columns to admin_profiles table for additional requirements
ALTER TABLE admin_profiles 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS cv_url TEXT,
ADD COLUMN IF NOT EXISTS picture_url TEXT,
ADD COLUMN IF NOT EXISTS next_of_kin JSONB DEFAULT '[]'::jsonb;

INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('admin-cvs', 'admin-cvs', false),
  ('admin-pictures', 'admin-pictures', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY IF NOT EXISTS "Admin CV upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'admin-cvs');

CREATE POLICY IF NOT EXISTS "Admin CV view" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'admin-cvs');

CREATE POLICY IF NOT EXISTS "Admin picture upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'admin-pictures');

CREATE POLICY IF NOT EXISTS "Admin picture view" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'admin-pictures');

COMMENT ON COLUMN admin_profiles.next_of_kin IS 'Array of next of kin objects with structure: [{"name": "string", "phone": "string", "address": "string"}]';
