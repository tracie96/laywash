"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Badge from '@/components/ui/badge/Badge';
import Button from '@/components/ui/button/Button';
import { Modal } from '@/components/ui/modal';
import { useModal } from '@/hooks/useModal';
import { useAuth } from '../../../context/AuthContext';

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

const PaymentRequestsPage: React.FC = () => {
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isOpen: showCreateForm, openModal: openCreateForm, closeModal: closeCreateForm } = useModal();
  const [currentEarnings, setCurrentEarnings] = useState(0);
  
  // Form state
  const [formData, setFormData] = useState({
    requestedAmount: '',
    materialDeductions: '0',
    toolDeductions: '0',
    notes: ''
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [calculatedDeductions, setCalculatedDeductions] = useState({
    materialDeductions: 0,
    toolDeductions: 0,
    totalDeductions: 0
  });
  const [unreturnedItems, setUnreturnedItems] = useState<Array<{
    id: string;
    toolName: string;
    toolType: string;
    quantity: number;
    amount: number;
    totalValue: number;
    assignedDate: string;
    notes?: string;
  }>>([]);
  const [hasUnreturnedTools, setHasUnreturnedTools] = useState(false);

  const { user } = useAuth();

  const fetchPaymentRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user?.id) {
        setError('User not authenticated');
        return;
      }
      
      const washerId = user.id;
      const response = await fetch(`/api/admin/payment-requests?washerId=${washerId}&sortBy=created_at&sortOrder=desc`);
      
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
  }, [user?.id]);

  const fetchCurrentEarnings = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(`/api/worker/earnings?workerId=${user.id}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setCurrentEarnings(result.totalEarnings || 0);
        }
      }
    } catch (err) {
      console.error('Error fetching current earnings:', err);
    }
  }, [user?.id]);

  const fetchCalculatedDeductions = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(`/api/admin/calculate-deductions?washerId=${user.id}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setCalculatedDeductions(result.deductions);
          setUnreturnedItems(result.unreturnedItems);
          setHasUnreturnedTools(result.hasUnreturnedTools || false);
          
          // Update form data with calculated deductions
          setFormData(prev => ({
            ...prev,
            materialDeductions: result.deductions.materialDeductions.toString(),
            toolDeductions: result.deductions.toolDeductions.toString()
          }));
          
          // Also update the calculated deductions state
          setCalculatedDeductions(result.deductions);
        }
      }
    } catch (err) {
      console.error('Error fetching calculated deductions:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchPaymentRequests();
    fetchCurrentEarnings();
    fetchCalculatedDeductions();
  }, [fetchPaymentRequests, fetchCurrentEarnings, fetchCalculatedDeductions]);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if there are unreturned tools
    if (hasUnreturnedTools) {
      alert('❌ Cannot create payment request. You must return all assigned tools first.');
      return;
    }
    
    const requestedAmount = parseFloat(formData.requestedAmount);
    const materialDeductions = calculatedDeductions.materialDeductions;
    const toolDeductions = calculatedDeductions.toolDeductions;
    
    if (!requestedAmount || requestedAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const totalRequested = requestedAmount + materialDeductions + toolDeductions;
    if (totalRequested > currentEarnings) {
      alert(`Requested amount (₦${totalRequested}) exceeds available earnings (₦${currentEarnings})`);
      return;
    }

    try {
      setFormSubmitting(true);
      
      if (!user?.id) {
        alert('User not authenticated');
        return;
      }
      
      const washerId = user.id;
      const response = await fetch('/api/admin/payment-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          washerId,
          requestedAmount,
          materialDeductions,
          toolDeductions,
          notes: formData.notes || null
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Reset form and close modal
        setFormData({
          requestedAmount: '',
          materialDeductions: calculatedDeductions.materialDeductions.toString(),
          toolDeductions: calculatedDeductions.toolDeductions.toString(),
          notes: ''
        });
        closeCreateForm();
        
        // Refresh the list and earnings
        await fetchPaymentRequests();
        await fetchCurrentEarnings();
        await fetchCalculatedDeductions(); // Refresh deductions to update unreturned tools status
        
        alert('Payment request created successfully!');
      } else {
        // Show more detailed error message for unreturned tools
        if (result.error && result.error.includes('return all assigned tools')) {
          alert(`❌ ${result.error}\n\nPlease return all tools before creating a payment request.`);
        } else {
          alert(result.error || 'Failed to create payment request');
        }
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Payment Requests</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your payment requests and track their status
          </p>
        </div>
        
        {/* Current Earnings Display */}
        <div className="text-right">
          <div className="text-sm text-gray-600 dark:text-gray-400">Available Earnings</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            ₦{currentEarnings.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="mb-6">
        {hasUnreturnedTools && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Cannot Create Payment Request
                </h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  <p>You must return all assigned tools before creating a payment request.</p>
                  <p className="mt-1">Unreturned tools: {unreturnedItems.map(item => item.toolName).join(', ')}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <Button
          onClick={openCreateForm}
          disabled={hasUnreturnedTools}
          className={`${hasUnreturnedTools 
            ? 'bg-gray-400 cursor-not-allowed text-gray-200' 
            : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {hasUnreturnedTools ? 'Return Tools First' : 'Create Payment Request'}
        </Button>
      </div>

      {/* Payment Requests List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Your Payment Requests
          </h2>
          
          {paymentRequests.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 dark:text-gray-400 mb-2">No payment requests yet</div>
              <div className="text-sm text-gray-400">Create your first payment request to get started</div>
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
                        Payment Request #{request.id.slice(0, 8)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Created: {new Date(request.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge color={getStatusColor(request.status)}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
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
                  </div>
                  
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Net Amount</div>
                        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          ₦{request.amount.toLocaleString()}
                        </div>
                      </div>
                      
                      {request.status === 'pending' && (
                        <Button
                          onClick={() => handleCancelRequest(request.id)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          Cancel Request
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
                      Approved: {new Date(request.approval_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Request Modal */}
      <Modal
        isOpen={showCreateForm}
        onClose={closeCreateForm}
        className="max-w-md p-6"
      >

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Create Payment Request
            </h3>

            {/* Deductions Summary */}
            {calculatedDeductions.totalDeductions > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium mb-1">⚠️ Deductions Applied</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>Material: ₦{calculatedDeductions.materialDeductions.toLocaleString()}</div>
                        <div>Tools: ₦{calculatedDeductions.toolDeductions.toLocaleString()}</div>
                      </div>
                      <div className="font-medium mt-1 text-yellow-900 dark:text-yellow-100">
                        Total Deductions: ₦{calculatedDeductions.totalDeductions.toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={fetchCalculatedDeductions}
                      className="text-xs px-2 py-1 bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded hover:bg-yellow-300 dark:hover:bg-yellow-700"
                      title="Refresh deductions"
                    >
                      🔄
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            <form onSubmit={handleCreateRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Requested Amount (₦)
                </label>
                <input
                  type="number"
                  value={formData.requestedAmount}
                  onChange={(e) => setFormData({ ...formData, requestedAmount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Enter amount"
                  min="0"
                  max={currentEarnings}
                  required
                />
                <div className="text-xs text-gray-500 mt-1">
                  Available: ₦{currentEarnings.toLocaleString()}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Material Deductions (₦)
                </label>
                <div className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">
                  ₦{calculatedDeductions.materialDeductions.toLocaleString()}
                </div>
                {unreturnedItems.filter(item => item.toolType === 'material' || item.toolType === 'supply').length > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    Based on {unreturnedItems.filter(item => item.toolType === 'material' || item.toolType === 'supply').length} unreturned material(s)
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tool Deductions (₦)
                </label>
                <div className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">
                  ₦{calculatedDeductions.toolDeductions.toLocaleString()}
                </div>
                {unreturnedItems.filter(item => item.toolType !== 'material' && item.toolType !== 'supply').length > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    Based on {unreturnedItems.filter(item => item.toolType !== 'material' && item.toolType !== 'supply').length} unreturned tool(s)
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Add any additional notes..."
                  rows={3}
                />
              </div>

              {/* Unreturned Items Details */}
              {(unreturnedItems.length > 0) && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Unreturned Items (Total: ₦{calculatedDeductions.totalDeductions.toLocaleString()})
                  </h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {unreturnedItems.map((item) => (
                      <div key={item.id} className="flex justify-between items-center text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded">
                        <div>
                          <span className="font-medium">{item.toolName}</span>
                          <span className="text-gray-500 ml-2">({item.toolType})</span>
                        </div>
                        <div className="text-right">
                          <div>Qty: {item.quantity}</div>
                          <div className="text-red-600">₦{item.totalValue.toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex space-x-3 pt-4">
                <Button
                  type="submit"
                  disabled={formSubmitting || hasUnreturnedTools}
                  className={`flex-1 ${hasUnreturnedTools 
                    ? 'bg-gray-400 cursor-not-allowed text-gray-200' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {formSubmitting ? 'Creating...' : hasUnreturnedTools ? 'Return Tools First' : 'Create Request'}
                </Button>
                <Button
                  type="button"
                  onClick={closeCreateForm}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
      </Modal>
    </div>
  );
};

export default PaymentRequestsPage;

