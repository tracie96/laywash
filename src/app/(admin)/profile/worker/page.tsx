"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import Badge from '@/components/ui/badge/Badge';
import Image from 'next/image';

interface WorkerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalEarnings: number;
  isAvailable: boolean;
  assignedAdminId: string | null;
  assignedAdminName: string;
  totalCheckIns: number;
  completedCheckIns: number;
  averageRating: number;
  createdAt: string;
  lastActive: string;
  assignedLocation: string;
  address: string;
  emergencyContact: string;
  emergencyPhone: string;
  skills: string[];
  certifications: string[];
  notes: string;
  pictureUrl: string | null;
}

interface WeeklyEarnings {
  week: number;
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
  totalJobs: number;
  completedJobs: number;
  earnings: number;
  completionRate: number;
}

interface WeeklyEarningsSummary {
  totalEarnings: number;
  totalJobs: number;
  totalCompletedJobs: number;
  averageWeeklyEarnings: number;
  weeks: number;
}

const WorkerProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'earnings'>('overview');
  const [weeklyEarnings, setWeeklyEarnings] = useState<WeeklyEarnings[]>([]);
  const [weeklySummary, setWeeklySummary] = useState<WeeklyEarningsSummary | null>(null);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [selectedWeeks, setSelectedWeeks] = useState(4);
  const [customDateRange, setCustomDateRange] = useState<{
    startDate: string;
    endDate: string;
  } | null>(null);
  const [useCustomRange, setUseCustomRange] = useState(false);

  // Initialize custom date range with last 4 weeks
  const initializeCustomDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 28); // 4 weeks ago
    
    setCustomDateRange({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    });
  };
  const fetchWeeklyEarnings = useCallback(async () => {
    if (!user?.id) return;

    try {
      setWeeklyLoading(true);
      
      let url = `/api/admin/weekly-earnings?washerId=${user?.id}`;
      
      if (useCustomRange && customDateRange) {
        url += `&startDate=${customDateRange.startDate}&endDate=${customDateRange.endDate}`;
      } else {
        url += `&weeks=${selectedWeeks}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setWeeklyEarnings(data.weeklyData);
        setWeeklySummary(data.summary);
      }
    } catch (err) {
      console.error('Error fetching weekly earnings:', err);
    } finally {
      setWeeklyLoading(false);
    }
  }, [user?.id, useCustomRange, customDateRange, selectedWeeks]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/worker/profile?workerId=${user?.id}`);
        const data = await response.json();
        if (data.success) {
          setProfile(data.worker);
        } else {
          setError(data.error || 'Failed to fetch profile');
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to fetch profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
    fetchWeeklyEarnings();
    
    // Listen for earnings updates from other pages
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'washer_earnings_updated') {
        console.log('Washer earnings updated, refreshing profile...');
        fetchProfile();
        fetchWeeklyEarnings();
      }
    };
    
    // Listen for localStorage changes (from same tab)
    const handleEarningsUpdate = () => {
      const lastUpdate = localStorage.getItem('washer_earnings_updated');
      if (lastUpdate) {
        const updateTime = parseInt(lastUpdate);
        const now = Date.now();
        // If update was within last 5 seconds, refresh data
        if (now - updateTime < 5000) {
          console.log('Recent washer earnings update detected, refreshing profile...');
          fetchProfile();
          fetchWeeklyEarnings();
        }
      }
    };
    
    // Check for recent updates every 2 seconds
    const interval = setInterval(handleEarningsUpdate, 2000);
    
    // Listen for storage events from other tabs
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user?.id, fetchWeeklyEarnings]);

  // Auto-fetch when selected weeks change (but not for custom range)
  useEffect(() => {
    if (!useCustomRange && user?.id) {
      fetchWeeklyEarnings();
    }
  }, [selectedWeeks, user?.id, fetchWeeklyEarnings, useCustomRange]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-light-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-600 dark:text-red-400">
            {error || 'Failed to load profile'}
          </p>
        </div>
      </div>
    );
  }

  const getAvailabilityBadge = (isAvailable: boolean) => {
    return isAvailable ? (
      <Badge color="success">Available</Badge>
    ) : (
      <Badge color="danger">Unavailable</Badge>
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          My Profile
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          View and manage your profile information
        </p>
      </div>

      {/* Profile Overview Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              {profile.pictureUrl ? (
                <Image src={profile.pictureUrl} alt="Profile" width={80} height={80} className="w-full h-full object-cover rounded-full" />
              ) : (
              <span className="text-2xl font-bold text-white">
                {profile.name.charAt(0).toUpperCase()}
              </span>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {profile.name}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Car Washer • {profile.assignedAdminName}
              </p>
              <div className="flex items-center space-x-2 mt-2">
                {getAvailabilityBadge(profile.isAvailable)}
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Member since {new Date(profile.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              ₦{profile.totalEarnings}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Earnings</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {profile.completedCheckIns}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Jobs Completed</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              ⭐ {profile.averageRating}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Average Rating</div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/30 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {profile.totalCheckIns}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Check-ins</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'performance', label: 'Performance' },
            { id: 'earnings', label: 'Earnings' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'overview' | 'performance' | 'earnings')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Personal Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name
                </label>
                <p className="text-gray-900 dark:text-white">{profile.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <p className="text-gray-900 dark:text-white">{profile.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone
                </label>
                <p className="text-gray-900 dark:text-white">{profile.phone}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Address
                </label>
                <p className="text-gray-900 dark:text-white">{profile.address}</p>
              </div>
            </div>
          </div>

          {/* Work Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Work Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Assigned Admin
                </label>
                <p className="text-gray-900 dark:text-white">{profile.assignedAdminName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Assigned Location
                </label>
                <p className="text-gray-900 dark:text-white">{profile.assignedLocation}</p>
              </div>
                              <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Total Check-ins
                  </label>
                  <p className="text-gray-900 dark:text-white">{profile.totalCheckIns}</p>
                </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <div className="mt-1">
                  {getAvailabilityBadge(profile.isAvailable)}
                </div>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Emergency Contact
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Contact Name
                </label>
                <p className="text-gray-900 dark:text-white">{profile.emergencyContact}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Contact Phone
                </label>
                <p className="text-gray-900 dark:text-white">{profile.emergencyPhone}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="space-y-6">
          {/* Performance Metrics */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Performance Metrics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  {profile.totalCheckIns}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Check-ins</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                  {profile.completedCheckIns}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Completed Jobs</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                  {profile.totalCheckIns > 0 ? Math.round((profile.completedCheckIns / profile.totalCheckIns) * 100) : 0}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Completion Rate</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'earnings' && (
        <div className="space-y-6">
          {/* Earnings Overview */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Earnings Overview
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
                  ₦{profile.totalEarnings}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Earnings</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  {profile.completedCheckIns}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Jobs Completed</div>
              </div>
            </div>
          </div>

          {/* Weekly Earnings */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {useCustomRange ? 'Custom Period Earnings' : `Last ${selectedWeeks} Week${selectedWeeks > 1 ? 's' : ''} Earnings`}
              </h3>
              <button
                onClick={fetchWeeklyEarnings}
                className="text-sm px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-800/50"
                disabled={weeklyLoading}
              >
                {weeklyLoading ? 'Refreshing...' : '🔄 Refresh'}
              </button>
            </div>

            {/* Time Period Controls */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex flex-wrap items-center gap-4">
                {/* Preset Periods */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Period:</span>
                  <select
                    value={useCustomRange ? 'custom' : selectedWeeks.toString()}
                                         onChange={(e) => {
                       if (e.target.value === 'custom') {
                         setUseCustomRange(true);
                         initializeCustomDateRange();
                       } else {
                         setUseCustomRange(false);
                         setSelectedWeeks(parseInt(e.target.value));
                       }
                     }}
                    className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="1">Last Week</option>
                    <option value="2">Last 2 Weeks</option>
                    <option value="4">Last 4 Weeks</option>
                    <option value="8">Last 8 Weeks</option>
                    <option value="12">Last 12 Weeks</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>

                {/* Custom Date Range */}
                {useCustomRange && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">From:</span>
                    <input
                      type="date"
                      value={customDateRange?.startDate || ''}
                      onChange={(e) => setCustomDateRange(prev => ({ 
                        startDate: e.target.value, 
                        endDate: prev?.endDate || e.target.value 
                      }))}
                      className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">To:</span>
                    <input
                      type="date"
                      value={customDateRange?.endDate || ''}
                      onChange={(e) => setCustomDateRange(prev => ({ 
                        startDate: prev?.startDate || e.target.value, 
                        endDate: e.target.value 
                      }))}
                      className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                )}

                {/* Apply Button for Custom Range */}
                {useCustomRange && (
                  <button
                    onClick={fetchWeeklyEarnings}
                    disabled={!customDateRange?.startDate || !customDateRange?.endDate || weeklyLoading}
                    className="text-sm px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded hover:bg-green-200 dark:hover:bg-green-800/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Apply
                  </button>
                )}
              </div>
            </div>
            
            {weeklyLoading && weeklyEarnings.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : weeklyEarnings.length > 0 ? (
              <div className="space-y-4">
                {/* Weekly Summary Cards */}
                {weeklySummary && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-green-600 dark:text-green-400">
                        ₦{weeklySummary.averageWeeklyEarnings.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {useCustomRange ? 'Avg Per Week' : 'Avg Weekly'}
                      </div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {weeklySummary.totalCompletedJobs}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Total Jobs</div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                        ₦{weeklySummary.totalEarnings.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {useCustomRange ? `${weeklySummary.weeks}-Week Total` : `${weeklySummary.weeks}-Week Total`}
                      </div>
                    </div>
                  </div>
                )}

                {/* Weekly Earnings Chart */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Weekly Earnings Trend</h4>
                  <div className="flex items-end justify-between h-32 space-x-2">
                    {weeklyEarnings.map((week) => {
                      const maxEarnings = Math.max(...weeklyEarnings.map(w => w.earnings));
                      const height = maxEarnings > 0 ? (week.earnings / maxEarnings) * 100 : 0;
                      return (
                        <div key={week.week} className="flex-1 flex flex-col items-center">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            ₦{week.earnings.toFixed(0)}
                          </div>
                          <div 
                            className="w-full bg-gradient-to-t from-blue-500 to-blue-400 dark:from-blue-600 dark:to-blue-500 rounded-t"
                            style={{ height: `${height}%` }}
                          ></div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            W{week.week}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Weekly Breakdown */}
                <div className="space-y-3">
                  {weeklyEarnings.map((week) => (
                    <div key={week.week} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {week.weekLabel} ({week.weekStart} - {week.weekEnd})
                        </h4>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          week.completionRate >= 80 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                          week.completionRate >= 60 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {week.completionRate}% Complete
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-gray-600 dark:text-gray-400">Jobs</div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {week.completedJobs}/{week.totalJobs}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-600 dark:text-gray-400">Earnings</div>
                          <div className="font-medium text-green-600 dark:text-green-400">
                            ₦{week.earnings.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-600 dark:text-gray-400">Avg/Job</div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            ₦{week.totalJobs > 0 ? (week.earnings / week.totalJobs).toFixed(2) : '0.00'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : !weeklyLoading ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <div className="mb-2">📊</div>
                <div>No weekly earnings data available</div>
                <div className="text-sm mt-1">Complete some jobs to see your weekly earnings breakdown</div>
              </div>
            ) : null}
          </div>

          {/* Earnings Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Overall Earnings Breakdown
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Average per job</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  ₦{profile.completedCheckIns > 0 ? (profile.totalEarnings / profile.completedCheckIns).toFixed(2) : '0.00'}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Completion rate</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {profile.totalCheckIns > 0 ? Math.round((profile.completedCheckIns / profile.totalCheckIns) * 100) : 0}%
                </span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-gray-600 dark:text-gray-400">Member since</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {new Date(profile.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

     
    </div>
  );
};

export default WorkerProfilePage;
