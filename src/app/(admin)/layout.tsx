"use client";
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { RoleGuard } from '../../components/auth/RoleGuard';
import CarWashSidebar from '../../components/carwash/CarWashSidebar';
import AppHeader from '../../layout/AppHeader';
import Backdrop from '@/layout/Backdrop';
import { useSidebar } from '@/context/SidebarContext';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const { isMobileOpen, isExpanded, isHovered } = useSidebar();
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

  if (!isAuthenticated) {
    return null; // Will redirect to signin
  }
  const mainContentMargin = isMobileOpen
  ? "ml-0"
  : isExpanded || isHovered
  ? "lg:ml-[290px]"
  : "lg:ml-[90px]";

  
  return (
    <RoleGuard allowedRoles={['super_admin', 'admin', 'car_washer']}>
      <div className="min-h-screen xl:flex">
  {/* Sidebar and Backdrop */}
  <CarWashSidebar />
  <Backdrop />
  {/* Main Content Area */}
  <div
    className={`flex-1 transition-all  duration-300 ease-in-out ${mainContentMargin}`}
  >
    {/* Header */}
    <AppHeader />
    {/* Page Content */}
    <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">{children}</div>
  </div>
</div>
    </RoleGuard>
  );
};

export default AdminLayout;

