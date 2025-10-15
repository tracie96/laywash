"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
interface DashboardMetrics {
  totalIncome: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  carWashIncome: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  stockSalesIncome: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  carCount: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  activeWashers: number;
  pendingCheckIns: number;
  pendingPayments: number;
  lowStockItems: number;
  topPerformingWashers: TopPerformingWasher[];
  recentActivities: RecentActivity[];
}

interface TopPerformingWasher {
  washer: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    role: string;
    isActive: boolean;
    totalEarnings: number;
    isAvailable: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  carsWashed: number;
  totalEarnings: number;
}

interface RecentActivity {
  type: string;
  description: string;
  timestamp: Date;
}

interface CheckIn {
  id: string;
  customerName: string;
  licensePlate: string;
  status: string;
  checkInTime: Date;
  assignedWasher: string;
  assignedWasherId?: string;
  vehicleType?: string;
  vehicleColor?: string;
  vehicleModel?: string;
  services: string[];
  totalPrice?: number;
  paymentStatus?: string;
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentCheckIns, setRecentCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  // Fetch dashboard metrics
  const fetchDashboardMetrics = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch('/api/admin/dashboard-metrics', {
        headers: {
          'X-Admin-ID': user.id,
        },
      });
      const result = await response.json();
      
      if (result.success) {
        setMetrics(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch dashboard metrics');
      }
    } catch (err) {
      console.error('Error fetching dashboard metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load metrics');
    }
  }, [user?.id]);
  // Fetch recent check-ins
  const fetchRecentCheckIns = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch('/api/admin/check-ins?limit=5&sortBy=check_in_time&sortOrder=desc', {
        headers: {
          'X-Admin-ID': user.id,
        },
      });
      const result = await response.json();
      
      if (result.success) {
        setRecentCheckIns(result.checkIns || []);
      } else {
        throw new Error(result.error || 'Failed to fetch recent check-ins');
      }
    } catch (err) {
      console.error('Error fetching recent check-ins:', err);
      setError(err instanceof Error ? err.message : 'Failed to load recent check-ins');
    }
  }, [user?.id]);

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        await Promise.all([
          fetchDashboardMetrics(),
          fetchRecentCheckIns()
        ]);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.id, fetchDashboardMetrics, fetchRecentCheckIns]);

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Admin Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Loading dashboard data...
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 animate-pulse">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
             Loading Dashboard...
            </h1>
            <p className="text-red-600 dark:text-red-400 mt-2">
              Error: {error}
            </p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Hello {user?.name}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your daily car wash operations and stock sales
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500 dark:text-gray-400">Today&apos;s Overview</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Today's Check-ins */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Today&apos;s Check-ins
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics?.carCount?.daily || 0}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>

        {/* Pending Check-ins */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Pending Check-ins
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics?.pendingCheckIns || 0}
              </p>
              <span className="text-orange-600">
                ₦ {metrics?.pendingPayments?.toLocaleString()}
              </span>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          
          </div>
        </div>

        {/* Today's Earnings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Today&apos;s Total Earnings
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ₦ {(metrics?.totalIncome?.daily || 0).toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-green-light-100 dark:bg-green-light-900/30 rounded-lg">
              <svg className="w-6 h-6 text-green-light-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
          
          {/* Earnings Breakdown */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Car Wash:</span>
              <span className="font-medium text-blue-600">
                ₦ {(metrics?.carWashIncome?.daily || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Stock Sales:</span>
              <span className="font-medium text-purple-600">
                ₦ {(metrics?.stockSalesIncome?.daily || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Today's Stock Sales */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Today&apos;s Stock Sales
              </p>
              <p className="text-2xl font-bold text-purple-600">
                ₦ {(metrics?.stockSalesIncome?.daily || 0).toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Earnings Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Weekly Earnings</h3>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            ₦ {(metrics?.totalIncome?.weekly || 0).toLocaleString()}
          </p>
          <div className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Car Wash:</span>
              <span className="text-blue-600">₦ {(metrics?.carWashIncome?.weekly || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Stock Sales:</span>
              <span className="text-purple-600">₦ {(metrics?.stockSalesIncome?.weekly || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Monthly Earnings</h3>
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            ₦ {(metrics?.totalIncome?.monthly || 0).toLocaleString()}
          </p>
          <div className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Car Wash:</span>
              <span className="text-blue-600">₦ {(metrics?.carWashIncome?.monthly || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Stock Sales:</span>
              <span className="text-purple-600">₦ {(metrics?.stockSalesIncome?.monthly || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Revenue Breakdown</h3>
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Car Wash %</span>
              <span className="text-sm font-medium text-blue-600">
                {metrics?.totalIncome?.daily ? 
                  Math.round((metrics.carWashIncome.daily / metrics.totalIncome.daily) * 100) : 0}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Stock Sales %</span>
              <span className="text-sm font-medium text-purple-600">
                {metrics?.totalIncome?.daily ? 
                  Math.round((metrics.stockSalesIncome.daily / metrics.totalIncome.daily) * 100) : 0}%
              </span>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-600 pt-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-900 dark:text-white">Total</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">100%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions and Recent Check-ins */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h3>
          <div className="space-y-3">
            <button onClick={() => router.push('/checkins/new')} className="w-full p-3 bg-green-light-50 dark:bg-green-light-900/30 rounded-lg hover:bg-green-light-100 dark:hover:bg-green-light-900/50 transition-colors text-left">
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-green-light-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span className="font-medium text-gray-900 dark:text-white">New Car Check-in</span>
              </div>
            </button>
            <button onClick={() => router.push('/operations/customers')} className="w-full p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors text-left">
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="font-medium text-gray-900 dark:text-white">Register Customer</span>
              </div>
            </button>
            <button onClick={() => router.push('/stock/update')} className="w-full p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors text-left">
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="font-medium text-gray-900 dark:text-white">Update Stock</span>
              </div>
            </button>
            <button onClick={() => router.push('/reports')} className="w-full p-3 bg-orange-50 dark:bg-orange-900/30 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors text-left">
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="font-medium text-gray-900 dark:text-white">View Reports</span>
              </div>
            </button>
          </div>
        </div>

        {/* Recent Check-ins */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Check-ins
          </h3>
          <div className="space-y-4">
            {recentCheckIns.length > 0 ? (
              recentCheckIns.map((checkIn) => (
              <div key={checkIn.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {checkIn.customerName}
                  </h4>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    checkIn.status === 'in_progress' 
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        : checkIn.status === 'completed'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                  }`}>
                      {checkIn.status === 'in_progress' ? 'In Progress' : 
                       checkIn.status === 'completed' ? 'Completed' : 'Pending'}
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <p>License: {checkIn.licensePlate}</p>
                  <p>Washer: {checkIn.assignedWasher}</p>
                    <p>Time: {new Date(checkIn.checkInTime).toLocaleTimeString()}</p>
                    {checkIn.services && checkIn.services.length > 0 && (
                      <p>Services: {checkIn.services.join(', ')}</p>
                    )}
                    {checkIn.totalPrice && (
                      <p className="font-medium text-green-600 dark:text-green-400">
                        ₦ {checkIn.totalPrice.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>No recent check-ins found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {metrics && metrics.lowStockItems > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <p className="font-medium text-orange-800 dark:text-orange-200">
                Low Stock Alert
              </p>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                {metrics.lowStockItems} items are running low on stock
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Additional Metrics Cards - Weekly and Monthly Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Weekly Earnings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Weekly Earnings
            </p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              ₦ {(metrics?.totalIncome?.weekly || 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Monthly Earnings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Monthly Earnings
            </p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              ₦ {(metrics?.totalIncome?.monthly || 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Active Washers */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Active Washers
            </p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {metrics?.activeWashers || 0}
            </p>
          </div>
        </div>

        {/* Monthly Cars */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Monthly Cars
            </p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {metrics?.carCount?.monthly || 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 