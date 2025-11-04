"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Badge from '@/components/ui/badge/Badge';
import Button from '@/components/ui/button/Button';
import { Modal } from '@/components/ui/modal';
import { useAuth } from '@/context/AuthContext';

interface Payment {
  id: string;
  customerName: string;
  licensePlate: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'mobile_money' | 'pos' | 'Not specified';
  status: 'pending' | 'completed' | 'cancelled';
  date: string;
  serviceType?: string;
  services?: string[];
  vehicleType?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  checkInTime: string;
  completionTime?: string;
  customerId?: string;
  assignedWasherId?: string;
  assignedAdminId?: string;
  remarks?: string;
  // Additional fields to match CheckIn interface
  customerPhone?: string;
  washType?: string;
  paymentStatus?: string;
  estimatedDuration?: number;
  actualDuration?: number;
  totalPrice?: number;
  specialInstructions?: string;
  assignedWasher?: string;
  assignedAdmin?: string;
  createdAt?: string;
  updatedAt?: string;
  userCode?: string;
  reason?: string;
  passcode?: string;
}

const PaymentHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');
  const [error, setError] = useState<string | null>(null);
  
  // Details modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const fetchPayments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get current month date range
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      
      // Format dates for API
      const startDateStr = startOfMonth.getFullYear() + '-' + 
        String(startOfMonth.getMonth() + 1).padStart(2, '0') + '-' + 
        String(startOfMonth.getDate()).padStart(2, '0');
      const endDateStr = endOfMonth.getFullYear() + '-' + 
        String(endOfMonth.getMonth() + 1).padStart(2, '0') + '-' + 
        String(endOfMonth.getDate()).padStart(2, '0') + 'T23:59:59.999Z';
      
      // Build query parameters
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filter !== 'all') params.append('status', filter === 'completed' ? 'paid' : filter === 'cancelled' ? 'cancelled' : filter);
      params.append('sortBy', 'check_in_time');
      params.append('sortOrder', 'desc');
      params.append('limit', '100');
      // Add current month date filter
      params.append('startDate', startDateStr);
      params.append('endDate', endDateStr);
      
      if (!user?.id) return;
      
      const response = await fetch(`/api/admin/payments?${params.toString()}`, {
        headers: {
          'X-Admin-ID': user.id,
        },
      });
      const data = await response.json();
      
      if (data.success) {
        setPayments(data.payments || []);
      } else {
        setError(data.error || 'Failed to fetch payments');
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      setError('Failed to fetch payments');
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, filter, user?.id]);

  // Fetch payment data from API with debounce for search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchPayments();
    }, searchTerm ? 500 : 0); // Debounce search, but load immediately on first render

    return () => clearTimeout(timeoutId);
  }, [fetchPayments, searchTerm]);

  const handleMarkAsPaid = async (paymentId: string) => {
    try {
      const response = await fetch(`/api/admin/check-ins/${paymentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentStatus: 'paid'
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Refresh the payments list
        fetchPayments();
      } else {
        setError(data.error || 'Failed to update payment status');
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
      setError('Failed to update payment status');
    }
  };

  const handleViewDetails = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowDetailsModal(true);
  };

  const handleDetailsModalClose = () => {
    setShowDetailsModal(false);
    setSelectedPayment(null);
  };

  // Since filtering is now handled server-side, we can just use all payments
  const filteredPayments = payments;

  const calculateStats = () => {
    const stats = {
      total: payments.length,
      pending: payments.filter(p => p.status === 'pending').length,
      completed: payments.filter(p => p.status === 'completed').length,
      cancelled: payments.filter(p => p.status === 'cancelled').length,
      totalAmount: payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + (p.totalPrice || p.amount), 0),
      pendingAmount: payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + (p.totalPrice || p.amount), 0),
      cashPayments: payments.filter(p => p.paymentMethod === 'cash' && p.status === 'completed').length,
      cardPayments: payments.filter(p => p.paymentMethod === 'card' && p.status === 'completed').length,
      mobilePayments: payments.filter(p => p.paymentMethod === 'mobile_money' && p.status === 'completed').length
    };
    return stats;
  };

  const stats = calculateStats();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge color="success">Completed</Badge>;
      case 'pending':
        return <Badge color="warning">Pending</Badge>;
      case 'cancelled':
        return <Badge color="error">Cancelled</Badge>;
      default:
        return <Badge color="primary">{status}</Badge>;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return (
          <div className="flex items-center justify-center w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
        );
      case 'card':
        return (
          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
        );
      case 'mobile_money':
        return (
          <div className="flex items-center justify-center w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
        );
      case 'pos':
        return (
          <div className="flex items-center justify-center w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
            <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading payment history...</p>
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
              Error loading payments
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <Button onClick={fetchPayments} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Payment History
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          View payment transactions for the current month
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Payments
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.total}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Revenue
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                NGN {stats.totalAmount.toLocaleString()}
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
                Pending Amount
              </p>
              <p className="text-2xl font-bold text-orange-600">
                NGN {stats.pendingAmount.toLocaleString()}
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
            All Payments ({stats.total})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'completed'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Completed ({stats.completed})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'pending'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Pending ({stats.pending})
          </button>
          <button
            onClick={() => setFilter('cancelled')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'cancelled'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Cancelled ({stats.cancelled})
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by customer name or license plate..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
        />
      </div>

      {/* Payments List */}
      <div className="space-y-4">
        {filteredPayments.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No payments found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm ? 'No payments match your search criteria.' : 'No payments found for the selected filter.'}
            </p>
          </div>
        ) : (
          filteredPayments.map((payment) => (
            <div
              key={payment.id}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {payment.customerName}
                    </h3>
                    {getStatusBadge(payment.status)}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">License Plate</p>
                      <p className="font-medium text-gray-900 dark:text-white">{payment.licensePlate}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Vehicle Type</p>
                      <p className="font-medium text-gray-900 dark:text-white">{payment.vehicleType}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Amount</p>
                      <p className="font-medium text-gray-900 dark:text-white">NGN {payment.totalPrice || payment.amount}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Date</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {payment.completionTime 
                          ? new Date(payment.completionTime).toLocaleString()
                          : new Date(payment.date).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Method & Services */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Payment Method</h4>
                  <div className="flex items-center space-x-2">
                    {getPaymentMethodIcon(payment.paymentMethod)}
                    <span className="font-medium text-gray-900 dark:text-white capitalize">
                      {payment.paymentMethod.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Services</h4>
                  <div className="flex flex-wrap gap-2">
                    {payment.services && payment.services.length > 0 ? (
                      payment.services.map((service, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-full"
                        >
                          {service.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      ))
                    ) : (
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-full">
                        {payment.serviceType ? payment.serviceType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Not specified'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Vehicle Information */}
              {(payment.vehicleType || payment.vehicleColor || payment.vehicleModel) && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Vehicle Information</h4>
                  <div className="flex flex-wrap gap-4 text-sm">
                    {payment.vehicleColor && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Color: </span>
                        <span className="font-medium text-gray-900 dark:text-white capitalize">{payment.vehicleColor}</span>
                      </div>
                    )}
                    {payment.vehicleType && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Type: </span>
                        <span className="font-medium text-gray-900 dark:text-white capitalize">{payment.vehicleType}</span>
                      </div>
                    )}
                    {payment.vehicleModel && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Model: </span>
                        <span className="font-medium text-gray-900 dark:text-white">{payment.vehicleModel}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Payment ID: <span className="font-medium text-gray-900 dark:text-white">{payment.id}</span>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewDetails(payment)}
                  >
                    View Details
                  </Button>
                  {payment.status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => handleMarkAsPaid(payment.id)}
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

      {/* Payment Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={handleDetailsModalClose}
        className="max-w-4xl mx-4"
      >
        {selectedPayment && (
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Payment Details
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Payment ID: {selectedPayment.id}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge
                  color={selectedPayment.status === 'completed' ? 'success' : 'warning'}
                  size="sm"
                >
                  {selectedPayment.status === 'completed' ? 'Completed' : 'Pending'}
                </Badge>
                {selectedPayment.paymentMethod && (
                  <Badge
                    color="info"
                    size="sm"
                  >
                    {selectedPayment.paymentMethod.replace('_', ' ').toUpperCase()}
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customer Information */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Customer Information
                </h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedPayment.customerName}</p>
                  </div>
                  {selectedPayment.customerPhone && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Phone</p>
                      <p className="font-medium text-gray-900 dark:text-white">{selectedPayment.customerPhone}</p>
                    </div>
                  )}
                  {selectedPayment.customerId && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Customer ID</p>
                      <p className="font-medium text-gray-900 dark:text-white">{selectedPayment.customerId}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Vehicle Information */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Vehicle Information
                </h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">License Plate</p>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedPayment.licensePlate}</p>
                  </div>
                  {selectedPayment.vehicleColor && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Vehicle Color</p>
                      <p className="font-medium text-gray-900 dark:text-white">{selectedPayment.vehicleColor}</p>
                    </div>
                  )}
                  {selectedPayment.vehicleType && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Vehicle Type</p>
                      <p className="font-medium text-gray-900 dark:text-white">{selectedPayment.vehicleType}</p>
                    </div>
                  )}
                  {selectedPayment.vehicleModel && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Model</p>
                      <p className="font-medium text-gray-900 dark:text-white">{selectedPayment.vehicleModel}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Service Information */}
            <div className="mt-6 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Service Information
              </h4>
              <div className="space-y-3">
                {selectedPayment.services && selectedPayment.services.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Services</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedPayment.services.map((service) => (
                        <span
                          key={service}
                          className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded"
                        >
                          {service.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Amount</p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">
                    ₦{(selectedPayment.totalPrice || selectedPayment.amount).toLocaleString()}
                  </p>
                </div>
                {selectedPayment.specialInstructions && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Special Instructions</p>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedPayment.specialInstructions}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Information */}
            <div className="mt-6 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Payment Information
              </h4>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Payment Method</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedPayment.paymentMethod?.replace('_', ' ').toUpperCase() || 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Payment Date</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedPayment.completionTime 
                      ? new Date(selectedPayment.completionTime).toLocaleString()
                      : new Date(selectedPayment.date).toLocaleString()}
                  </p>
                </div>
                {selectedPayment.checkInTime && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Check-in Time</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {new Date(selectedPayment.checkInTime).toLocaleString()}
                    </p>
                  </div>
                )}
                {selectedPayment.completionTime && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Completion Time</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {new Date(selectedPayment.completionTime).toLocaleString()}
                    </p>
                  </div>
                )}
                {selectedPayment.assignedWasher && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Assigned Washer</p>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedPayment.assignedWasher}</p>
                  </div>
                )}
                {selectedPayment.remarks && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Remarks</p>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedPayment.remarks}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={handleDetailsModalClose}
              >
                Close
              </Button>
              {selectedPayment.status === 'pending' && (
                <Button
                  onClick={() => {
                    handleMarkAsPaid(selectedPayment.id);
                    handleDetailsModalClose();
                  }}
                >
                  Mark as Paid
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PaymentHistoryPage; 