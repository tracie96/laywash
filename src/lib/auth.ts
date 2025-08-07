import { supabase } from './supabase';
import { User, UserRole } from '../types/carwash';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignUpData {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
}

export class AuthService {
  // Login with email and password
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: 'No user data received',
        };
      }

      // Get user profile from our users table
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError || !userProfile) {
        return {
          success: false,
          error: 'User profile not found',
        };
      }

      // Check if user is active
      if (!userProfile.is_active) {
        return {
          success: false,
          error: 'Account is deactivated',
        };
      }

      const user: User = {
        id: userProfile.id,
        name: userProfile.name,
        email: userProfile.email,
        phone: userProfile.phone,
        role: userProfile.role as UserRole,
        isActive: userProfile.is_active,
        createdAt: new Date(userProfile.created_at),
        updatedAt: new Date(userProfile.updated_at),
      };

      return {
        success: true,
        user,
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'An unexpected error occurred',
      };
    }
  }

  // Sign up for Super Admin (only Super Admins can register)
  static async signUpSuperAdmin(signUpData: SignUpData): Promise<AuthResponse> {
    try {
      // First, create the user in Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        }
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: 'Failed to create user account',
        };
      }

      // Create user profile in our users table
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          name: signUpData.name,
          email: signUpData.email,
          phone: signUpData.phone,
          role: 'super_admin',
          is_active: true,
        })
        .select()
        .single();

      if (profileError) {
        // If profile creation fails, we should clean up the auth user
        await supabase.auth.admin.deleteUser(data.user.id);
        return {
          success: false,
          error: 'Failed to create user profile',
        };
      }

      // Check if we have a session (user is immediately signed in)
      if (data.session) {
        const user: User = {
          id: userProfile.id,
          name: userProfile.name,
          email: userProfile.email,
          phone: userProfile.phone,
          role: userProfile.role as UserRole,
          isActive: userProfile.is_active,
          createdAt: new Date(userProfile.created_at),
          updatedAt: new Date(userProfile.updated_at),
        };

        return {
          success: true,
          user,
        };
      } else {
        // Email confirmation is required
        return {
          success: false,
          error: 'Account created successfully! Please check your email to confirm your account before signing in.',
        };
      }
    } catch (error) {
      console.error('Sign up error:', error);
      return {
        success: false,
        error: 'An unexpected error occurred',
      };
    }
  }



  // Logout
  static async logout(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  // Get current user
  static async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return null;
      }

      // Get user profile from our users table
      const { data: userProfile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error || !userProfile) {
        return null;
      }

      return {
        id: userProfile.id,
        name: userProfile.name,
        email: userProfile.email,
        phone: userProfile.phone,
        role: userProfile.role as UserRole,
        isActive: userProfile.is_active,
        createdAt: new Date(userProfile.created_at),
        updatedAt: new Date(userProfile.updated_at),
      };
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  // Reset password
  static async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error('Reset password error:', error);
      return {
        success: false,
        error: 'An unexpected error occurred',
      };
    }
  }

  // Update password
  static async updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error('Update password error:', error);
      return {
        success: false,
        error: 'An unexpected error occurred',
      };
    }
  }
} 