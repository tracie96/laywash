"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Button from '@/components/ui/button/Button';
import { useAuth } from '@/context/AuthContext';
import AddExpenseModal from '@/components/admin/AddExpenseModal';
import { Modal } from '@/components/ui/modal';

interface Expense {
  id: string;
  service_type: 'checkin' | 'salary' | 'sales' | 'expenses' | 'free_will' | 'deposit_to_bank_carwash' | 'deposit_to_bank_sales' | 'deposit_to_bank' | 'other';
  amount: number;
  reason: string;
  description?: string;
  admin_id?: string;
  admin?: {
    id: string;
    name: string;
    email: string;
  };
  check_in_id?: string;
  check_in?: {
    id: string;
    license_plate: string;
    total_amount: number;
  };
  location_id?: string;
  location?: {
    id: string;
    address: string;
  };
  expense_date: string;
  created_at: string;
  updated_at: string;
}

interface Location {
  id: string;
  address: string;
  lga: string;
}

const CashOutPage: React.FC = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  
  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  console.log(user);
  
  // Filters
  const [selectedServiceType, setSelectedServiceType] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Set default date range to last 30 days
  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, []);

  // Fetch locations
  const fetchLocations = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/locations');
      const data = await response.json();
      
      if (data.success) {
        setLocations(data.locations || []);
      }
    } catch (err) {
      console.error('Error fetching locations:', err);
    }
  }, []);

  // Fetch expenses
  const fetchExpenses = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      
      if (startDate && endDate) {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }
      
      if (selectedServiceType !== 'all') {
        params.append('serviceType', selectedServiceType);
      }
      
      if (selectedLocation !== 'all') {
        params.append('locationId', selectedLocation);
      }
      
      const response = await fetch(`/api/admin/expenses?${params.toString()}`, {
        headers: {
          'X-Admin-ID': user.id,
        },
      });
      const data = await response.json();
      
      if (data.success) {
        setExpenses(data.expenses || []);
      } else {
        setError(data.error || 'Failed to fetch expenses');
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
      setError('Failed to fetch expenses');
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, selectedServiceType, selectedLocation, user?.id]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  useEffect(() => {
    if (startDate && endDate) {
      fetchExpenses();
    }
  }, [fetchExpenses, startDate, endDate]);

  const handleExpenseAdded = () => {
    fetchExpenses();
  };

  // Handle delete expense
  const handleDeleteClick = (expense: Expense) => {
    setExpenseToDelete(expense);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!expenseToDelete || !user?.id) return;

    try {
      setIsDeleting(true);

      const response = await fetch(`/api/admin/expenses/${expenseToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-ID': user.id,
        },
      });

      const result = await response.json();

      if (result.success) {
        // Remove the deleted expense from the list
        setExpenses(prev => prev.filter(exp => exp.id !== expenseToDelete.id));
        setIsDeleteModalOpen(false);
        setExpenseToDelete(null);
        
        // Show success message
        alert('Expense deleted successfully!');
      } else {
        throw new Error(result.error || 'Failed to delete expense');
      }
    } catch (err) {
      console.error('Error deleting expense:', err);
      alert(`Failed to delete expense: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
    setExpenseToDelete(null);
  };

  // Calculate totals
  const totals = expenses.reduce((acc, expense) => {
    acc.total += expense.amount;
    acc.byType[expense.service_type] = (acc.byType[expense.service_type] || 0) + expense.amount;
    return acc;
  }, {
    total: 0,
    byType: {} as Record<string, number>
  });

  // Get display reason for expense
  const getDisplayReason = (expense: Expense): string => {
    // if (expense.service_type === 'deposit_to_bank') {
    //   return 'Add cash to the bank';
    // }
    return expense.reason;
  };

  // Get service type label
  const getServiceTypeLabel = (serviceType: string): string => {
    const labels: Record<string, string> = {
      checkin: 'Check-in',
      salary: 'Salary',
      sales: 'Sales',
      expenses: 'Expenses',
      free_will: 'Free Will',
      deposit_to_bank_carwash: 'Bank Deposit (CW)',
      deposit_to_bank_sales: 'Bank Deposit (Sales)',
      deposit_to_bank: 'Bank Deposit',
      other: 'Other'
    };
    return labels[serviceType] || serviceType;
  };

  // Export to CSV
  const exportToCSV = () => {
    if (expenses.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = [
      'Date',
      'Service Type',
      'Amount',
      'Reason',
      'Location',
      'Check-In',
    ];
    
    const csvContent = [
      headers.join(','),
      ...expenses.map(expense => [
        new Date(expense.expense_date).toLocaleDateString(),
        getServiceTypeLabel(expense.service_type),
        expense.amount.toFixed(2),
        `"${getDisplayReason(expense)}"`,
        `"${expense.description || ''}"`,
        expense.admin?.name || 'N/A',
        expense.location?.address || 'N/A',
        expense.check_in?.license_plate || 'N/A',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `cashout-expenses-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading expenses...</p>
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
              Error loading expenses
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <Button onClick={fetchExpenses} variant="outline">
              Try Again
            </Button>
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
            Cash Out (Expenses)
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Track and manage all business expenses
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setIsExpenseModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            + Add Cash Out
          </Button>
          <Button
            onClick={exportToCSV}
            className="bg-green-600 hover:bg-green-700"
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Service Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Service Type
            </label>
            <select
              value={selectedServiceType}
              onChange={(e) => setSelectedServiceType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Types</option>

              <option value="expenses">Expenses</option>
              <option value="deposit_to_bank_sales">Bank Deposit for Sales</option>
              <option value="deposit_to_bank_carwash">Bank Deposit for Carwash</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Location Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Location
            </label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Locations</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.address} - {location.lga}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        {/* Refresh Button */}
        <div className="mt-4 flex justify-end">
          <Button
            onClick={fetchExpenses}
            variant="outline"
            className="px-4 py-2"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Expenses */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Expenses
              </p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                ₦ {(totals.byType.expenses || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Bank Deposit for CW */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Bank Deposit for CW
              </p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                ₦ {(totals.byType.deposit_to_bank_carwash || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Bank Deposit for Sales */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Bank Deposit for Sales
              </p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                ₦ {(totals.byType.deposit_to_bank_sales || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>

        {/* Others */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Others
              </p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                ₦ {((totals.byType.checkin || 0) + (totals.byType.salary || 0) + (totals.byType.sales || 0) + (totals.byType.free_will || 0) + (totals.byType.deposit_to_bank || 0) + (totals.byType.other || 0)).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Expense Records
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Service Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Reason
                </th>
               
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No expenses found
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      No expense records were found for the selected filters.
                    </p>
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <div>
                        <div className="font-medium">
                          {new Date(expense.expense_date).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(expense.expense_date).toLocaleTimeString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        expense.service_type === 'expenses' 
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                          : expense.service_type === 'deposit_to_bank_carwash'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                          : expense.service_type === 'deposit_to_bank_sales'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
                          : expense.service_type === 'deposit_to_bank'
                          ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-200'
                          : expense.service_type === 'salary'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200'
                          : expense.service_type === 'checkin'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
                          : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200'
                      }`}>
                        {getServiceTypeLabel(expense.service_type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600 dark:text-red-400">
                      ₦ {expense.amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {getDisplayReason(expense)}
                    </td>
                  
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {expense.location?.address || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleDeleteClick(expense)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                        title="Delete expense"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      <AddExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onExpenseAdded={handleExpenseAdded}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteCancel}
        className="max-w-md mx-4"
      >
        <div className="p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full">
            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 text-center">
            Delete Expense
          </h3>
          
          <p className="text-gray-600 dark:text-gray-400 mb-4 text-center">
            Are you sure you want to delete this expense? This action cannot be undone.
          </p>
          
          {expenseToDelete && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    ₦ {expenseToDelete.amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Type:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {getServiceTypeLabel(expenseToDelete.service_type)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Date:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {new Date(expenseToDelete.expense_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={handleDeleteCancel}
              className="flex-1"
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CashOutPage;
