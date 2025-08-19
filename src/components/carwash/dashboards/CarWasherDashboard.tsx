"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';

interface Assignment {
  id: string;
  customerName: string;
  licensePlate: string;
  vehicleType: string;
  vehicleModel?: string;
  services: string[];
  estimatedDuration: number;
  checkInTime: Date;
  amount: number;
}

interface CompletedJob {
  id: string;
  customerName: string;
  licensePlate: string;
  vehicleType: string;
  completedAt: Date;
  earnings: number;
}

interface Metrics {
  todayEarnings: number;
  carsCompleted: number;
  pendingAssignments: number;
  totalEarnings: number;
}

interface DashboardData {
  metrics: Metrics;
  currentAssignments: Assignment[];
  recentCompleted: CompletedJob[];
}

const CarWasherDashboard: React.FC = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);



  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user?.id) {
        setError('User not authenticated');
        return;
      }
      
      const washerId = user.id;
      const response = await fetch(`/api/admin/carwasher-dashboard?washerId=${washerId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Transform dates back to Date objects
        const transformedData = {
          ...result.data,
          currentAssignments: result.data.currentAssignments.map((assignment: Assignment & { checkInTime: string }) => ({
            ...assignment,
            checkInTime: new Date(assignment.checkInTime)
          })),
          recentCompleted: result.data.recentCompleted.map((completed: CompletedJob & { completedAt: string }) => ({
            ...completed,
            completedAt: new Date(completed.completedAt)
          }))
        };
        
        setDashboardData(transformedData);
      } else {
        setError(result.error || 'Failed to load dashboard data');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchDashboardData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const handleMarkComplete = async (assignmentId: string) => {
    try {
      // TODO: Implement mark complete functionality
      console.log('Mark complete:', assignmentId);
      // Refresh data after marking complete
      await fetchDashboardData();
    } catch (err) {
      console.error('Error marking assignment complete:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
        <button 
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!dashboardData) {
    return <div>No data available</div>;
  }

  const { metrics, currentAssignments, recentCompleted } = dashboardData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            My Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Track your assignments and earnings
          </p>
        </div>
        <div className="text-right">
          <button 
            onClick={fetchDashboardData}
            className="mb-2 px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
          <p className="text-sm text-gray-500 dark:text-gray-400">Today&apos;s Summary</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Today's Earnings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Today&apos;s Earnings
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${metrics.todayEarnings}
              </p>
            </div>
            <div className="p-3 bg-green-light-100 dark:bg-green-light-900/30 rounded-lg">
              <svg className="w-6 h-6 text-green-light-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>

        {/* Cars Completed */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Cars Completed
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics.carsCompleted}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Pending Assignments */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Pending Assignments
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics.pendingAssignments}
              </p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Total Earnings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Earnings
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${metrics.totalEarnings.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Current Assignments and Recent Completed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Assignments */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Current Assignments
          </h3>
          <div className="space-y-4">
            {currentAssignments.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No current assignments
              </p>
            ) : (
              currentAssignments.map((assignment) => (
              <div key={assignment.id} className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {assignment.customerName}
                  </h4>
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 rounded-full">
                    In Progress
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <p>License: {assignment.licensePlate}</p>
                  <p>Vehicle: {assignment.vehicleType}</p>
                  <p>Services: {assignment.services.join(', ')}</p>
                  <p>Duration: {assignment.estimatedDuration} minutes</p>
                  <p>Started: {assignment.checkInTime.toLocaleTimeString()}</p>
                </div>
                <div className="mt-3 flex space-x-2">
                  <button 
                    onClick={() => handleMarkComplete(assignment.id)}
                    className="px-3 py-1 bg-green-light-600 text-white text-sm rounded-lg hover:bg-green-light-700 transition-colors"
                  >
                    Mark Complete
                  </button>
                  <button className="px-3 py-1 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors">
                    Update Status
                  </button>
                </div>
              </div>
              ))
            )}
          </div>
        </div>

        {/* Recently Completed */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recently Completed
          </h3>
          <div className="space-y-4">
            {recentCompleted.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No completed jobs today
              </p>
            ) : (
              recentCompleted.map((completed) => (
              <div key={completed.id} className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {completed.customerName}
                  </h4>
                  <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 rounded-full">
                    Completed
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <p>License: {completed.licensePlate}</p>
                  <p>Completed: {completed.completedAt.toLocaleTimeString()}</p>
                  <p className="font-medium text-green-600 dark:text-green-400">
                    Earnings: ${completed.earnings}
                  </p>
                </div>
              </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 bg-green-light-50 dark:bg-green-light-900/30 rounded-lg hover:bg-green-light-100 dark:hover:bg-green-light-900/50 transition-colors">
            <div className="text-center">
              <svg className="w-8 h-8 text-green-light-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Mark Complete</p>
            </div>
          </button>
          <button className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
            <div className="text-center">
              <svg className="w-8 h-8 text-blue-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <p className="text-sm font-medium text-gray-900 dark:text-white">View Profile</p>
            </div>
          </button>
          <button className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors">
            <div className="text-center">
              <svg className="w-8 h-8 text-purple-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Income History</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CarWasherDashboard; 