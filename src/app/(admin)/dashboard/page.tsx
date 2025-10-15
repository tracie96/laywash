"use client";
import React from 'react';
import { useAuth } from '../../../context/AuthContext';
// import SuperAdminDashboard from '../../../components/carwash/dashboards/SuperAdminDashboard';
import AdminDashboard from '../../../components/carwash/dashboards/AdminDashboard';
import CarWasherDashboard from '../../../components/carwash/dashboards/CarWasherDashboard';

const DashboardPage: React.FC = () => {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-light-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-light-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null; 
  }

  return (
    <div className="p-6">
      {user.role === 'super_admin' && <AdminDashboard />}
      {user.role === 'admin' && <AdminDashboard />}
      {user.role === 'car_washer' && <CarWasherDashboard />}
    </div>
  );
};

export default DashboardPage; 