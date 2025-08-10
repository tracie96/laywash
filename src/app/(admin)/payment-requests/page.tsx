"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Badge from '@/components/ui/badge/Badge';
import Button from '@/components/ui/button/Button';

interface PaymentRequest {
  id: string;
  washerId: string;
  washerName: string;
  requestedAmount: number;
  requestType: 'salary' | 'bonus' | 'overtime' | 'advance';
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  requestDate: string;
  periodStart?: string;
  periodEnd?: string;
  description?: string;
  notes?: string;
  reviewedBy?: string;
  reviewerName?: string;
  reviewedAt?: string;
  adminNotes?: string;
  approvedAmount?: number;
  paymentMethod?: string;
  paymentReference?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

const PaymentRequestsPage: React.FC = () => {
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    requestedAmount: '',
    requestType: 'salary' as PaymentRequest['requestType'],
    periodStart: '',
    periodEnd: '',
    description: '',
    notes: ''
  });
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Get current user ID (car washer)
  // TODO: Replace with actual auth integration
  const getCurrentUserId = () => {
    // Example: const { user } = useAuth(); return user?.id;
    return 'current-user-id'; // Replace with actual implementation
  };

  const fetchPaymentRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const washerId = getCurrentUserId();
      const response = await fetch(`/api/admin/payment-requests?washerId=${washerId}&sortBy=request_date&sortOrder=desc`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch payment requests');
      }
      
      const result = await response.json();
      
      if (result.success) {
        setPaymentRequests(result.paymentRequests);
      } else {
        setError(result.error || 'Failed to load payment requests');
      }
    } catch (err) {
      console.error('Error fetching payment requests:', err);
      setError('Failed to load payment requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPaymentRequests();
  }, [fetchPaymentRequests]);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.requestedAmount || parseFloat(formData.requestedAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      setFormSubmitting(true);
      
      const washerId = getCurrentUserId();
      const response = await fetch('/api/admin/payment-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          washerId,
          requestedAmount: parseFloat(formData.requestedAmount),
          requestType: formData.requestType,
          periodStart: formData.periodStart || null,
          periodEnd: formData.periodEnd || null,
          description: formData.description || null,
          notes: formData.notes || null
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Reset form and close modal
        setFormData({
          requestedAmount: '',
          requestType: 'salary',
          periodStart: '',
          periodEnd: '',
          description: '',
          notes: ''
        });
        setShowCreateForm(false);
        
        // Refresh the list
        await fetchPaymentRequests();
        
        alert('Payment request created successfully!');
      } else {
        alert(result.error || 'Failed to create payment request');
      }
    } catch (err) {
      console.error('Error creating payment request:', err);
      alert('Failed to create payment request');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    if (!confirm('Are you sure you want to cancel this payment request?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/payment-requests/${requestId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        await fetchPaymentRequests(); // Refresh the list
        alert('Payment request cancelled successfully');
      } else {
        alert(result.error || 'Failed to cancel payment request');
      }
    } catch (err) {
      console.error('Error cancelling payment request:', err);
      alert('Failed to cancel payment request');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning' as const;
      case 'approved': return 'info' as const;
      case 'rejected': return 'error' as const;
      case 'paid': return 'success' as const;
      default: return 'primary' as const;
    }
  };

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case 'salary': return 'Salary';
      case 'bonus': return 'Bonus';
      case 'overtime': return 'Overtime';
      case 'advance': return 'Advance';
      default: return type;
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
        <Button onClick={fetchPaymentRequests}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Payment Requests
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Request payments for your work and track their status
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={fetchPaymentRequests} className="bg-gray-600 hover:bg-gray-700">
            Refresh
          </Button>
          <Button onClick={() => setShowCreateForm(true)} className="bg-blue-600 hover:bg-blue-700">
            New Request
          </Button>
        </div>
      </div>

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Create Payment Request
            </h2>
            
            <form onSubmit={handleCreateRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Request Type
                </label>
                <select
                  value={formData.requestType}
                  onChange={(e) => setFormData(prev => ({ ...prev, requestType: e.target.value as PaymentRequest['requestType'] }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                >
                  <option value="salary">Salary</option>
                  <option value="bonus">Bonus</option>
                  <option value="overtime">Overtime</option>
                  <option value="advance">Advance</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Requested Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.requestedAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, requestedAmount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Period Start (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.periodStart}
                    onChange={(e) => setFormData(prev => ({ ...prev, periodStart: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Period End (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.periodEnd}
                    onChange={(e) => setFormData(prev => ({ ...prev, periodEnd: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the request"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes or justification"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={formSubmitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {formSubmitting ? 'Creating...' : 'Create Request'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Requests List */}
      <div className="space-y-4">
        {paymentRequests.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 shadow-sm border border-gray-200 dark:border-gray-700 text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-4">No payment requests found</p>
            <Button onClick={() => setShowCreateForm(true)} className="bg-blue-600 hover:bg-blue-700">
              Create Your First Request
            </Button>
          </div>
        ) : (
          paymentRequests.map((request) => (
            <div key={request.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Request Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {getRequestTypeLabel(request.requestType)} Request
                    </h3>
                    <Badge color={getStatusColor(request.status)}>
                      {request.status.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                    <div>
                      <span className="font-medium">Amount:</span> ${request.requestedAmount}
                    </div>
                    <div>
                      <span className="font-medium">Requested:</span> {new Date(request.requestDate).toLocaleDateString()}
                    </div>
                    {request.periodStart && request.periodEnd && (
                      <div>
                        <span className="font-medium">Period:</span> {new Date(request.periodStart).toLocaleDateString()} - {new Date(request.periodEnd).toLocaleDateString()}
                      </div>
                    )}
                    {request.approvedAmount && (
                      <div>
                        <span className="font-medium">Approved:</span> ${request.approvedAmount}
                      </div>
                    )}
                    {request.reviewerName && (
                      <div>
                        <span className="font-medium">Reviewed by:</span> {request.reviewerName}
                      </div>
                    )}
                    {request.paidAt && (
                      <div>
                        <span className="font-medium">Paid:</span> {new Date(request.paidAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  
                  {request.description && (
                    <div className="mb-2">
                      <span className="font-medium text-gray-700 dark:text-gray-300">Description:</span>
                      <p className="text-gray-600 dark:text-gray-400 mt-1">{request.description}</p>
                    </div>
                  )}
                  
                  {request.notes && (
                    <div className="mb-2">
                      <span className="font-medium text-gray-700 dark:text-gray-300">Notes:</span>
                      <p className="text-gray-600 dark:text-gray-400 mt-1">{request.notes}</p>
                    </div>
                  )}
                  
                  {request.adminNotes && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                      <span className="font-medium text-blue-800 dark:text-blue-300">Admin Notes:</span>
                      <p className="text-blue-700 dark:text-blue-200 mt-1">{request.adminNotes}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 lg:w-auto">
                  {request.status === 'pending' && (
                    <Button
                      onClick={() => handleCancelRequest(request.id)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Cancel Request
                    </Button>
                  )}
                  
                  {request.status === 'approved' && (
                    <div className="text-center">
                      <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                        ✓ Approved
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Awaiting payment
                      </p>
                    </div>
                  )}
                  
                  {request.status === 'paid' && (
                    <div className="text-center">
                      <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                        ✓ Paid
                      </p>
                      {request.paymentMethod && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          via {request.paymentMethod}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {request.status === 'rejected' && (
                    <div className="text-center">
                      <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                        ✗ Rejected
                      </p>
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

export default PaymentRequestsPage;

