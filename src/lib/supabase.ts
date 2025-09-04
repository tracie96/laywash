import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types based on our schema
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string;
          role: 'super_admin' | 'admin' | 'car_washer';
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          phone: string;
          role?: 'super_admin' | 'admin' | 'car_washer';
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          phone?: string;
          role?: 'super_admin' | 'admin' | 'car_washer';
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      admin_profiles: {
        Row: {
          id: string;
          user_id: string;
          location: string | null;
          address: string | null;
          cv_url: string | null;
          picture_url: string | null;
          next_of_kin: { name: string; phone: string; address: string }[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          location?: string | null;
          address?: string | null;
          cv_url?: string | null;
          picture_url?: string | null;
          next_of_kin?: { name: string; phone: string; address: string }[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          location?: string | null;
          address?: string | null;
          cv_url?: string | null;
          picture_url?: string | null;
          next_of_kin?: { name: string; phone: string; address: string }[];
          created_at?: string;
          updated_at?: string;
        };
      };
      car_washer_profiles: {
        Row: {
          id: string;
          user_id: string;
          assigned_admin_id: string | null;
          hourly_rate: number | null;
          total_earnings: number;
          is_available: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          assigned_admin_id?: string | null;
          hourly_rate?: number | null;
          total_earnings?: number;
          is_available?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          assigned_admin_id?: string | null;
          hourly_rate?: number | null;
          total_earnings?: number;
          is_available?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      customers: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          phone: string;
          license_plate: string;
          vehicle_type: string;
          vehicle_model: string | null;
          vehicle_color: string | null;
          is_registered: boolean;
          registration_date: string | null;
          total_visits: number;
          total_spent: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email?: string | null;
          phone: string;
          license_plate: string;
          vehicle_type: string;
          vehicle_model?: string | null;
          vehicle_color?: string | null;
          is_registered?: boolean;
          registration_date?: string | null;
          total_visits?: number;
          total_spent?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string | null;
          phone?: string;
          license_plate?: string;
          vehicle_type?: string;
          vehicle_model?: string | null;
          vehicle_color?: string | null;
          is_registered?: boolean;
          registration_date?: string | null;
          total_visits?: number;
          total_spent?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      services: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          base_price: number;
          is_active: boolean;
          category: 'exterior' | 'interior' | 'engine' | 'vacuum' | 'complementary';
          estimated_duration: number;
          washer_commission_percentage: number;
          company_commission_percentage: number;
          max_washers_per_service: number;
          commission_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          base_price: number;
          is_active?: boolean;
          category: 'exterior' | 'interior' | 'engine' | 'vacuum' | 'complementary';
          estimated_duration: number;
          washer_commission_percentage?: number;
          company_commission_percentage?: number;
          max_washers_per_service?: number;
          commission_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          base_price?: number;
          is_active?: boolean;
          category?: 'exterior' | 'interior' | 'engine' | 'vacuum' | 'complementary';
          estimated_duration?: number;
          washer_commission_percentage?: number;
          company_commission_percentage?: number;
          max_washers_per_service?: number;
          commission_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      car_check_ins: {
        Row: {
          id: string;
          customer_id: string | null;
          license_plate: string;
          vehicle_type: string;
          vehicle_model: string | null;
          vehicle_color: string | null;
          assigned_washer_id: string | null;
          assigned_admin_id: string | null;
          status: 'pending' | 'in_progress' | 'completed' | 'paid' | 'cancelled';
          check_in_time: string;
          estimated_completion_time: string | null;
          actual_completion_time: string | null;
          total_amount: number;
          company_income: number | null;
          payment_status: 'pending' | 'paid';
          payment_method: 'cash' | 'card' | 'mobile_money' | null;
          valuable_items: string | null;
          user_code: string | null;
          passcode: string | null;
          remarks: string | null;
          wash_type: 'instant' | 'delayed';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id?: string | null;
          license_plate: string;
          vehicle_type: string;
          vehicle_model?: string | null;
          vehicle_color?: string | null;
          assigned_washer_id?: string | null;
          assigned_admin_id?: string | null;
          status?: 'pending' | 'in_progress' | 'completed' | 'paid' | 'cancelled';
          check_in_time?: string;
          estimated_completion_time?: string | null;
          actual_completion_time?: string | null;
          total_amount?: number;
          company_income?: number | null;
          payment_status?: 'pending' | 'paid';
          payment_method?: 'cash' | 'card' | 'mobile_money' | null;
          valuable_items?: string | null;
          user_code?: string | null;
          passcode?: string | null;
          remarks?: string | null;
          wash_type?: 'instant' | 'delayed';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string | null;
          license_plate?: string;
          vehicle_type?: string;
          vehicle_model?: string | null;
          vehicle_color?: string | null;
          assigned_washer_id?: string | null;
          assigned_admin_id?: string | null;
          status?: 'pending' | 'in_progress' | 'completed' | 'paid' | 'cancelled';
          check_in_time?: string;
          estimated_completion_time?: string | null;
          actual_completion_time?: string | null;
          total_amount?: number;
          company_income?: number | null;
          payment_status?: 'pending' | 'paid';
          payment_method?: 'cash' | 'card' | 'mobile_money' | null;
          valuable_items?: string | null;
          user_code?: string | null;
          passcode?: string | null;
          remarks?: string | null;
          wash_type?: 'instant' | 'delayed';
          created_at?: string;
          updated_at?: string;
        };
      };
      locations: {
        Row: {
          id: string;
          address: string;
          lga: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          address: string;
          lga: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          address?: string;
          lga?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      check_in_services: {
        Row: {
          id: string;
          check_in_id: string;
          service_id: string;
          price: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          check_in_id: string;
          service_id: string;
          price: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          check_in_id?: string;
          service_id?: string;
          price?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
} 