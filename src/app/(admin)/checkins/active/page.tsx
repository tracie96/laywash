"use client";
import React, { useState, useEffect } from 'react';
import Button from '@/components/ui/button/Button';
import Badge from '@/components/ui/badge/Badge';

interface CheckIn {
  id: string;
  customerName: string;
  customerPhone: string;
  licensePlate: string;
  vehicleType: string;
  vehicleColor: string;
  services: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'paid' | 'cancelled';
  checkInTime: Date;
  assignedWasher?: string;
  estimatedDuration: number;
  totalPrice: number;
  specialInstructions?: string;
}

const ActiveCheckInsPage: React.FC = () => {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress'>('all');

  // Mock data for development
  useEffect(() => {
    const mockCheckIns: CheckIn[] = [
      {
        id: '1',
        customerName: 'John Smith',
        customerPhone: '+1 (555) 123-4567',
        licensePlate: 'ABC-123',
        vehicleType: 'Sedan',
        vehicleColor: 'Silver',
        services: ['exterior_wash', 'interior_clean'],
        status: 'pending',
        checkInTime: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        estimatedDuration: 45,
        totalPrice: 35,
        specialInstructions: 'Please be careful with the leather seats'
      },
      {
        id: '2',
        customerName: 'Sarah Wilson',
        customerPhone: '+1 (555) 987-6543',
        licensePlate: 'XYZ-789',
        vehicleType: 'SUV',
        vehicleColor: 'Black',
        services: ['full_service', 'wax'],
        status: 'in_progress',
        checkInTime: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
        assignedWasher: 'Mike Johnson',
        estimatedDuration: 75,
        totalPrice: 60,
        specialInstructions: 'Customer requested extra attention to wheels'
      },
      {
        id: '3',
        customerName: 'David Brown',
        customerPhone: '+1 (555) 456-7890',
        licensePlate: 'DEF-456',
        vehicleType: 'Truck',
        vehicleColor: 'White',
        services: ['exterior_wash', 'tire_shine'],
        status: 'pending',
        checkInTime: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
        estimatedDuration: 40,
        totalPrice: 25
      }
    ];

    setTimeout(() => {
      setCheckIns(mockCheckIns);
      setIsLoading(false);
    }, 1000);
  }, []);

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

  const handleStatusChange = async (checkInId: string, newStatus: string) => {
    // TODO: Implement API call to update status
    console.log('Updating status:', checkInId, newStatus);
    
    setCheckIns(prev => prev.map(checkIn => 
      checkIn.id === checkInId 
        ? { ...checkIn, status: newStatus as CheckIn['status'] }
        : checkIn
    ));
  };

  const handleAssignWasher = async (checkInId: string, washerName: string) => {
    // TODO: Implement API call to assign washer
    console.log('Assigning washer:', checkInId, washerName);
    
    setCheckIns(prev => prev.map(checkIn => 
      checkIn.id === checkInId 
        ? { ...checkIn, assignedWasher: washerName, status: 'in_progress' as CheckIn['status'] }
        : checkIn
    ));
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading check-ins...</p>
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
            Active Check-ins
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage pending and in-progress car wash services
          </p>
        </div>
        <Button
          onClick={() => window.location.href = '/checkins/new'}
          className="bg-blue-600 hover:bg-blue-700"
        >
          New Check-in
        </Button>
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
                      <p className="text-gray-600 dark:text-gray-400">License Plate</p>
                      <p className="font-medium text-gray-900 dark:text-white">{checkIn.licensePlate}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Vehicle</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {checkIn.vehicleColor} {checkIn.vehicleType}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Check-in Time</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {checkIn.checkInTime.toLocaleTimeString()}
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

              {/* Special Instructions */}
              {checkIn.specialInstructions && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Special Instructions:</p>
                  <p className="text-sm text-gray-900 dark:text-white bg-yellow-50 dark:bg-yellow-900/30 p-2 rounded">
                    {checkIn.specialInstructions}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
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
                </div>
                
                <div className="flex space-x-2">
                  {checkIn.status === 'pending' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAssignWasher(checkIn.id, 'Mike Johnson')}
                      >
                        Assign Washer
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(checkIn.id, 'cancelled')}
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
                        onClick={() => handleStatusChange(checkIn.id, 'completed')}
                      >
                        Mark Complete
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    onClick={() => window.location.href = `/checkins/${checkIn.id}`}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ActiveCheckInsPage; 