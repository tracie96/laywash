"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Badge from '@/components/ui/badge/Badge';
import Button from '@/components/ui/button/Button';
import { Modal } from '@/components/ui/modal';
import PasscodeModal from '@/components/admin/PasscodeModal';
import { useAuth } from '@/context/AuthContext';

interface CheckIn {
  id: string;
  customerName: string;
  customerPhone: string;
  licensePlate: string;
  vehicleType: string;
  vehicleColor: string;
  vehicleModel?: string;
  washType?: string;
  services: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'paid' | 'cancelled';
  checkInTime: Date;
  completedTime?: Date;
  paidTime?: Date;
  assignedWasher?: string;
  assignedWasherId?: string;
  assignedAdmin?: string;
  estimatedDuration: number;
  actualDuration?: number;
  totalPrice: number;
  specialInstructions?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  customerId?: string;
  createdAt?: string;
  reason?: string;
  updatedAt?: string;
  passcode?: string;
  userCode?: string;
  washerCompletionStatus?: boolean;
}

interface Washer {
  id: string;
  name: string;
  email: string;
  status: string;
  isAvailable: boolean;
  hourlyRate: number;
  totalEarnings: number;
}

const CheckInHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [washers, setWashers] = useState<Washer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'paid' | 'cancelled'>('all');
  const [isUpdatingPayment, setIsUpdatingPayment] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null); // Track which check-in is being updated
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCheckInId, setSelectedCheckInId] = useState<string>('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'card' | 'pos'>('cash');
  
  // Date search state
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Details modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCheckIn, setSelectedCheckIn] = useState<CheckIn | null>(null);

  // Earnings state
  const [totalEarnings, setTotalEarnings] = useState<number>(0);
  const [isLoadingEarnings, setIsLoadingEarnings] = useState(true);

  // Active check-ins functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcodeError, setPasscodeError] = useState<string>('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [sendingSMS, setSendingSMS] = useState<string | null>(null);

  // Helper function to get current date in YYYY-MM-DD format
  const getCurrentDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Fetch earnings data from API
  const fetchEarnings = useCallback(async () => {
    try {
      setIsLoadingEarnings(true);
      
      // Build query parameters for date filtering
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await fetch(`/api/admin/earnings?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch earnings');
      }

      if (data.success && data.data) {
        setTotalEarnings(data.data.totalEarnings);
      }
    } catch (error) {
      console.error('Error fetching earnings:', error);
    } finally {
      setIsLoadingEarnings(false);
    }
  }, [startDate, endDate]);

  // Fetch washers from API
  const fetchWashers = async () => {
    try {
      const response = await fetch('/api/admin/washers');
      const result = await response.json();
      
      if (result.success) {
        const allWashers = result.washers || [];
        // Filter to only show active and available washers for assignment
        const availableWashers = allWashers.filter((washer: { isActive: boolean; isAvailable: boolean }) => 
          washer.isActive && washer.isAvailable
        );
        setWashers(availableWashers);
      }
    } catch (err) {
      console.error('Error fetching washers:', err);
    }
  };

  // Fetch all check-ins from API
  const fetchCheckIns = async (search = '') => {
    try {
      const searchParams = new URLSearchParams({
        status: 'all',
        limit: '100',
        sortBy: 'check_in_time',
        sortOrder: 'desc'
      });
      
      if (search.trim()) {
        searchParams.append('search', search.trim());
      }
      
      const response = await fetch(`/api/admin/check-ins?${searchParams.toString()}`);
      const result = await response.json();
      
      if (result.success) {
        const transformedCheckIns: CheckIn[] = result.checkIns.map((checkIn: CheckIn) => ({
          id: checkIn.id,
          customerName: checkIn.customerName,
          customerPhone: checkIn.customerPhone,
          licensePlate: checkIn.licensePlate,
          vehicleType: checkIn.vehicleType,
          vehicleColor: checkIn.vehicleColor,
          vehicleModel: checkIn.vehicleModel,
          washType: checkIn.washType,
          services: checkIn.services || [],
          status: checkIn.status,
          checkInTime: new Date(checkIn.checkInTime),
          completedTime: checkIn.completedTime ? new Date(checkIn.completedTime) : undefined,
          paidTime: checkIn.paidTime ? new Date(checkIn.paidTime) : undefined,
          assignedWasher: checkIn.assignedWasher,
          assignedWasherId: checkIn.assignedWasherId,
          assignedAdmin: checkIn.assignedAdmin,
          estimatedDuration: checkIn.estimatedDuration || 0,
          actualDuration: checkIn.actualDuration,
          totalPrice: checkIn.totalPrice || 0,
          specialInstructions: checkIn.specialInstructions,
          paymentStatus: checkIn.paymentStatus,
          paymentMethod: checkIn.paymentMethod,
          reason: checkIn.reason,
          customerId: checkIn.customerId,
          createdAt: checkIn.createdAt,
          updatedAt: checkIn.updatedAt,
          passcode: checkIn.passcode,
          userCode: checkIn.userCode,
          washerCompletionStatus: checkIn.washerCompletionStatus
        })).filter((checkIn: CheckIn) => {
          // Filter out check-ins with invalid dates and cancelled check-ins
          return !isNaN(checkIn.checkInTime.getTime()) && checkIn.status !== 'cancelled';
        });
        
        setCheckIns(transformedCheckIns);
      } else {
        throw new Error(result.error || 'Failed to fetch check-ins');
      }
    } catch (err) {
      console.error('Error fetching check-ins:', err);
    }
  };

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      try {
        await Promise.all([
          fetchCheckIns(),
          fetchWashers(),
          fetchEarnings()
        ]);
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [fetchEarnings]);

  // Refetch earnings when date filters change
  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings]);

  const filteredCheckIns = checkIns.filter(checkIn => {
    // First filter by status
    let statusMatch = false;
    if (filter === 'all') {
      statusMatch = true; // Show all statuses
    } else {
      statusMatch = checkIn.status === filter;
    }
    
    if (!statusMatch) return false;
    
    
    // Then filter by search query if provided
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const matchesName = checkIn.customerName.toLowerCase().includes(query);
      const matchesPhone = checkIn.customerPhone.toLowerCase().includes(query);
      const matchesPlate = checkIn.licensePlate.toLowerCase().includes(query);
      const matchesWasher = checkIn.assignedWasher?.toLowerCase().includes(query) || false;
      if (!matchesName && !matchesPhone && !matchesPlate && !matchesWasher) return false;
    }
    
    // Then filter by date range if dates are selected
    if (startDate || endDate) {
      const checkInDate = new Date(checkIn.checkInTime);
      const start = startDate ? new Date(startDate + 'T00:00:00') : null;
      const end = endDate ? new Date(endDate + 'T23:59:59') : null;
      
      if (start && checkInDate < start) return false;
      if (end && checkInDate > end) return false;
    }
    
    return true;
  });

  const handleMarkAsPaid = (checkInId: string) => {
    setSelectedCheckInId(checkInId);
    setShowPaymentModal(true);
  };

  const handleMarkInProgress = async (checkInId: string) => {
    try {
      setUpdatingStatus(checkInId);
      
      console.log('Updating check-in status to in_progress:', checkInId);
      
      const response = await fetch(`/api/admin/check-ins/${checkInId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'in_progress',
          userId: user?.id // Include user ID for role verification
        }),
      });

      const result = await response.json();
      console.log('Update response:', result);

      if (response.ok && result.success) {
        setCheckIns(prev => prev.map(checkIn => 
          checkIn.id === checkInId 
            ? { ...checkIn, status: 'in_progress' as const }
            : checkIn
        ));
        
        // Show success message
        alert('Status updated successfully! Work started.');
        
        // Refresh the list to get any additional updates
        await fetchCheckIns();
      } else {
        throw new Error(result.error || 'Failed to update status');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update status';
      alert(`Failed to update status: ${errorMessage}`);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handlePaymentConfirm = async () => {
    try {
      setIsUpdatingPayment(selectedCheckInId);
      
      const response = await fetch(`/api/admin/check-ins/${selectedCheckInId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentStatus: 'paid',
          paymentMethod: selectedPaymentMethod
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Update the local state to reflect the payment status change
        setCheckIns(prev => prev.map(checkIn => 
          checkIn.id === selectedCheckInId 
            ? { ...checkIn, paymentStatus: 'paid', paymentMethod: selectedPaymentMethod }
            : checkIn
        ));
        
        // Refetch earnings to update the total
        fetchEarnings();
        
        // Notify other pages that washer earnings have been updated
        localStorage.setItem('washer_earnings_updated', Date.now().toString());
        
        // Show success message
        alert('Payment status updated successfully!');
        
        // Close modal and reset
        setShowPaymentModal(false);
        setSelectedCheckInId('');
        setSelectedPaymentMethod('cash');
      } else {
        throw new Error(result.error || 'Failed to update payment status');
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
      alert(`Failed to update payment status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUpdatingPayment(null);
    }
  };


  const handlePaymentModalClose = () => {
    setShowPaymentModal(false);
    setSelectedCheckInId('');
    setSelectedPaymentMethod('cash');
  };

  const handleViewDetails = (checkIn: CheckIn) => {
    setSelectedCheckIn(checkIn);
    setShowDetailsModal(true);
  };

  const handleDetailsModalClose = () => {
    setShowDetailsModal(false);
    setSelectedCheckIn(null);
  };

  // Active check-ins functionality
  const performSearch = useCallback(async (query: string) => {
    setSearchLoading(true);
    try {
      await fetchCheckIns(query);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const clearSearch = () => {
    setSearchQuery('');
    performSearch('');
  };

  const handleStatusChange = async (checkInId: string, newStatus: string, passcode?: string, reason?: string) => {
    try {
      const requestBody: { status: string; passcode?: string; reason?: string } = { status: newStatus };
      
      if (newStatus === 'completed' && passcode) {
        requestBody.passcode = passcode;
      }

      if (newStatus === 'cancelled' && reason) {
        requestBody.reason = reason;
      }

      const response = await fetch(`/api/admin/check-ins/${checkInId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();
      
      if (result.success) {
        // Update local state with the response data
        setCheckIns(prev => prev.map(checkIn => 
          checkIn.id === checkInId 
            ? { ...checkIn, ...result.checkIn }
            : checkIn
        ));
        
        // Close modal and clear error on success
        if (newStatus === 'completed') {
          setShowPasscodeModal(false);
          setPasscodeError('');
          setSelectedCheckInId('');
        }
        
        if (newStatus === 'cancelled') {
          setShowCancelModal(false);
          setCancelReason('');
          setSelectedCheckInId('');
        }
      } else {
        throw new Error(result.error || 'Failed to update status');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      if (newStatus === 'completed') {
        setPasscodeError(err instanceof Error ? err.message : 'Failed to update status');
      } else {
        alert(err instanceof Error ? err.message : 'Failed to update status');
      }
    }
  };

  const handleOpenPasscodeModal = (checkInId: string) => {
    const checkIn = checkIns.find(c => c.id === checkInId);
    
    if (checkIn?.washType === 'instant') {
      handleStatusChange(checkInId, 'completed');
      return;
    }
    
    if (!checkIn?.passcode) {
      handleStatusChange(checkInId, 'completed');
      return;
    }
    
    setSelectedCheckInId(checkInId);
    setShowPasscodeModal(true);
    setPasscodeError('');
  };

  const handlePasscodeConfirm = (passcode: string) => {
    handleStatusChange(selectedCheckInId, 'completed', passcode);
  };

  const handlePasscodeModalClose = () => {
    setShowPasscodeModal(false);
    setSelectedCheckInId('');
    setPasscodeError('');
  };

  const handleOpenCancelModal = (checkInId: string) => {
    setSelectedCheckInId(checkInId);
    setShowCancelModal(true);
    setCancelReason('');
  };

  const handleCancelModalClose = () => {
    setShowCancelModal(false);
    setSelectedCheckInId('');
    setCancelReason('');
  };

  const handleCancelConfirm = () => {
    if (cancelReason.trim()) {
      handleStatusChange(selectedCheckInId, 'cancelled', undefined, cancelReason);
    } else {
      alert('Please provide a reason for cancellation');
    }
  };

  const handleAssignWasher = async (checkInId: string, washerId: string) => {
    try {
      const response = await fetch(`/api/admin/check-ins/${checkInId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assignedWasherId: washerId,
          status: 'in_progress'
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setCheckIns(prev => prev.map(checkIn => 
          checkIn.id === checkInId 
            ? { ...checkIn, ...result.checkIn }
            : checkIn
        ));
      } else {
        throw new Error(result.error || 'Failed to assign washer');
      }
    } catch (err) {
      console.error('Error assigning washer:', err);
      alert(err instanceof Error ? err.message : 'Failed to assign washer');
    }
  };

  const handleSendSMS = async (checkInId: string, customerPhone: string) => {
    try {
      setSendingSMS(checkInId);
      
      const response = await fetch(`/api/admin/check-ins/${checkInId}/send-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-ID': user?.id || '',
        },
        body: JSON.stringify({
          phoneNumber: customerPhone
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        alert('SMS sent successfully!');
      } else {
        throw new Error(result.error || 'Failed to send SMS');
      }
    } catch (err) {
      console.error('Error sending SMS:', err);
      alert(err instanceof Error ? err.message : 'Failed to send SMS');
    } finally {
      setSendingSMS(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge color="warning">Pending</Badge>;
      case 'in_progress':
        return <Badge color="info">In Progress</Badge>;
      case 'completed':
        return <Badge color="success">Completed</Badge>;
      case 'paid':
        return <Badge color="success">Paid</Badge>;
      case 'cancelled':
        return <Badge color="error">Cancelled</Badge>;
      default:
        return <Badge color="primary">{status}</Badge>;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'border-orange-200 bg-orange-50 dark:bg-orange-900/30 dark:border-orange-800';
      case 'in_progress':
        return 'border-blue-200 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-800';
      case 'completed':
        return 'border-green-200 bg-green-50 dark:bg-green-900/30 dark:border-green-800';
      case 'paid':
        return 'border-blue-200 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-800';
      case 'cancelled':
        return 'border-red-200 bg-red-50 dark:bg-red-900/30 dark:border-red-800';
      default:
        return 'border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700';
    }
  };


  const calculateAverageDuration = () => {
    const completedCheckIns = filteredCheckIns.filter(checkIn => 
      checkIn.status === 'completed' || checkIn.status === 'paid'
    );
    if (completedCheckIns.length === 0) return 0;
    
    const totalDuration = completedCheckIns.reduce((total, checkIn) => 
      total + (checkIn.actualDuration || checkIn.estimatedDuration), 0
    );
    return Math.round(totalDuration / completedCheckIns.length);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading history...</p>
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
            Check-ins Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage all check-ins including active, completed, and cancelled car wash services
          </p>
        </div>
        <Button
          onClick={() => window.location.href = '/checkins/new'}
          className="bg-blue-600 hover:bg-blue-700"
        >
          New Check-in
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Earnings
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {isLoadingEarnings ? (
                  <span className="animate-pulse">Loading...</span>
                ) : (
                  `NGN ${totalEarnings.toLocaleString()}`
                )}
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
                Completed Services
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {filteredCheckIns.filter(c => c.status === 'completed' || c.status === 'paid').length}
              </p>
              {(startDate || endDate) && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  of {checkIns.filter(c => c.status === 'completed' || c.status === 'paid').length} total
                </p>
              )}
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Avg. Duration
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {calculateAverageDuration()} min
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Name Search */}
  
      {/* Date Search */}
      <div className="mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Search by Date Range
          </h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date
              </label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date
              </label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-end space-x-2">
              <Button
                onClick={() => {
                  const today = getCurrentDate();
                  setStartDate(today);
                  setEndDate(today);
                }}
                variant="outline"
                className="px-4"
              >
                Today
              </Button>
              <Button
                onClick={() => {
                  const today = new Date();
                  const startOfWeek = new Date(today);
                  startOfWeek.setDate(today.getDate() - today.getDay());
                  const endOfWeek = new Date(today);
                  endOfWeek.setDate(today.getDate() + (6 - today.getDay()));
                  
                  setStartDate(startOfWeek.toISOString().split('T')[0]);
                  setEndDate(endOfWeek.toISOString().split('T')[0]);
                }}
                variant="outline"
                className="px-4"
              >
                This Week
              </Button>
              <Button
                onClick={() => {
                  const today = new Date();
                  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                  
                  setStartDate(startOfMonth.toISOString().split('T')[0]);
                  setEndDate(endOfMonth.toISOString().split('T')[0]);
                }}
                variant="outline"
                className="px-4"
              >
                This Month
              </Button>
              <Button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                variant="outline"
                className="px-4"
              >
                Clear
              </Button>
            </div>
          </div>
          {(startDate || endDate) && (
            <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              Showing check-ins from {startDate || 'any date'} to {endDate || 'any date'}
            </div>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Search Check-ins
          </h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by customer name, phone, license plate, or washer..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end space-y-2 sm:space-y-0 sm:space-x-2">
              <Button
                onClick={() => performSearch(searchQuery)}
                disabled={searchLoading}
                className="px-6 py-3 w-full sm:w-auto"
              >
                {searchLoading ? 'Searching...' : 'Search'}
              </Button>
              <Button
                onClick={clearSearch}
                variant="outline"
                className="px-6 py-3 w-full sm:w-auto"
              >
                Clear
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg overflow-x-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              filter === 'all'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            All ({filteredCheckIns.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              filter === 'pending'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Pending ({checkIns.filter(c => c.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('in_progress')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              filter === 'in_progress'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            In Progress ({checkIns.filter(c => c.status === 'in_progress').length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              filter === 'completed'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Completed ({checkIns.filter(c => c.status === 'completed').length})
          </button>
          <button
            onClick={() => setFilter('paid')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              filter === 'paid'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Paid ({checkIns.filter(c => c.status === 'paid').length})
          </button>
          <button
            onClick={() => setFilter('cancelled')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              filter === 'cancelled'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Cancelled ({checkIns.filter(c => c.status === 'cancelled').length})
          </button>
        </div>
      </div>

      {/* Results Summary */}
      {(startDate || endDate) && (
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="text-sm text-blue-800 dark:text-blue-200">
              {(startDate || endDate) && (
                <div>
                  <span className="font-medium">Date Range:</span> {startDate || 'any date'} to {endDate || 'any date'}
                </div>
              )}
            </div>
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <span className="font-medium">Results:</span> {filteredCheckIns.length} check-ins found
            </div>
          </div>
        </div>
      )}

      {/* Check-ins List */}
      <div className="space-y-4">
        {filteredCheckIns.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No history found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {filter === 'all' 
                ? 'No completed, paid, or cancelled check-ins found.'
                : `No ${filter} check-ins found.`
              }
            </p>
          </div>
        ) : (
          filteredCheckIns.map((checkIn) => (
            <div
              key={checkIn.id}
              className={`border rounded-xl p-6 transition-colors ${getStatusColor(checkIn.status)}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {checkIn.customerName}
                    </h3>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(checkIn.status)}
                      {checkIn.paymentStatus && (
                        <Badge
                          color={checkIn.paymentStatus === 'paid' ? 'success' : 'warning'}
                          size="sm"
                        >
                          {checkIn.paymentStatus === 'paid' ? 'Paid' : 'Pending Payment'}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">License Plate</p>
                      <p className="font-medium text-gray-900 dark:text-white">{checkIn.licensePlate}</p>
                    </div>
                    {checkIn.reason && (
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Reason</p>
                        <p className="font-medium text-gray-900 dark:text-white">{checkIn.reason}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Vehicle Color</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {checkIn.vehicleColor}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Vehicle Type</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {checkIn.vehicleType}
                      </p>
                    </div>
                    {checkIn.vehicleModel && (
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Vehicle Model</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {checkIn.vehicleModel}
                        </p>
                      </div>
                    )}
                    {checkIn.washType && (
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Wash Type</p>
                        <p className="font-medium text-gray-900 dark:text-white capitalize">
                          {checkIn.washType}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Check-in Time</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {checkIn.checkInTime.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Total Price</p>
                      <p className="font-medium text-gray-900 dark:text-white">NGN {checkIn.totalPrice}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Services */}
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Services:</p>
                <div className="flex flex-wrap gap-2">
                  {checkIn.services.map((service) => (
                    <span
                      key={service}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded"
                    >
                      {service.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  ))}
                </div>
              </div>

           

              {/* Performance */}
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-4 lg:space-y-0">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Estimated: </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {checkIn.estimatedDuration} min
                    </span>
                  </div>
                  {checkIn.actualDuration && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Actual: </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {checkIn.actualDuration} min
                      </span>
                    </div>
                  )}
                  {checkIn.assignedWasher && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Washer: </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {checkIn.assignedWasher}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewDetails(checkIn)}
                    className="w-full sm:w-auto"
                  >
                    View Details
                  </Button>
             
                  {/* Active check-ins actions */}
                  {checkIn.status === 'pending' && (
                    <>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAssignWasher(checkIn.id, e.target.value);
                            e.target.value = '';
                          }
                        }}
                        className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Assign Washer</option>
                        {washers.map((washer) => (
                          <option key={washer.id} value={washer.id}>
                            {washer.name}
                          </option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        onClick={() => {
                          console.log('Start Work button clicked for check-in:', checkIn.id);
                          handleMarkInProgress(checkIn.id);
                        }}
                        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
                        disabled={updatingStatus === checkIn.id}
                      >
                        {updatingStatus === checkIn.id ? 'Starting...' : 'Start Work'}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleOpenCancelModal(checkIn.id)}
                        variant="outline"
                        className="w-full sm:w-auto text-red-600 border-red-300 hover:bg-red-50"
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                  
                  {checkIn.status === 'in_progress' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleOpenPasscodeModal(checkIn.id)}
                        className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
                      >
                        Mark Complete
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleOpenCancelModal(checkIn.id)}
                        variant="outline"
                        className="w-full sm:w-auto text-red-600 border-red-300 hover:bg-red-50"
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                  
                  {/* Payment actions for completed check-ins */}
                  {checkIn.status === 'completed' && checkIn.paymentStatus === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => handleMarkAsPaid(checkIn.id)}
                      className="w-full sm:w-auto"
                      disabled={isUpdatingPayment === checkIn.id}
                    >
                      {isUpdatingPayment === checkIn.id ? 'Updating...' : 'Mark as Paid'}
                    </Button>
                  )}
                  
                  {checkIn.status === 'completed' && checkIn.paymentStatus === 'paid' && (
                    <span className="px-3 py-2 text-sm font-medium text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-300 rounded-lg">
                      ✓ Paid
                    </span>
                  )}
                  
                  {/* SMS functionality for delayed wash type only */}
                  {(checkIn.status === 'pending' || checkIn.status === 'in_progress') && checkIn.washType === 'delayed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSendSMS(checkIn.id, checkIn.customerPhone)}
                      disabled={sendingSMS === checkIn.id}
                      className="w-full sm:w-auto"
                    >
                      {sendingSMS === checkIn.id ? 'Sending...' : 'Send SMS'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Payment Method Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={handlePaymentModalClose}
        className="max-w-md mx-4"
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Select Payment Method
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            How did the customer pay for this service?
          </p>
          <select
            value={selectedPaymentMethod}
            onChange={(e) => setSelectedPaymentMethod(e.target.value as 'cash' | 'card' | 'pos')}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-6"
          >
            <option value="cash">Cash</option>
            {/* <option value="card">Card</option> */}
            <option value="pos">POS</option>
          </select>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={handlePaymentModalClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePaymentConfirm}
              className="flex-1"
              disabled={isUpdatingPayment === selectedCheckInId}
            >
              {isUpdatingPayment === selectedCheckInId ? 'Updating...' : 'Confirm Payment'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Passcode Modal */}
      <PasscodeModal
        isOpen={showPasscodeModal}
        onClose={handlePasscodeModalClose}
        onConfirm={handlePasscodeConfirm}
        error={passcodeError}
      />

      {/* Cancel Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={handleCancelModalClose}
        className="max-w-md mx-4"
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Cancel Check-in
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Please provide a reason for cancelling this check-in:
          </p>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Enter cancellation reason..."
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent mb-6"
            rows={3}
          />
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={handleCancelModalClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCancelConfirm}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              Confirm Cancellation
            </Button>
          </div>
        </div>
      </Modal>

      {/* Check-in Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={handleDetailsModalClose}
        className="max-w-4xl mx-4"
      >
        {selectedCheckIn && (
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Check-in Details
                </h3>
                
              </div>
              <div className="flex items-center space-x-2">
                {getStatusBadge(selectedCheckIn.status)}
                {selectedCheckIn.paymentStatus && (
                  <Badge
                    color={selectedCheckIn.paymentStatus === 'paid' ? 'success' : 'warning'}
                    size="sm"
                  >
                    {selectedCheckIn.paymentStatus === 'paid' ? 'Paid' : 'Pending Payment'}
                  </Badge>
                )}
              </div>
            </div>

            {/* Customer Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Customer Information
                </h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedCheckIn.customerName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Phone</p>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedCheckIn.customerPhone}</p>
                  </div>
                  {selectedCheckIn.customerId && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Customer ID</p>
                      <p className="font-medium text-gray-900 dark:text-white">{selectedCheckIn.customerId}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Vehicle Information
                </h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">License Plate</p>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedCheckIn.licensePlate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Vehicle Color</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedCheckIn.vehicleColor}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Vehicle Type</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedCheckIn.vehicleType}
                    </p>
                  </div>
                  {selectedCheckIn.vehicleModel && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Model</p>
                      <p className="font-medium text-gray-900 dark:text-white">{selectedCheckIn.vehicleModel}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Services and Timing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Services & Pricing
                </h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Services</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedCheckIn.services.map((service) => (
                        <span
                          key={service}
                          className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded"
                        >
                          {service.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Price</p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">NGN {selectedCheckIn.totalPrice}</p>
                  </div>
                  {selectedCheckIn.specialInstructions && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Special Instructions</p>
                      <p className="font-medium text-gray-900 dark:text-white">{selectedCheckIn.specialInstructions}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Timing & Performance
                </h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Check-in Time</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedCheckIn.checkInTime.toLocaleString()}
                    </p>
                  </div>
                  {selectedCheckIn.completedTime && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Completed Time</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {selectedCheckIn.completedTime.toLocaleString()}
                      </p>
                    </div>
                  )}
                                     {selectedCheckIn.paidTime && (
                     <div>
                       <p className="text-sm text-gray-600 dark:text-gray-400">Paid Time</p>
                       <p className="font-medium text-gray-900 dark:text-white">
                         {selectedCheckIn.paidTime.toLocaleString()}
                       </p>
                     </div>
                   )}
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Duration</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Estimated: {selectedCheckIn.estimatedDuration} min
                      {selectedCheckIn.actualDuration && (
                        <span className="ml-2 text-gray-600 dark:text-gray-400">
                          | Actual: {selectedCheckIn.actualDuration} min
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Staff and Payment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Staff Assignment
                </h4>
                <div className="space-y-3">
                  {selectedCheckIn.assignedWasher && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Assigned Washer</p>
                      <p className="font-medium text-gray-900 dark:text-white">{selectedCheckIn.assignedWasher}</p>
                    </div>
                  )}
                  {selectedCheckIn.assignedAdmin && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Assigned Admin</p>
                      <p className="font-medium text-gray-900 dark:text-white">{selectedCheckIn.assignedAdmin}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Payment Details
                </h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Payment Status</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedCheckIn.paymentStatus || 'Not specified'}
                    </p>
                  </div>
                  {selectedCheckIn.paymentMethod && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Payment Method</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {selectedCheckIn.paymentMethod.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                    </div>
                  )}
                  {selectedCheckIn.reason && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Reason</p>
                      <p className="font-medium text-gray-900 dark:text-white">{selectedCheckIn.reason}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Information */}
            {(selectedCheckIn.createdAt || selectedCheckIn.updatedAt) && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  System Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedCheckIn.createdAt && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Created</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {new Date(selectedCheckIn.createdAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {selectedCheckIn.updatedAt && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Last Updated</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {new Date(selectedCheckIn.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                onClick={handleDetailsModalClose}
                variant="outline"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CheckInHistoryPage; 