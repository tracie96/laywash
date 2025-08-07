"use client";
import React, { useState, useEffect } from 'react';
import Badge from '@/components/ui/badge/Badge';
import Button from '@/components/ui/button/Button';

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
  completedTime?: Date;
  paidTime?: Date;
  assignedWasher?: string;
  estimatedDuration: number;
  actualDuration?: number;
  totalPrice: number;
  specialInstructions?: string;
}

const CheckInHistoryPage: React.FC = () => {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'paid' | 'cancelled'>('all');

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
        status: 'paid',
        checkInTime: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        completedTime: new Date(Date.now() - 1000 * 60 * 60 * 1.5), // 1.5 hours ago
        paidTime: new Date(Date.now() - 1000 * 60 * 60 * 1), // 1 hour ago
        assignedWasher: 'Mike Johnson',
        estimatedDuration: 45,
        actualDuration: 42,
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
        status: 'completed',
        checkInTime: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
        completedTime: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
        assignedWasher: 'David Brown',
        estimatedDuration: 75,
        actualDuration: 78,
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
        status: 'cancelled',
        checkInTime: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
        estimatedDuration: 40,
        totalPrice: 25
      },
      {
        id: '4',
        customerName: 'Lisa Anderson',
        customerPhone: '+1 (555) 789-0123',
        licensePlate: 'GHI-789',
        vehicleType: 'Luxury',
        vehicleColor: 'Red',
        services: ['full_service', 'wax', 'tire_shine'],
        status: 'paid',
        checkInTime: new Date(Date.now() - 1000 * 60 * 60 * 8), // 8 hours ago
        completedTime: new Date(Date.now() - 1000 * 60 * 60 * 7), // 7 hours ago
        paidTime: new Date(Date.now() - 1000 * 60 * 60 * 6.5), // 6.5 hours ago
        assignedWasher: 'Mike Johnson',
        estimatedDuration: 90,
        actualDuration: 85,
        totalPrice: 70
      }
    ];

    setTimeout(() => {
      setCheckIns(mockCheckIns);
      setIsLoading(false);
    }, 1000);
  }, []);

  const filteredCheckIns = checkIns.filter(checkIn => {
    if (filter === 'all') return checkIn.status === 'completed' || checkIn.status === 'paid' || checkIn.status === 'cancelled';
    return checkIn.status === filter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
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

  const calculateTotalEarnings = () => {
    return filteredCheckIns
      .filter(checkIn => checkIn.status === 'paid')
      .reduce((total, checkIn) => total + checkIn.totalPrice, 0);
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
            Check-in History
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            View completed, paid, and cancelled car wash services
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
                ${calculateTotalEarnings()}
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
            All History ({filteredCheckIns.length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'completed'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Completed ({checkIns.filter(c => c.status === 'completed').length})
          </button>
          <button
            onClick={() => setFilter('paid')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'paid'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Paid ({checkIns.filter(c => c.status === 'paid').length})
          </button>
          <button
            onClick={() => setFilter('cancelled')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'cancelled'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Cancelled ({checkIns.filter(c => c.status === 'cancelled').length})
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
                        {checkIn.checkInTime.toLocaleString()}
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

              {/* Timeline */}
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Timeline:</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Check-in:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {checkIn.checkInTime.toLocaleTimeString()}
                    </span>
                  </div>
                  {checkIn.completedTime && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Completed:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {checkIn.completedTime.toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                  {checkIn.paidTime && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Paid:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {checkIn.paidTime.toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Performance */}
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4 text-sm">
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
                
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.location.href = `/checkins/${checkIn.id}`}
                  >
                    View Details
                  </Button>
                  {checkIn.status === 'completed' && (
                    <Button
                      size="sm"
                      onClick={() => console.log('Mark as paid:', checkIn.id)}
                    >
                      Mark as Paid
                    </Button>
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

export default CheckInHistoryPage; 