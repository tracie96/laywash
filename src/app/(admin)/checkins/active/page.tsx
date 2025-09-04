"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Button from '@/components/ui/button/Button';
import Badge from '@/components/ui/badge/Badge';
import PasscodeModal from '@/components/admin/PasscodeModal';
import { Modal } from '@/components/ui/modal';
import CheckInDetailModal from '@/components/admin/CheckInDetailModal';
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
  assignedWasher?: string;
  assignedWasherId?: string;
  washerCompletionStatus?: boolean;
  estimatedDuration: number;
  actualDuration?: number;
  totalPrice: number;
  specialInstructions?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  customerId: string;
  passcode?: string;
  createdAt: Date;
  updatedAt: Date;
  userCode?: string;  
}

// Raw API data interface (dates come as strings)
interface RawCheckIn {
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
  checkInTime: string; // API returns as string
  completedTime?: string; // API returns as string
  assignedWasher?: string;
  assignedWasherId?: string;
  washerCompletionStatus?: boolean;
  estimatedDuration: number;
  actualDuration?: number;
  totalPrice: number;
  specialInstructions?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  customerId: string;
  userCode?: string;  
  passcode?: string;
  createdAt: string;
  updatedAt: string;
}

interface Washer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: 'active' | 'inactive' | 'on_leave';
  isAvailable: boolean;
  hourlyRate: number;
  totalEarnings: number;
}

