"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole, Customer } from '../types/carwash';
import { AuthService } from '../lib/auth';
import { UploadService } from '../lib/upload';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  signUpSuperAdmin: (name: string, email: string, phone: string, password: string) => Promise<{ success: boolean; error?: string }>;
  createAdmin: (
    name: string, 
    email: string, 
    phone: string, 
    password: string,
    location?: string, 
    address?: string, 
    nextOfKin?: Array<{name: string; phone: string; address: string}>, 
    cvFile?: File, 
    pictureFile?: File
  ) => Promise<{ success: boolean; error?: string }>;
  createCarWasher: (
    name: string, 
    email: string, 
    phone: string, 
    password: string,
    assignedLocation?: string,
    bankInformation?: string,
    nextOfKin?: Array<{name: string; phone: string; address: string}>,
    pictureFile?: File
  ) => Promise<{ success: boolean; error?: string }>;
  createCustomer: (customerData: {
    name: string;
    email?: string;
    phone: string;
    licensePlate: string;
    vehicleType: string;
    vehicleModel?: string;
    vehicleColor: string;
  }) => Promise<{ success: boolean; error?: string }>;
  fetchCustomers: (params?: {
    search?: string;
    filter?: 'all' | 'registered' | 'unregistered';
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => Promise<{ success: boolean; customers?: Customer[]; error?: string }>;
  searchCustomersByEmail: (email: string) => Promise<{ success: boolean; customers?: Customer[]; found?: boolean; error?: string }>;
  searchCustomers: (params: { email?: string; licensePlate?: string; name?: string; phone?: string; query?: string }) => Promise<{ success: boolean; customers?: Customer[]; found?: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await AuthService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (identifier: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Determine if identifier is email or phone
      const isEmail = identifier.includes('@');
      const isPhone = /^\+?[\d\s\-\(\)]+$/.test(identifier);
      
      if (!isEmail && !isPhone) {
        console.error('Invalid identifier format');
        return false;
      }
      
      const response = await AuthService.login({ 
        email: isEmail ? identifier : undefined,
        phone: isPhone ? identifier : undefined,
        password
      });
      
      if (response.success && response.user) {
        setUser(response.user);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  

  const logout = async () => {
    try {
      await AuthService.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const signUpSuperAdmin = async (name: string, email: string, phone: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const response = await AuthService.signUpSuperAdmin({
        name,
        email,
        phone,
        password,
      });
      
      if (response.success && response.user) {
        setUser(response.user);
        return { success: true };
      }
      
      return { success: false, error: response.error };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setIsLoading(false);
    }
  };

  const createAdmin = async (
    name: string, 
    email: string, 
    phone: string, 
    password: string,
    location?: string,
    address?: string, 
    nextOfKin?: Array<{name: string; phone: string; address: string}>, 
    cvFile?: File, 
    pictureFile?: File
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user || user.role !== 'super_admin') {
      console.error('Only Super Admins can create admin users');
      return { success: false, error: 'Only Super Admins can create admin users' };
    }

    try {
      let cvUrl = '';
      let pictureUrl = '';

      // Generate a temporary ID for file naming (we'll use this before we get the actual user ID)
      const tempId = Date.now().toString();

      // Upload files if provided
      if (cvFile) {
        const cvUpload = await UploadService.uploadAdminCV(cvFile, tempId);
        if (!cvUpload.success) {
          return { success: false, error: `CV upload failed: ${cvUpload.error}` };
        }
        cvUrl = cvUpload.url!;
      }

      if (pictureFile) {
        const pictureUpload = await UploadService.uploadAdminPicture(pictureFile, tempId);
        if (!pictureUpload.success) {
          return { success: false, error: `Picture upload failed: ${pictureUpload.error}` };
        }
        pictureUrl = pictureUpload.url!;
      }

      // Create admin with all the data
      const response = await fetch('/api/admin/create-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          phone,
          password,
          address: address || '',
          location,
          nextOfKin: nextOfKin || [],
          cvUrl: cvUrl || null,
          pictureUrl: pictureUrl || null,
          createdBy: user.id,
        }),
      });

      const result = await response.json();
      return { success: result.success, error: result.error };
    } catch (error) {
      console.error('Create admin error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const createCarWasher = async (
    name: string, 
    email: string, 
    phone: string, 
    password: string,
    assignedLocation?: string,
    bankInformation?: string,
    nextOfKin?: Array<{name: string; phone: string; address: string}>,
    pictureFile?: File
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      console.error('Only Super Admins and Admins can create car washer users');
      return { success: false, error: 'Only Super Admins and Admins can create car washer users' };
    }

    try {
      let pictureUrl = '';

      // Generate a temporary ID for file naming (we'll use this before we get the actual user ID)
      const tempId = Date.now().toString();

      // Upload picture if provided
      if (pictureFile) {
        const pictureUpload = await UploadService.uploadWorkerPicture(pictureFile, tempId);
        if (!pictureUpload.success) {
          return { success: false, error: `Picture upload failed: ${pictureUpload.error}` };
        }
        pictureUrl = pictureUpload.url!;
      }

      const response = await fetch('/api/admin/create-carwasher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          phone,
          password,
          assignedLocation,
          bankInformation,
          nextOfKin: nextOfKin || [],
          pictureUrl: pictureUrl || null,
          createdBy: user.id,
        }),
      });

      const result = await response.json();
      return { success: result.success, error: result.error };
    } catch (error) {
      console.error('Create car washer error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const createCustomer = async (customerData: {
    name: string;
    email?: string;
    phone: string;
    licensePlate: string;
    vehicleType: string;
    vehicleModel?: string;
    vehicleColor: string;
  }) => {
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      console.error('Only Super Admins and Admins can create customers');
      return { success: false, error: 'Only Super Admins and Admins can create customers' };
    }

    try {
      const response = await fetch('/api/admin/create-customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...customerData,
          createdBy: user.id,
        }),
      });

      const result = await response.json();
      return { success: result.success, error: result.error };
    } catch (error) {
      console.error('Create customer error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const fetchCustomers = async (params?: {
    search?: string;
    filter?: 'all' | 'registered' | 'unregistered';
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => {
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      console.error('Only Super Admins and Admins can fetch customers');
      return { success: false, error: 'Only Super Admins and Admins can fetch customers' };
    }

    try {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.append('search', params.search);
      if (params?.filter) searchParams.append('filter', params.filter);
      if (params?.sortBy) searchParams.append('sortBy', params.sortBy);
      if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder);

      const response = await fetch(`/api/admin/customers?${searchParams.toString()}`);
      const result = await response.json();
      return { success: result.success, customers: result.customers, error: result.error };
    } catch (error) {
      console.error('Fetch customers error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const searchCustomersByEmail = async (email: string): Promise<{ success: boolean; customers?: Customer[]; found?: boolean; error?: string }> => {
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      console.error('Only Super Admins and Admins can search customers by email');
      return { success: false, error: 'Only Super Admins and Admins can search customers by email' };
    }

    try {
      const response = await fetch(`/api/admin/customers/search?email=${encodeURIComponent(email)}`);
      const result = await response.json();
      return { success: result.success, customers: result.customers, found: result.found, error: result.error };
    } catch (error) {
      console.error('Search customers by email error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const searchCustomers = async (params: { email?: string; licensePlate?: string; name?: string; phone?: string; query?: string }): Promise<{ success: boolean; customers?: Customer[]; found?: boolean; error?: string }> => {
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      console.error('Only Super Admins and Admins can search customers');
      return { success: false, error: 'Only Super Admins and Admins can search customers' };
    }

    if (!params.email && !params.licensePlate && !params.name && !params.phone && !params.query) {
      return { success: false, error: 'Search parameter is required' };
    }

    try {
      const searchParams = new URLSearchParams();
      if (params.email) searchParams.append('email', params.email);
      if (params.licensePlate) searchParams.append('licensePlate', params.licensePlate);
      if (params.name) searchParams.append('name', params.name);
      if (params.phone) searchParams.append('phone', params.phone);
      if (params.query) searchParams.append('query', params.query);

      const response = await fetch(`/api/admin/customers/search?${searchParams.toString()}`);
      const result = await response.json();
      return { success: result.success, customers: result.customers, found: result.found, error: result.error };
    } catch (error) {
      console.error('Search customers error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const hasRole = (role: UserRole): boolean => {
    return user?.role === role;
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    return user ? roles.includes(user.role) : false;
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user,
    hasRole,
    hasAnyRole,
    signUpSuperAdmin,
    createAdmin,
    createCarWasher,
    createCustomer,
    fetchCustomers,
    searchCustomersByEmail,
    searchCustomers,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 