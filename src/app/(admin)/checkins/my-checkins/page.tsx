"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Badge from '@/components/ui/badge/Badge';
import Button from '@/components/ui/button/Button';
import { useAuth } from '../../../../context/AuthContext';
import AssignMaterialsModal from '../../../../components/carwash/AssignMaterialsModal';

interface CheckIn {
  id: string;
  customerName: string;
  customerPhone: string;
  licensePlate: string;
  vehicleType: string;
  vehicleColor: string;
  vehicleModel?: string;
  services: { services: { name: string; description?: string; estimated_duration?: number; washer_commission_percentage?: number } }[] | { name: string; description?: string; estimated_duration?: number; washer_commission_percentage?: number }[] | string[] | null | undefined;
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
  const [assignMaterialsModalOpen, setAssignMaterialsModalOpen] = useState(false);
  const [selectedCheckInId, setSelectedCheckInId] = useState<string | null>(null);
  const [checkInMaterials, setCheckInMaterials] = useState<Record<string, Array<{
    id: string;
    material_name: string;
    quantity_used: number;
    usage_date: string;
  }>>>({});

  const { user } = useAuth();

  // Helper function to extract service names from various data structures
  const getServiceNames = (services: unknown): string => {
    if (!services) return 'No services';
    
    if (Array.isArray(services)) {
      // Handle array of service objects with nested structure
      const serviceNames: string[] = [];
      for (const item of services) {
        if (item && typeof item === 'object') {
          // Check if it has a nested services object
          if ('services' in item && item.services && typeof item.services === 'object' && 'name' in item.services) {
            serviceNames.push((item.services as { name: string }).name);
          }
          // Check if it has a direct name property
          else if ('name' in item && (item as { name: string }).name) {
            serviceNames.push((item as { name: string }).name);
          }
        }
      }
      return serviceNames.length > 0 ? serviceNames.join(', ') : 'No services';
    }
    
    if (typeof services === 'object' && services !== null) {
      if ('name' in services && (services as { name: string }).name) {
        return (services as { name: string }).name;
      }
      
      if ('services' in services && (services as { services: { name: string } }).services && typeof (services as { services: { name: string } }).services === 'object' && 'name' in (services as { services: { name: string } }).services) {
        return ((services as { services: { name: string } }).services as { name: string }).name;
      }
    }
    
    return 'No services';
  };

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
        console.log(transformedCheckIns,'transformedCheckIns');
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

  const fetchCheckInMaterials = useCallback(async (checkInId: string) => {
    try {
      const response = await fetch(`/api/admin/check-ins/assign-materials?checkInId=${checkInId}&washerId=${user?.id}`);
      const result = await response.json();
      
      if (result.success) {
        setCheckInMaterials(prev => ({
          ...prev,
          [checkInId]: result.materials || []
        }));
      }
    } catch (err) {
      console.error('Error fetching check-in materials:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchMyCheckIns();
  }, [fetchMyCheckIns]);

  // Fetch materials for all check-ins after they're loaded
  useEffect(() => {
    if (checkIns.length > 0 && user?.id) {
      checkIns.forEach(checkIn => {
        fetchCheckInMaterials(checkIn.id);
      });
    }
  }, [checkIns, user?.id, fetchCheckInMaterials]);

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

  // const handleAssignMaterials = async (checkInId: string) => {
  //   setSelectedCheckInId(checkInId);
  //   setAssignMaterialsModalOpen(true);
    
  //   // Fetch current materials for this check-in
  //   await fetchCheckInMaterials(checkInId);
  // };

  const handleMaterialsAssigned = () => {
    // Refresh the check-ins list to show updated information
    fetchMyCheckIns();
    
    // Refresh materials for the current check-in
    if (selectedCheckInId) {
      fetchCheckInMaterials(selectedCheckInId);
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
                      <span className="font-medium">Commission:</span> {
                        (() => {
                          if (Array.isArray(checkIn.services) && checkIn.services.length > 0) {
                            const firstService = checkIn.services[0];
                            if (firstService && typeof firstService === 'object' && 'services' in firstService) {
                              const nestedService = (firstService as { services: { washer_commission_percentage?: number } }).services;
                              if (nestedService?.washer_commission_percentage) {
                                return `${nestedService.washer_commission_percentage}%`;
                              }
                            }
                          }
                          return 'N/A';
                        })()
                      }
                    </div>
                    <div>
                      <span className="font-medium">Expected Earnings:</span> {
                        (() => {
                          if (Array.isArray(checkIn.services) && checkIn.services.length > 0) {
                            const firstService = checkIn.services[0];
                            if (firstService && typeof firstService === 'object' && 'services' in firstService) {
                              const nestedService = (firstService as { services: { washer_commission_percentage?: number } }).services;
                              if (nestedService?.washer_commission_percentage) {
                                const commission = (checkIn.totalPrice * nestedService.washer_commission_percentage) / 100;
                                return `NGN${commission.toFixed(2)}`;
                        
                              }
                            }
                          }
                          return 'N/A';
                        })()
                      }
                    </div>
                    <div>
                      <span className="font-medium">Services:</span> {getServiceNames(checkIn.services)}
                    </div>
                    <div>
                      <span className="font-medium">Amount:</span> NGN{checkIn.totalPrice}
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

                  {/* Materials Table */}
                  <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-gray-700 dark:text-gray-300">Materials:</span>
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => fetchCheckInMaterials(checkIn.id)}
                          variant="outline"
                          size="sm"
                          className="border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-900/30"
                        >
                          Refresh
                        </Button>
                        {/* <Button
                          onClick={() => handleAssignMaterials(checkIn.id)}
                          variant="outline"
                          size="sm"
                          className="border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-900/30"
                        >
                          Assign Materials
                        </Button> */}
                      </div>
                    </div>
                    
                    {/* Materials Table */}
                    {checkInMaterials[checkIn.id] && checkInMaterials[checkIn.id].length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100 dark:bg-gray-600">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Material
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Quantity
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Date Used
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-700 divide-y divide-gray-200 dark:divide-gray-600">
                              {checkInMaterials[checkIn.id].map((material) => (
                                <tr key={material.id} className="hover:bg-gray-50 dark:hover:bg-gray-600">
                                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">
                                    {material.material_name}
                                  </td>
                                  <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                                    {material.quantity_used}
                                  </td>
                                  <td className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                                    {new Date(material.usage_date).toLocaleDateString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        No materials assigned yet. Click &ldquo;Assign Materials&rdquo; to add materials to this check-in.
                      </div>
                    )}
                  </div>
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

      {/* Assign Materials Modal */}
      {selectedCheckInId && (
        <AssignMaterialsModal
          isOpen={assignMaterialsModalOpen}
          onClose={() => {
            setAssignMaterialsModalOpen(false);
            setSelectedCheckInId(null);
          }}
          checkInId={selectedCheckInId}
          onMaterialsAssigned={handleMaterialsAssigned}
        />
      )}
    </div>
  );
};

export default MyCheckInsPage;

