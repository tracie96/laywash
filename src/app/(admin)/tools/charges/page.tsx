"use client";
  import React, { useState, useCallback } from "react";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import Button from '@/components/ui/button/Button';

interface ToolCharge {
  id: string;
  toolName: string;
  workerName: string;
  workerId: string;
  chargeAmount: number;
  reason: string;
  date: string;
  status: "pending" | "paid" | "disputed" | "approved" | "rejected";
  replacementCost: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateChargeForm {
  toolName: string;
  workerId: string;
  workerName: string;
  chargeAmount: number;
  reason: string;
  replacementCost: number;
  notes: string;
}

const ToolsChargesPage: React.FC = () => {
  const [charges, setCharges] = useState<ToolCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid' | 'disputed' | 'approved' | 'rejected'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'chargeAmount' | 'toolName' | 'workerName' | 'status' | 'createdAt'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateChargeForm>({
    toolName: '',
    workerId: '',
    workerName: '',
    chargeAmount: 0,
    reason: '',
    replacementCost: 0,
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchCharges = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      
      const response = await fetch(`/api/admin/tool-charges?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setCharges(data.charges);
      } else {
        setError(data.error || 'Failed to fetch charges');
      }
    } catch {
      console.error('Error fetching charges');
      setError('Failed to fetch charges from server');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterStatus, sortBy, sortOrder]);

  const handleCreateCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createForm.toolName || !createForm.workerId || !createForm.workerName || !createForm.reason) {
      setError('Please fill in all required fields');
      return;
    }

    if (createForm.chargeAmount < 0 || createForm.replacementCost < 0) {
      setError('Please enter valid numeric values');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/tool-charges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createForm),
      });

      const data = await response.json();

      if (data.success) {
        setShowCreateModal(false);
        setCreateForm({
          toolName: '',
          workerId: '',
          workerName: '',
          chargeAmount: 0,
          reason: '',
          replacementCost: 0,
          notes: ''
        });
        fetchCharges(); // Refresh the list
      } else {
        setError(data.error || 'Failed to create charge');
      }
    } catch {
      setError('Failed to create charge');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChargeAction = async (chargeId: string, action: 'approve' | 'reject' | 'mark-paid' | 'dispute' | 'delete') => {
    try {
      if (action === 'delete') {
        const response = await fetch(`/api/admin/tool-charges/${chargeId}`, {
          method: 'DELETE',
        });
        const data = await response.json();
        
        if (data.success) {
          fetchCharges(); // Refresh the list
        } else {
          setError(data.error || 'Failed to delete charge');
        }
      } else {
        let newStatus: string;
        
        switch (action) {
          case 'approve':
            newStatus = 'approved';
            break;
          case 'reject':
            newStatus = 'rejected';
            break;
          case 'mark-paid':
            newStatus = 'paid';
            break;
          case 'dispute':
            newStatus = 'disputed';
            break;
          default:
            return;
        }

        const response = await fetch(`/api/admin/tool-charges/${chargeId}`, {
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
          fetchCharges(); // Refresh the list
        } else {
          setError(data.error || 'Failed to update charge');
        }
      }
    } catch {
      setError('Failed to perform action');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
      case "paid":
        return "bg-green-light-100 text-green-light-800 dark:bg-green-light-900/30 dark:text-green-light-300";
      case "disputed":
        return "bg-error-100 text-error-800 dark:bg-error-900/30 dark:text-error-300";
      case "approved":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
    }
  };

  const totalCharges = charges.length;
  const pendingCharges = charges.filter(c => c.status === "pending").length;
  const totalAmount = charges.reduce((sum, charge) => sum + charge.chargeAmount, 0);
  const disputedCharges = charges.filter(c => c.status === "disputed").length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-light-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading charges...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageBreadCrumb pageTitle="Lost Tool Charges" />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Charges</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCharges}</p>
            </div>
            <div className="p-3 bg-blue-light-100 dark:bg-blue-light-900/30 rounded-lg">
              <svg className="w-6 h-6 text-blue-light-600 dark:text-blue-light-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Charges</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingCharges}</p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">${totalAmount.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-error-100 dark:bg-error-900/30 rounded-lg">
              <svg className="w-6 h-6 text-error-600 dark:text-error-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Disputed Charges</p>
              <p className="text-2xl font-bold text-orange-600">{disputedCharges}</p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
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
              placeholder="Search by tool name, worker name, reason, or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Status Filter */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filterStatus === 'all'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              All Status
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filterStatus === 'pending'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilterStatus('paid')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filterStatus === 'paid'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Paid
            </button>
            <button
              onClick={() => setFilterStatus('disputed')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filterStatus === 'disputed'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Disputed
            </button>
          </div>

          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-green-light-600 hover:bg-green-light-700"
          >
            Add New Charge
          </Button>
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

      {/* Charges Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Lost Tool Charges</h2>
        </div>
        <div className="overflow-x-auto">
          {charges.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 dark:text-gray-500 text-4xl mb-4">💰</div>
              <p className="text-gray-600 dark:text-gray-400">No charges found</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                {searchTerm || filterStatus !== 'all'
                  ? 'Try adjusting your search or filters to see more results.'
                  : 'Add your first charge to get started.'
                }
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <button
                      onClick={() => {
                        setSortBy('toolName');
                        setSortOrder(sortBy === 'toolName' && sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      <span>Tool</span>
                      {sortBy === 'toolName' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <button
                      onClick={() => {
                        setSortBy('workerName');
                        setSortOrder(sortBy === 'workerName' && sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      <span>Worker</span>
                      {sortBy === 'workerName' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <button
                      onClick={() => {
                        setSortBy('chargeAmount');
                        setSortOrder(sortBy === 'chargeAmount' && sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      <span>Charge Amount</span>
                      {sortBy === 'chargeAmount' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <button
                      onClick={() => {
                        setSortBy('date');
                        setSortOrder(sortBy === 'date' && sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      <span>Date</span>
                      {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <button
                      onClick={() => {
                        setSortBy('status');
                        setSortOrder(sortBy === 'status' && sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      <span>Status</span>
                      {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Notes</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {charges.map((charge) => (
                  <tr key={charge.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {charge.toolName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {charge.workerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-error-600 dark:text-error-400 font-medium">
                      ${charge.chargeAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {charge.reason}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(charge.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(charge.status)}`}>
                        {charge.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                      {charge.notes}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {charge.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleChargeAction(charge.id, 'approve')}
                              className="text-green-600 hover:text-green-500 dark:text-green-400 dark:hover:text-green-300"
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleChargeAction(charge.id, 'reject')}
                              className="text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300"
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {charge.status === 'approved' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleChargeAction(charge.id, 'mark-paid')}
                            className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            Mark Paid
                          </Button>
                        )}
                        {charge.status !== 'paid' && charge.status !== 'rejected' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleChargeAction(charge.id, 'dispute')}
                            className="text-orange-600 hover:text-orange-500 dark:text-orange-400 dark:hover:text-orange-300"
                          >
                            Dispute
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleChargeAction(charge.id, 'delete')}
                          className="text-error-600 hover:text-error-500 dark:text-error-400 dark:hover:text-error-300"
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Charge Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add New Tool Charge</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateCharge} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tool Name
                </label>
                <input
                  type="text"
                  value={createForm.toolName}
                  onChange={(e) => setCreateForm({...createForm, toolName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter tool name"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Worker ID
                  </label>
                  <input
                    type="text"
                    value={createForm.workerId}
                    onChange={(e) => setCreateForm({...createForm, workerId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter worker ID"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Worker Name
                  </label>
                  <input
                    type="text"
                    value={createForm.workerName}
                    onChange={(e) => setCreateForm({...createForm, workerName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter worker name"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Charge Amount ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={createForm.chargeAmount}
                    onChange={(e) => setCreateForm({...createForm, chargeAmount: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Replacement Cost ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={createForm.replacementCost}
                    onChange={(e) => setCreateForm({...createForm, replacementCost: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reason
                </label>
                <input
                  type="text"
                  value={createForm.reason}
                  onChange={(e) => setCreateForm({...createForm, reason: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Lost during shift, Damaged beyond repair"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes
                </label>
                <textarea
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({...createForm, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-green-light-600 text-white rounded-lg hover:bg-green-light-700 disabled:bg-green-light-400 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Creating...' : 'Create Charge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolsChargesPage; 