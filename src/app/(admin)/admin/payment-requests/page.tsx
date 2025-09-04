"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Badge from '@/components/ui/badge/Badge';
import Button from '@/components/ui/button/Button';
import { useAuth } from '../../../../context/AuthContext';

interface PaymentRequest {
  id: string;
  washer_id: string;
  admin_id?: string;
  approval_date?: string;
  total_earnings: number;
  material_deductions: number;
  tool_deductions: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  amount: number;
  washer: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
}

const AdminPaymentRequestsPage: React.FC = () => {
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'pay'>('approve');
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const { user } = useAuth();

  const fetchPaymentRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/payment-requests?sortBy=created_at&sortOrder=desc');
      
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

  const handleAction = (request: PaymentRequest, type: 'approve' | 'reject' | 'pay') => {
    setSelectedRequest(request);
    setActionType(type);
    setAdminNotes(request.admin_notes || '');
    setShowActionModal(true);
  };

  const submitAction = async () => {
    if (!selectedRequest || !user?.id) return;

    try {
      setProcessing(true);
      
      const response = await fetch(`/api/admin/payment-requests/${selectedRequest.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: actionType === 'approve' ? 'approved' : actionType === 'reject' ? 'rejected' : 'paid',
          adminNotes: adminNotes || null,
          reviewedBy: user.id
        }),
      });

      const result = await response.json();

      if (result.success) {
        setShowActionModal(false);
        setSelectedRequest(null);
        setAdminNotes('');
        await fetchPaymentRequests();
        alert(`Payment request ${actionType}d successfully!`);
      } else {
        alert(result.error || `Failed to ${actionType} payment request`);
      }
    } catch (err) {
      console.error(`Error ${actionType}ing payment request:`, err);
      alert(`Failed to ${actionType} payment request`);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'info';
      case 'rejected': return 'error';
      case 'paid': return 'success';
      default: return 'primary';
    }
  };

  const getStatusCount = (status: string) => {
    return paymentRequests.filter(req => req.status === status).length;
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
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-2">Error</div>
          <div className="text-gray-600">{error}</div>
          <button 
            onClick={fetchPaymentRequests}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Payment Requests Management</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Review and manage payment requests from car washers
        </p>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
            {getStatusCount('pending')}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Pending</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-info-600 dark:text-info-400 mb-2">
            {getStatusCount('approved')}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Approved</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">
            {getStatusCount('rejected')}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Rejected</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
            {getStatusCount('paid')}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Paid</div>
        </div>
      </div>

      {/* Payment Requests List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            All Payment Requests
          </h2>
          
          {paymentRequests.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 dark:text-gray-400 mb-2">No payment requests found</div>
              <div className="text-sm text-gray-400">Payment requests will appear here when workers submit them</div>
            </div>
          ) : (
            <div className="space-y-4">
              {paymentRequests.map((request) => (
                <div
                  key={request.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        Worker ID: {request.washer_id.slice(0, 8)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Requested: {new Date(request.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge color={getStatusColor(request.status)}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Total Earnings</div>
                      <div className="font-semibold text-green-600 dark:text-green-400">
                        ₦{request.total_earnings.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Material Deductions</div>
                      <div className="font-semibold text-red-600 dark:text-red-400">
                        ₦{request.material_deductions.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Tool Deductions</div>
                      <div className="font-semibold text-red-600 dark:text-red-400">
                        ₦{request.tool_deductions.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Net Amount</div>
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        ₦{request.amount.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                    <div className="flex gap-2">
                      {request.status === 'pending' && (
                        <>
                          <Button
                            onClick={() => handleAction(request, 'approve')}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            Approve
                          </Button>
                          <Button
                            onClick={() => handleAction(request, 'reject')}
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      
                      {request.status === 'approved' && (
                        <Button
                          onClick={() => handleAction(request, 'pay')}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Mark as Paid
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {request.admin_notes && (
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Admin Notes:</div>
                      <div className="text-gray-900 dark:text-white">{request.admin_notes}</div>
                    </div>
                  )}
                  
                  {request.approval_date && (
                    <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      {request.status === 'approved' ? 'Approved' : request.status === 'rejected' ? 'Rejected' : 'Paid'}: {new Date(request.approval_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action Modal */}
      {showActionModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {actionType === 'approve' ? 'Approve' : actionType === 'reject' ? 'Reject' : 'Mark as Paid'} Payment Request
            </h3>
            
            <div className="mb-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Worker ID: <span className="font-semibold">{selectedRequest.washer_id.slice(0, 8)}</span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Amount: <span className="font-semibold">₦{selectedRequest.amount.toLocaleString()}</span>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Admin Notes
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder={`Add notes for ${actionType}ing this request...`}
                rows={3}
              />
            </div>
            
            <div className="flex space-x-3 pt-4">
              <Button
                onClick={submitAction}
                disabled={processing}
                className={`flex-1 ${
                  actionType === 'approve' 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : actionType === 'reject'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {processing ? 'Processing...' : actionType === 'approve' ? 'Approve' : actionType === 'reject' ? 'Reject' : 'Mark as Paid'}
              </Button>
              <Button
                onClick={() => {
                  setShowActionModal(false);
                  setSelectedRequest(null);
                  setAdminNotes('');
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPaymentRequestsPage;
