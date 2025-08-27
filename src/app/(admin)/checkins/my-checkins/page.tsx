"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Badge from '@/components/ui/badge/Badge';
import Button from '@/components/ui/button/Button';
import { useAuth } from '../../../../context/AuthContext';

interface CheckIn {
  id: string;
  customerName: string;
  customerPhone: string;
  licensePlate: string;
  vehicleType: string;
  vehicleColor: string;
  vehicleModel?: string;
  services: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'paid' | 'cancelled';
  checkInTime: Date;
  completedTime?: Date;
  estimatedDuration: number;
  actualDuration?: number;
  totalPrice: number;
  specialInstructions?: string;
  paymentStatus: 'pending' | 'paid';
  paymentMethod?: 'cash' | 'card' | 'mobile_money';
  customerId?: string;
  createdAt: string;
  updatedAt: string;
  customerType?: 'registered' | 'instant'; // Added customerType
}

const MyCheckInsPage: React.FC = () => {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null); // Track which check-in is being updated

  const { user } = useAuth();

  const fetchMyCheckIns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user?.id) {
        setError('User not authenticated');
        return;
      }
      
      const washerId = user.id;
      const searchParams = new URLSearchParams({
        washerId,
        status: filter === 'all' ? '' : filter,
        search: searchQuery,
        sortBy: 'check_in_time',
        sortOrder: 'desc',
        limit: '50'
      });

      // Remove empty parameters
      Object.entries(Object.fromEntries(searchParams)).forEach(([key, value]) => {
        if (!value) searchParams.delete(key);
      });
      
      const response = await fetch(`/api/admin/my-checkins?${searchParams.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch check-ins');
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Transform dates
        const transformedCheckIns = result.checkIns.map((checkIn: CheckIn) => ({
          ...checkIn,
          checkInTime: new Date(checkIn.checkInTime),
          completedTime: checkIn.completedTime ? new Date(checkIn.completedTime) : undefined
        }));
        
        setCheckIns(transformedCheckIns);
      } else {
        setError(result.error || 'Failed to load check-ins');
      }
    } catch (err) {
      console.error('Error fetching my check-ins:', err);
      setError('Failed to load check-ins');
    } finally {
      setLoading(false);
    }
  }, [filter, searchQuery, user?.id]);

  useEffect(() => {
    fetchMyCheckIns();
  }, [fetchMyCheckIns]);

  const handleMarkInProgress = async (checkInId: string) => {
    try {
      setUpdatingStatus(checkInId);
      setError(null);
      
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
        // Update the local state immediately for better UX
        setCheckIns(prev => prev.map(checkIn => 
          checkIn.id === checkInId 
            ? { ...checkIn, status: 'in_progress' as const }
            : checkIn
        ));
        
        // Show success message
        alert('Status updated successfully! Work started.');
        
        // Refresh the list to get any additional updates
        await fetchMyCheckIns();
      } else {
        throw new Error(result.error || 'Failed to update status');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update status';
      setError(errorMessage);
      alert(`Failed to update status: ${errorMessage}`);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleMarkCompleted = async (checkInId: string) => {
    try {
      setUpdatingStatus(checkInId);
      setError(null);
      
      console.log('Marking check-in as completed:', checkInId);
      
      const response = await fetch(`/api/admin/check-ins/${checkInId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          washer_completion_status: true, // Changed from 'completed' to true
          actual_completion_time: new Date().toISOString(),
          userId: user?.id 
        }),
      });

      const result = await response.json();
      console.log('Complete response:', result);

      if (response.ok && result.success) {
        // Update the local state immediately for better UX
        setCheckIns(prev => prev.map(checkIn => 
          checkIn.id === checkInId 
            ? { ...checkIn, status: 'completed' as const }
            : checkIn
        ));
        
        // Show success message
        alert('Check-in marked as completed successfully!');
        
        await fetchMyCheckIns();
      } else {
        throw new Error(result.error || 'Failed to mark as completed');
      }
    } catch (err) {
      console.error('Error marking as completed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark as completed';
      setError(errorMessage);
      alert(`Failed to mark as completed: ${errorMessage}`);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning' as const;
      case 'in_progress': return 'info' as const;
      case 'completed': return 'success' as const;
      case 'paid': return 'primary' as const;
      case 'cancelled': return 'error' as const;
      default: return 'primary' as const;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    return status === 'paid' ? 'success' as const : 'warning' as const;
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
        <Button onClick={fetchMyCheckIns}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            My Check-ins
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            View and manage your assigned car wash jobs
          </p>
        </div>
        <Button onClick={fetchMyCheckIns}>
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by customer name, license plate, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          {/* Status Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'pending' | 'in_progress' | 'completed')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Check-ins List */}
      <div className="space-y-4">
        {checkIns.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 shadow-sm border border-gray-200 dark:border-gray-700 text-center">
            <p className="text-gray-500 dark:text-gray-400">No check-ins found</p>
          </div>
        ) : (
          checkIns.map((checkIn) => (
            <div key={checkIn.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Check-in Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {checkIn.customerName}
                    </h3>
                    <Badge color={getStatusColor(checkIn.status)}>
                    Status:  {checkIn.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <Badge color={getPaymentStatusColor(checkIn.paymentStatus)}>
                    Payment Status:  {checkIn.paymentStatus.toUpperCase()}
                    </Badge>
                    {checkIn.customerType && (
                      <Badge color={checkIn.customerType === 'registered' ? 'warning' : 'info'}>
                        {checkIn.customerType === 'registered' ? 'Registered Customer' : 'Instant Customer'}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div>
                      <span className="font-medium">License:</span> {checkIn.licensePlate}
                    </div>
                    <div>
                      <span className="font-medium">Vehicle:</span> {checkIn.vehicleType} ({checkIn.vehicleColor})
                    </div>
                    <div>
                      <span className="font-medium">Phone:</span> {checkIn.customerPhone}
                    </div>
                    <div>
                      <span className="font-medium">Services:</span> {checkIn.services.join(', ')}
                    </div>
                    <div>
                      <span className="font-medium">Amount:</span> ${checkIn.totalPrice}
                    </div>
                    <div>
                      <span className="font-medium">Check-in:</span> {checkIn.checkInTime.toLocaleString()}
                    </div>
                  </div>
                  
                  {checkIn.specialInstructions && (
                    <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
                      <span className="font-medium text-yellow-800 dark:text-yellow-300">Special Instructions:</span>
                      <p className="text-yellow-700 dark:text-yellow-200 mt-1">{checkIn.specialInstructions}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 lg:w-auto">
                  {checkIn.status === 'pending' && (
                    <Button
                      onClick={() => {
                        console.log('Start Work button clicked for check-in:', checkIn.id);
                        handleMarkInProgress(checkIn.id);
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={updatingStatus === checkIn.id}
                    >
                      {updatingStatus === checkIn.id ? 'Starting...' : 'Start Work'}
                    </Button>
                  )}
                  
                  {checkIn.status === 'in_progress' && (
                    <div className="text-center">
                      <Button
                        onClick={() => {
                          console.log('Mark Complete button clicked for check-in:', checkIn.id);
                          handleMarkCompleted(checkIn.id);
                        }}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={updatingStatus === checkIn.id}
                      >
                        {updatingStatus === checkIn.id ? 'Completing...' : 'Mark Complete'}
                      </Button>
                      {checkIn.customerType === 'registered' && (
                        <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                          ⚠️ Passcode required for registered customers
                        </p>
                      )}
                    </div>
                  )}
                  
                  {checkIn.status === 'completed' && (
                    <div className="text-center">
                      <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                        ✓ Completed
                      </p>
                      {checkIn.completedTime && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {checkIn.completedTime.toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MyCheckInsPage;

