"use client";
import React, { ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/carwash';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: UserRole[];
  fallback?: ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ 
  children, 
  allowedRoles, 
  fallback 
}) => {
  const { user, isLoading, hasAnyRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/signin');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-light-600"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to signin
  }

  if (!hasAnyRole(allowedRoles)) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You don&apos;t have permission to access this page.
          </p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-green-light-600 text-white rounded-lg hover:bg-green-light-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Convenience components for specific roles
export const SuperAdminOnly: React.FC<{ children: ReactNode }> = ({ children }) => (
  <RoleGuard allowedRoles={['super_admin']}>
    {children}
  </RoleGuard>
);

export const AdminOnly: React.FC<{ children: ReactNode }> = ({ children }) => (
  <RoleGuard allowedRoles={['admin']}>
    {children}
  </RoleGuard>
);

export const CarWasherOnly: React.FC<{ children: ReactNode }> = ({ children }) => (
  <RoleGuard allowedRoles={['car_washer']}>
    {children}
  </RoleGuard>
);

export const AdminAndSuperAdmin: React.FC<{ children: ReactNode }> = ({ children }) => (
  <RoleGuard allowedRoles={['admin', 'super_admin']}>
    {children}
  </RoleGuard>
); 