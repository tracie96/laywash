"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Button from '@/components/ui/button/Button';
import { useAuth } from '@/context/AuthContext';

interface PaymentReport {
  date: string;
  totalPayments: number;
  totalRevenue: number;
  carWashRevenue: number;
  stockSalesRevenue: number;
  cashPayments: number;
  cardPayments: number;
  mobilePayments: number;
  pendingPayments: number;
  pendingAmount: number;
  carWashCount: number;
  stockSalesCount: number;
}

const PaymentReportsPage: React.FC = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<PaymentReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [viewMode, setViewMode] = useState<'all' | 'car-wash-only' | 'stock-sales-only'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Check if user is admin (restricted to current month only)
  const isAdmin = user?.role === 'admin';

  // Period options
  const periodOptions = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'quarter', label: 'This Quarter' },
    { value: 'custom', label: 'Custom Date Range' }
  ];

  // Filter options for admin users
  const availableOptions = isAdmin 
    ? periodOptions.filter(option => option.value === 'month')
    : periodOptions;

  // Set default custom dates when custom period is selected
  const handlePeriodChange = (newPeriod: string) => {
    // Admin users can only select current month
    if (isAdmin && newPeriod !== 'month') {
      setSelectedPeriod('month');
      return;
    }
    
    setSelectedPeriod(newPeriod);
    if (newPeriod === 'custom') {
      const today = new Date();
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
      setCustomStartDate(lastMonth.toISOString().split('T')[0]);
      setCustomEndDate(today.toISOString().split('T')[0]);
    }
  };

  // Set admin users to current month on component mount
  useEffect(() => {
    if (isAdmin) {
      setSelectedPeriod('month');
    }
  }, [isAdmin]);

  // Fetch payment reports from API
  const fetchReports = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Validate custom date range
      if (selectedPeriod === 'custom') {
        if (!customStartDate || !customEndDate) {
          setError('Please select both start and end dates for custom date range');
          setIsLoading(false);
          return;
        }
        if (new Date(customStartDate) > new Date(customEndDate)) {
          setError('Start date cannot be after end date');
          setIsLoading(false);
          return;
        }
      }
      
      const params = new URLSearchParams();
      params.append('reportType', 'daily');
      params.append('period', selectedPeriod);
      params.append('viewMode', viewMode);
      
      // Add custom date range if period is custom
      if (selectedPeriod === 'custom') {
        params.append('startDate', customStartDate);
        params.append('endDate', customEndDate);
      }
      
      const response = await fetch(`/api/admin/payment-reports?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setReports(data.reports || []);
      } else {
        setError(data.error || 'Failed to fetch reports');
      }
    } catch (error) {
      console.error('Error fetching payment reports:', error);
      setError('Failed to fetch reports');
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriod, viewMode, customStartDate, customEndDate]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const calculateTotals = () => {
    return reports.reduce((totals, report) => ({
      totalPayments: totals.totalPayments + report.totalPayments,
      totalRevenue: totals.totalRevenue + report.totalRevenue,
      carWashRevenue: totals.carWashRevenue + report.carWashRevenue,
      stockSalesRevenue: totals.stockSalesRevenue + report.stockSalesRevenue,
      cashPayments: totals.cashPayments + report.cashPayments,
      cardPayments: totals.cardPayments + report.cardPayments,
      mobilePayments: totals.mobilePayments + report.mobilePayments,
      pendingPayments: totals.pendingPayments + report.pendingPayments,
      pendingAmount: totals.pendingAmount + report.pendingAmount,
      carWashCount: totals.carWashCount + report.carWashCount,
      stockSalesCount: totals.stockSalesCount + report.stockSalesCount
    }), {
      totalPayments: 0,
      totalRevenue: 0,
      carWashRevenue: 0,
      stockSalesRevenue: 0,
      cashPayments: 0,
      cardPayments: 0,
      mobilePayments: 0,
      pendingPayments: 0,
      pendingAmount: 0,
      carWashCount: 0,
      stockSalesCount: 0
    });
  };

  const totals = calculateTotals();

  // const getAverageRevenue = () => {
  //   return reports.length > 0 ? totals.totalRevenue / reports.length : 0;
  // };

  const getDateRangeDisplay = () => {
    if (selectedPeriod === 'custom' && customStartDate && customEndDate) {
      const start = new Date(customStartDate).toLocaleDateString();
      const end = new Date(customEndDate).toLocaleDateString();
      return `${start} - ${end}`;
    }
    return selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1);
  };

  const exportToCSV = () => {
    if (reports.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = viewMode === 'car-wash-only' 
      ? [
          'Date', 
          'Total Payments', 
          'Total Revenue', 
          'Car Wash Revenue',
          'Cash Payments', 
          'Card Payments', 
          'Mobile Payments',
          'Pending Payments', 
          'Pending Amount',
          'Car Wash Count'
        ]
      : viewMode === 'stock-sales-only'
      ? [
          'Date', 
          'Total Payments', 
          'Total Revenue', 
          'Stock Sales Revenue',
          'Cash Payments', 
          'Card Payments', 
          'Mobile Payments',
          'Pending Payments', 
          'Pending Amount',
          'Stock Sales Count'
        ]
      : [
          'Date', 
          'Total Payments', 
          'Total Revenue', 
          'Car Wash Revenue', 
          'Stock Sales Revenue',
          'Cash Payments', 
          'Card Payments', 
          'Mobile Payments',
          'Pending Payments', 
          'Pending Amount',
          'Car Wash Count',
          'Stock Sales Count'
        ];
    
    const csvContent = [
      headers.join(','),
      ...reports.map(report => {
        if (viewMode === 'car-wash-only') {
          return [
            report.date,
            report.carWashCount,
            report.carWashRevenue.toFixed(2),
            report.carWashRevenue.toFixed(2),
            report.cashPayments,
            report.cardPayments,
            report.mobilePayments,
            report.pendingPayments,
            report.pendingAmount.toFixed(2),
            report.carWashCount
          ].join(',');
        } else if (viewMode === 'stock-sales-only') {
          return [
            report.date,
            report.stockSalesCount,
            report.stockSalesRevenue.toFixed(2),
            report.stockSalesRevenue.toFixed(2),
            report.cashPayments,
            report.cardPayments,
            report.mobilePayments,
            report.pendingPayments,
            report.pendingAmount.toFixed(2),
            report.stockSalesCount
          ].join(',');
        } else {
          return [
            report.date,
            report.totalPayments,
            report.totalRevenue.toFixed(2),
            report.carWashRevenue.toFixed(2),
            report.stockSalesRevenue.toFixed(2),
            report.cashPayments,
            report.cardPayments,
            report.mobilePayments,
            report.pendingPayments,
            report.pendingAmount.toFixed(2),
            report.carWashCount,
            report.stockSalesCount
          ].join(',');
        }
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const viewModeSuffix = viewMode === 'car-wash-only' ? '-car-wash' : viewMode === 'stock-sales-only' ? '-stock-sales' : '';
    link.setAttribute('download', `payment-reports-daily-${selectedPeriod}${viewModeSuffix}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading reports...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 text-red-500">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Error loading reports
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <Button onClick={fetchReports} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Payment Reports
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Comprehensive view of car wash and stock sales revenue with filtering options
          </p>
          {selectedPeriod === 'custom' && customStartDate && customEndDate && (
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
              📅 Custom Date Range: {new Date(customStartDate).toLocaleDateString()} - {new Date(customEndDate).toLocaleDateString()}
            </p>
          )}
        </div>
        <Button
          onClick={exportToCSV}
          className="bg-green-600 hover:bg-green-700"
        >
          Export Report
        </Button>
      </div>

      {/* Report Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Report Type */}
          
          {/* Period Selector - Radio Buttons for Mobile */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Period:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {availableOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors touch-manipulation ${
                    selectedPeriod === option.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="period"
                    value={option.value}
                    checked={selectedPeriod === option.value}
                    onChange={(e) => handlePeriodChange(e.target.value)}
                    className="sr-only"
                    disabled={isAdmin}
                  />
                  <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                    selectedPeriod === option.value
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {selectedPeriod === option.value && (
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    )}
                  </div>
                  <span className="text-sm font-medium">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
          
          {/* Admin restriction notice */}
          {isAdmin && (
            <div className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
              <span className="font-medium">Admin Access:</span> Limited to current month data only
            </div>
          )}

          {/* View Mode Selector */}
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">View Mode:</label>
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="radio"
                  name="viewMode"
                  value="all"
                  checked={viewMode === 'all'}
                  onChange={(e) => setViewMode(e.target.value as 'all' | 'car-wash-only' | 'stock-sales-only')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span>All Sales</span>
              </label>
              <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="radio"
                  name="viewMode"
                  value="car-wash-only"
                  checked={viewMode === 'car-wash-only'}
                  onChange={(e) => setViewMode(e.target.value as 'all' | 'car-wash-only' | 'stock-sales-only')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span>Car Wash Only</span>
              </label>
              <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="radio"
                  name="viewMode"
                  value="stock-sales-only"
                  checked={viewMode === 'stock-sales-only'}
                  onChange={(e) => setViewMode(e.target.value as 'all' | 'car-wash-only' | 'stock-sales-only')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span>Stock Sales Only</span>
              </label>
            </div>
          </div>

          {/* Custom Date Range Inputs - Hidden for admin users */}
          {selectedPeriod === 'custom' && !isAdmin && (
            <div className="flex space-x-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              <span className="text-gray-600 dark:text-gray-400">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          )}

          {/* Refresh Button */}
          <Button
            onClick={fetchReports}
            variant="outline"
            className="px-4 py-2"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Revenue
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ₦ {totals.totalRevenue.toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Transactions
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {totals.totalPayments}
              </p>
            </div>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>

        {/* <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Average Revenue
              </p>
              <p className="text-2xl font-bold text-orange-600">
                ₦ {getAverageRevenue().toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div> */}
      </div>

      {/* Car Wash Sales Section */}
      {(viewMode === 'all' || viewMode === 'car-wash-only') && (
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-3">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Car Wash Sales</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Car Wash Revenue
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  ₦ {totals.carWashRevenue.toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Car Wash Transactions
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {totals.carWashCount}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>

        </div>
      </div>
      )}

      {/* Product Sales Section */}
      {(viewMode === 'all' || viewMode === 'stock-sales-only') && (
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg mr-3">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Product Sales</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Product Sales Revenue
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  ₦ {totals.stockSalesRevenue.toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Product Transactions
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {totals.stockSalesCount}
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>

        
        </div>
      </div>
      )}

      {/* Revenue Breakdown */}
      {viewMode === 'all' && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Revenue Breakdown</h3>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Car Wash</span>
              <span className="text-sm font-medium text-blue-600">₦ {totals.carWashRevenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Stock Sales</span>
              <span className="text-sm font-medium text-purple-600">₦ {totals.stockSalesRevenue.toFixed(2)}</span>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-600 pt-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-900 dark:text-white">Total</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">₦ {totals.totalRevenue.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Transaction Counts</h3>
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Car Wash</span>
              <span className="text-sm font-medium text-blue-600">{totals.carWashCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Stock Sales</span>
              <span className="text-sm font-medium text-purple-600">{totals.stockSalesCount}</span>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-600 pt-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-900 dark:text-white">Total</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{totals.totalPayments}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Payment Method Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Cash Payments</h3>
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{totals.cashPayments}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Total cash transactions</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">POS Payments</h3>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{totals.cardPayments}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Total card transactions</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Mobile Payments</h3>
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{totals.mobilePayments}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Total mobile transactions</p>
        </div>
      </div>

      {/* Detailed Reports Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Daily Payment Reports - {getDateRangeDisplay()}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Car Wash
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Stock Sales
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Transactions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Payment Methods
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No payment data found
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      No payment transactions were found for the selected period.
                    </p>
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.date} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {new Date(report.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      ₦ {report.totalRevenue.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                      ₦ {report.carWashRevenue.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600">
                      ₦ {report.stockSalesRevenue.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <div className="text-center">
                        <div className="font-medium">{report.totalPayments}</div>
                        <div className="text-xs text-gray-500">
                          CW: {report.carWashCount} | SS: {report.stockSalesCount}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <div className="text-center">
                        <div className="text-xs space-x-2">
                          <span className="inline-block px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded text-xs">
                            Cash: {report.cashPayments}
                          </span>
                          <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded text-xs">
                            POS: {report.cardPayments}
                          </span>
                          <span className="inline-block px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 rounded text-xs">
                            Mobile: {report.mobilePayments}
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PaymentReportsPage; 