const ActiveCheckInsPage: React.FC = () => {
  const { hasRole, user } = useAuth();
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [washers, setWashers] = useState<Washer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [selectedCheckInId, setSelectedCheckInId] = useState<string>('');
  const [passcodeError, setPasscodeError] = useState<string>('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCheckInForDetail, setSelectedCheckInForDetail] = useState<CheckIn | null>(null);
  const [sendingSMS, setSendingSMS] = useState<string | null>(null);

  // Fetch active check-ins from API
  const fetchActiveCheckIns = async (search = '') => {
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
        console.log('Raw API response:', result.checkIns); 
        
        const activeCheckIns = result.checkIns.filter((checkIn: RawCheckIn) => 
          checkIn.status === 'pending' || checkIn.status === 'in_progress'
        );
        
        console.log('Active check-ins after filtering:', activeCheckIns); // Debug log
        
        // Convert string dates back to Date objects
        const processedCheckIns = activeCheckIns.map((checkIn: RawCheckIn) => ({
          ...checkIn,
          checkInTime: new Date(checkIn.checkInTime),
          completedTime: checkIn.completedTime ? new Date(checkIn.completedTime) : undefined,
          createdAt: new Date(checkIn.createdAt),
          updatedAt: new Date(checkIn.updatedAt)
        })).filter((checkIn: CheckIn) => {
          // Filter out check-ins with invalid dates
          return !isNaN(checkIn.checkInTime.getTime()) && 
                 !isNaN(checkIn.createdAt.getTime()) && 
                 !isNaN(checkIn.updatedAt.getTime());
        });
        
        console.log('Processed check-ins:', processedCheckIns); // Debug log
        
        setCheckIns(processedCheckIns);
      } else {
        throw new Error(result.error || 'Failed to fetch check-ins');
      }
    } catch (err) {
      console.error('Error fetching check-ins:', err);
      setError(err instanceof Error ? err.message : 'Failed to load check-ins');
    }
  };

  const fetchWashers = async () => {
    try {
      console.log('Fetching washers...');
      const response = await fetch('/api/admin/washers');
      const result = await response.json();
      
      console.log('Washers API response:', result);
      
      if (result.success) {
        const allWashers = result.washers || [];
        console.log('All washers:', allWashers);
        
        // Temporarily show all washers for debugging
        const availableWashers = allWashers; // .filter((washer: Washer) => washer.status === 'active' && washer.isAvailable);
        console.log('Available washers (showing all for now):', availableWashers);
        
        setWashers(availableWashers);
      } else {
        console.error('Washers API error:', result.error);
        throw new Error(result.error || 'Failed to fetch washers');
      }
    } catch (err) {
      console.error('Error fetching washers:', err);
      // Don't set error here as washers are not critical for the page to function
    }
  };

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        await Promise.all([
          fetchActiveCheckIns(),
          fetchWashers()
        ]);
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Search functionality with debouncing
  const performSearch = useCallback(async (query: string) => {
    setSearchLoading(true);
    setError(null);
    try {
      await fetchActiveCheckIns(query);
    } finally {
      setSearchLoading(false);
    }
  }, []);



  // Refresh data function
  const refreshData = () => {
    setIsLoading(true);
    setError(null);
    fetchActiveCheckIns(searchQuery).finally(() => setIsLoading(false));
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    performSearch(''); // Clear search results and show all check-ins
  };

  const filteredCheckIns = checkIns.filter(checkIn => {
    if (filter === 'all') return checkIn.status === 'pending' || checkIn.status === 'in_progress';
    return checkIn.status === filter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge color="warning">Pending</Badge>;
      case 'in_progress':
        return <Badge color="info">In Progress</Badge>;
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
      default:
        return 'border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700';
    }
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
    console.log('Check-in data:', checkIn); // Debug log
    
    if (checkIn?.washType === 'instant') {
      console.log('Instant wash customer, marking as completed directly'); // Debug log
      handleStatusChange(checkInId, 'completed');
      return;
    }
    
    // For delayed wash customers, check if passcode is set
    if (!checkIn?.passcode) {
      console.log('Delayed wash customer but no passcode set, marking as completed directly'); // Debug log
      handleStatusChange(checkInId, 'completed');
      return;
    }
    
    // For delayed wash customers with passcode, require passcode input
    console.log('Delayed wash customer with passcode, passcode required'); // Debug log
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

  const handleCancelConfirm = async () => {
    if (!cancelReason.trim()) {
      alert('Please provide a reason for cancellation');
      return;
    }
    
    // Store the reason before closing the modal
    const reasonToSend = cancelReason;
    
    // Close the modal first
    handleCancelModalClose();
    
    // Then call the status change with the stored reason
    await handleStatusChange(selectedCheckInId, 'cancelled', undefined, reasonToSend);
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
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('Washer assigned successfully:', result.checkIn);
        setCheckIns(prev => prev.map(checkIn => 
          checkIn.id === checkInId 
            ? { 
                ...checkIn, 
                assignedWasher: result.checkIn.assignedWasher,
                assignedWasherId: result.checkIn.assignedWasherId,
                status: result.checkIn.status
              }
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

  const handleSendKeyCode = async (checkInId: string) => {
    setSendingSMS(checkInId);
    
    try {
      const response = await fetch('/api/admin/send-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-ID': user?.id || '',
        },
        body: JSON.stringify({ 
          checkInId: checkInId
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Key code sent successfully via SMS!');
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

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Active Check-ins
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Loading check-ins data...
            </p>
          </div>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border rounded-xl p-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 animate-pulse">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-1/4 mb-2"></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, j) => (
                      <div key={j}>
                        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-1"></div>
                        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Active Check-ins
            </h1>
            <p className="text-red-600 dark:text-red-400 mt-2">
              Error: {error}
            </p>
          </div>
          <Button
            onClick={refreshData}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Retry
          </Button>
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
            Active Check-ins
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage pending and in-progress car wash services
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={refreshData}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>
          <Button
            onClick={() => window.location.href = '/checkins/new'}
            className="bg-blue-600 hover:bg-blue-700"
          >
            New Check-in
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg 
              className="h-5 w-5 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by name, phone number, license plate, or key code..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-2">
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <button
              onClick={() => performSearch(searchQuery)}
              disabled={searchLoading}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
            >
              {searchLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                'Search'
              )}
            </button>
          </div>
        </div>
        {searchQuery && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {searchLoading ? 'Searching...' : `Showing results for "${searchQuery}"`}
          </p>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            All Active ({filteredCheckIns.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'pending'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Pending ({checkIns.filter(c => c.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('in_progress')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'in_progress'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            In Progress ({checkIns.filter(c => c.status === 'in_progress').length})
          </button>
        </div>
      </div>

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
              No active check-ins
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {filter === 'all' 
                ? 'No pending or in-progress check-ins found.'
                : `No ${filter.replace('_', ' ')} check-ins found.`
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
                    {getStatusBadge(checkIn.status)}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                 
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Phone Number</p>
                      <p className="font-medium text-gray-900 dark:text-white">{checkIn.customerPhone}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">License Plate</p>
                      <p className="font-medium text-gray-900 dark:text-white">{checkIn.licensePlate}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Vehicle</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {checkIn.vehicleColor} {checkIn.vehicleModel || checkIn.vehicleType}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Check-in Time</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {(() => {
                          try {
                            if (checkIn.checkInTime instanceof Date) {
                              return checkIn.checkInTime.toLocaleTimeString();
                            }
                            const date = new Date(checkIn.checkInTime);
                            return isNaN(date.getTime()) ? 'Invalid time' : date.toLocaleTimeString();
                          } catch {
                            return 'Invalid time';
                          }
                        })()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Total Price</p>
                      <p className="font-medium text-gray-900 dark:text-white">${checkIn.totalPrice}</p>
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
              {checkIn.userCode && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Key Code:</p>
                    {hasRole('admin') && checkIn.customerId && (
                      <Button
                        size="sm"
                        onClick={() => handleSendKeyCode(checkIn.id)}
                        disabled={sendingSMS === checkIn.id}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {sendingSMS === checkIn.id ? (
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Sending...
                          </div>
                        ) : (
                          'Send Key Code'
                        )}
                      </Button>
                    )}
                  </div>
                  {hasRole('super_admin') && checkIn.customerId && (
                  <p className="text-sm text-gray-900 dark:text-white bg-yellow-50 dark:bg-yellow-900/30 p-2 rounded">
                    {checkIn.userCode}
                  </p>
                  )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Key code will be sent via SMS to {checkIn.customerPhone}
                    </p>
                  
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      SMS not available for walk-in customers
                    </p>
                  
                </div>
              )}
              {checkIn.specialInstructions && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Special Instructions:</p>
                  <p className="text-sm text-gray-900 dark:text-white bg-yellow-50 dark:bg-yellow-900/30 p-2 rounded">
                    {checkIn.specialInstructions}
                  </p>
                </div>
              )}


              {/* Actions */}
              <div className="space-y-4">
                {/* Status Info */}
                <div className="flex flex-wrap gap-4">
                  <div className="text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Estimated Duration: </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {checkIn.estimatedDuration} minutes
                    </span>
                  </div>
                  {checkIn.assignedWasher && (
                    <div className="text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Assigned to: </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {checkIn.assignedWasher}
                      </span>
                    </div>
                  )}
                  {checkIn.washType === 'delayed' && (
                    <div className="text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Security: </span>
                      <span className={`font-medium ${checkIn.passcode ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                        {checkIn.passcode ? 'Passcode Set' : 'No Passcode'}
                      </span>
                    </div>
                  )}
                  {checkIn.assignedWasher && (
                    <div className="text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Washer Status: </span>
                      <span className={`font-medium ${checkIn.washerCompletionStatus ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                        {checkIn.washerCompletionStatus ? 'Completed' : 'In Progress'}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-row flex-wrap gap-2">
                  {checkIn.status === 'pending' && (
                    <>
                      {washers.length > 0 ? (
                        <div className="flex flex-col sm:flex-row items-center gap-2">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                            {checkIn.assignedWasher ? 'Reassign Worker:' : 'Assign Worker:'}
                          </label>
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAssignWasher(checkIn.id, e.target.value);
                              }
                            }}
                            value={checkIn.assignedWasherId || ""}
                            className="flex-shrink-0 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">{checkIn.assignedWasher ? 'Reassign Washer' : 'Assign Washer'}</option>
                            {washers.map((washer) => (
                              <option key={washer.id} value={washer.id}>
                                {washer.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="flex-shrink-0"
                        >
                          No Washers Available
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenCancelModal(checkIn.id)}
                        className="flex-shrink-0"
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                  {checkIn.status === 'in_progress' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenPasscodeModal(checkIn.id)}
                        className="flex-shrink-0 bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                      >
                        Mark Complete
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedCheckInForDetail(checkIn);
                      setShowDetailModal(true);
                    }}
                    className="flex-shrink-0"
                  >
                    View Details
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <PasscodeModal
        isOpen={showPasscodeModal}
        onClose={handlePasscodeModalClose}
        onConfirm={handlePasscodeConfirm}
        error={passcodeError}
      />

      <CheckInDetailModal
        checkIn={selectedCheckInForDetail}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedCheckInForDetail(null);
        }}
      />

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
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
          />
          <div className="flex space-x-3 mt-6">
            <Button
              variant="outline"
              onClick={handleCancelModalClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCancelConfirm}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              Confirm Cancellation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ActiveCheckInsPage; 