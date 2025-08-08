"use client";
import React, { useState, useEffect } from 'react';
import Badge from '@/components/ui/badge/Badge';
import Button from '@/components/ui/button/Button';
import PageBreadCrumb from "@/components/common/PageBreadCrumb";

interface CheckIn {
  id: string;
  customerName: string;
  customerPhone: string;
  licensePlate: string;
  vehicleType: string;
  vehicleColor: string;
  vehicleModel: string;
  services: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'paid' | 'cancelled';
  checkInTime: Date;
  completedTime?: Date;
  paidTime?: Date;
  assignedWasher: string;
  assignedWasherId?: string;
  assignedAdmin: string;
  estimatedDuration: number;
  actualDuration?: number;
  totalPrice: number;
  specialInstructions?: string;
  paymentStatus: 'pending' | 'paid';
  paymentMethod?: 'cash' | 'card' | 'mobile_money';
  customerId?: string;
  createdAt: string;
  updatedAt: string;
}

const OperationsCheckInsPage: React.FC = () => {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'paid' | 'cancelled'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCheckIns();
  }, [searchTerm, filter, paymentFilter]);

  const fetchCheckIns = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filter !== 'all') params.append('status', filter);
      if (paymentFilter !== 'all') params.append('paymentStatus', paymentFilter);
      
      const response = await fetch(`/api/admin/check-ins?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setCheckIns(data.checkIns);
      } else {
        setError(data.error || 'Failed to fetch check-ins');
      }
    } catch {
      console.error('Error fetching check-ins');
      setError('Failed to fetch check-ins from server');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (checkInId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/check-ins/${checkInId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus
        }),
      });

      const data = await response.json();

      if (data.success) {
        fetchCheckIns(); // Refresh the list
      } else {
        setError(data.error || 'Failed to update check-in status');
      }
    } catch {
      setError('Failed to update check-in status');
    }
  };

  const handlePaymentUpdate = async (checkInId: string, paymentMethod: string) => {
    try {
      const response = await fetch(`/api/admin/check-ins/${checkInId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentStatus: 'paid',
          paymentMethod: paymentMethod
        }),
      });

      const data = await response.json();

      if (data.success) {
        fetchCheckIns(); // Refresh the list
      } else {
        setError(data.error || 'Failed to update payment status');
      }
    } catch {
      setError('Failed to update payment status');
    }
  };

  const filteredCheckIns = checkIns.filter(checkIn => {
    const matchesFilter = filter === 'all' || checkIn.status === filter;
    const matchesPaymentFilter = paymentFilter === 'all' || checkIn.paymentStatus === paymentFilter;
    const matchesSearch = searchTerm === '' || 
      checkIn.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      checkIn.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      checkIn.customerPhone.includes(searchTerm);
    
    return matchesFilter && matchesPaymentFilter && matchesSearch;
  });

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

  const calculateStats = () => {
    const stats = {
      total: checkIns.length,
      pending: checkIns.filter(c => c.status === 'pending').length,
      inProgress: checkIns.filter(c => c.status === 'in_progress').length,
      completed: checkIns.filter(c => c.status === 'completed').length,
      paid: checkIns.filter(c => c.status === 'paid').length,
      cancelled: checkIns.filter(c => c.status === 'cancelled').length,
      totalEarnings: checkIns.filter(c => c.paymentStatus === 'paid').reduce((sum, c) => sum + c.totalPrice, 0),
      pendingEarnings: checkIns.filter(c => c.status === 'completed' && c.paymentStatus === 'pending').reduce((sum, c) => sum + c.totalPrice, 0)
    };
    return stats;
  };

  const stats = calculateStats();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading check-ins...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageBreadCrumb pageTitle="Check-ins Management" />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            All Check-ins
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Comprehensive view of all car wash operations
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Check-ins
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.total}
              </p>
            </div>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Active Operations
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.pending + stats.inProgress}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Earnings
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${stats.totalEarnings.toFixed(2)}
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
                Pending Revenue
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${stats.pendingEarnings.toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by customer name, license plate, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Status Filter */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              All ({stats.total})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'pending'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Pending ({stats.pending})
            </button>
            <button
              onClick={() => setFilter('in_progress')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'in_progress'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              In Progress ({stats.inProgress})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'completed'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Completed ({stats.completed})
            </button>
            <button
              onClick={() => setFilter('paid')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'paid'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Paid ({stats.paid})
            </button>
          </div>

          {/* Payment Status Filter */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            <button
              onClick={() => setPaymentFilter('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                paymentFilter === 'all'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              All Payments
            </button>
            <button
              onClick={() => setPaymentFilter('pending')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                paymentFilter === 'pending'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Pending Payment
            </button>
            <button
              onClick={() => setPaymentFilter('paid')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                paymentFilter === 'paid'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Paid
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-red-800 dark:text-red-200">{error}</span>
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
              No check-ins found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm || filter !== 'all' || paymentFilter !== 'all'
                ? 'No check-ins match your search criteria.'
                : 'No check-ins found for the selected filter.'
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
                    {checkIn.paymentStatus === 'paid' && (
                      <Badge color="success">Paid</Badge>
                    )}
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
                        {checkIn.vehicleModel && ` (${checkIn.vehicleModel})`}
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
                      <p className="font-medium text-gray-900 dark:text-white">${checkIn.totalPrice.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Services */}
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Services:</p>
                <div className="flex flex-wrap gap-2">
                  {checkIn.services.length > 0 ? (
                    checkIn.services.map((service) => (
                      <span
                        key={service}
                        className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded"
                      >
                        {service}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400 text-sm">No services specified</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Duration: </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {checkIn.actualDuration || checkIn.estimatedDuration} min
                    </span>
                  </div>
                  {checkIn.assignedWasher && checkIn.assignedWasher !== 'Unassigned' && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Washer: </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {checkIn.assignedWasher}
                      </span>
                    </div>
                  )}
                  {checkIn.specialInstructions && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Notes: </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {checkIn.specialInstructions}
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
                  {checkIn.status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusUpdate(checkIn.id, 'in_progress')}
                    >
                      Start Work
                    </Button>
                  )}
                  {checkIn.status === 'in_progress' && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusUpdate(checkIn.id, 'completed')}
                    >
                      Mark Complete
                    </Button>
                  )}
                  {checkIn.status === 'completed' && checkIn.paymentStatus === 'pending' && (
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        onClick={() => handlePaymentUpdate(checkIn.id, 'cash')}
                      >
                        Cash
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handlePaymentUpdate(checkIn.id, 'card')}
                      >
                        Card
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handlePaymentUpdate(checkIn.id, 'mobile_money')}
                      >
                        Mobile
                      </Button>
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

export default OperationsCheckInsPage; 