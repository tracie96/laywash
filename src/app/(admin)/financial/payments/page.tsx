"use client";
import React, { useState, useEffect } from "react";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";

interface CarWashPayment {
  id: string;
  customerName: string;
  amount: number;
  date: string;
  status: "completed" | "pending" | "failed" | "cancelled";
  paymentMethod: string;
  serviceType: string;
  licensePlate?: string;
  vehicleType?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  checkInTime?: string;
  completionTime?: string;
  customerId?: string;
  assignedWasherId?: string;
  assignedAdminId?: string;
  remarks?: string;
}

interface SalesTransaction {
  id: string;
  customer_id?: string;
  customer_name?: string;
  total_amount: number;
  payment_method?: string;
  admin_id: string;
  status: string;
  created_at: string;
  remarks?: string;
  // Inventory tracking fields
  inventory_id?: string;
  inventory_name?: string;
  quantity_sold?: number;
  inventory?: {
    id: string;
    name: string;
    category: string;
    unit: string;
  };
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

interface PaymentRecord {
  id: string;
  type: 'car_wash' | 'sales_transaction';
  customerName: string;
  amount: number;
  date: string;
  status: "completed" | "pending" | "failed" | "cancelled";
  paymentMethod: string;
  serviceType: string;
  licensePlate?: string;
  vehicleType?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  checkInTime?: string;
  completionTime?: string;
  customerId?: string;
  assignedWasherId?: string;
  assignedAdminId?: string;
  assignedAdminName?: string;
  remarks?: string;
  transactionType?: string;
  // Product sales fields
  productName?: string;
  productCategory?: string;
  productQuantity?: number;
  productUnit?: string;
}

// Function to fetch admin names and create a mapping
const fetchAdminNames = async (): Promise<Record<string, string>> => {
  try {
    const response = await fetch('/api/admin/admins');
    const data = await response.json();
    
    if (data.success && data.admins) {
      const adminMap: Record<string, string> = {};
      data.admins.forEach((admin: { id: string; name: string }) => {
        adminMap[admin.id] = admin.name;
      });
      return adminMap;
    }
    return {};
  } catch (error) {
    console.error('Error fetching admin names:', error);
    return {};
  }
};

const FinancialPaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'car_wash' | 'sales_transaction'>('all');
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Period options
  const periodOptions = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'quarter', label: 'This Quarter' },
  ];

  // Handle period change
  const handlePeriodChange = (newPeriod: string) => {
    setSelectedPeriod(newPeriod);
    if (newPeriod === 'custom') {
      const today = new Date();
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
      setCustomStartDate(lastMonth.toISOString().split('T')[0]);
      setCustomEndDate(today.toISOString().split('T')[0]);
    }
  };

  // Filter payments by date range
  const filterPaymentsByDate = (payments: PaymentRecord[]) => {
    if (selectedPeriod === 'custom') {
      if (!customStartDate || !customEndDate) return payments;
      const startDate = new Date(customStartDate);
      const endDate = new Date(customEndDate);
      endDate.setHours(23, 59, 59, 999);
      
      return payments.filter(payment => {
        const paymentDate = new Date(payment.date);
        return paymentDate >= startDate && paymentDate <= endDate;
      });
    }

    const now = new Date();
    let startDate: Date;
    let endDate = new Date(now);

    switch (selectedPeriod) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'yesterday':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
        break;
      case 'week':
        startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      default:
        return payments;
    }

    return payments.filter(payment => {
      const paymentDate = new Date(payment.date);
      return paymentDate >= startDate && paymentDate <= endDate;
    });
  };

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch admin names first
        const adminNames = await fetchAdminNames();
        
        const [carWashResponse, salesResponse] = await Promise.all([
          fetch('/api/admin/payments'),
          fetch('/api/admin/sales-transactions')
        ]);
        
        const carWashData = await carWashResponse.json();
        const salesData = await salesResponse.json();
        
        if (carWashData.success && salesData.success) {
          console.log('Car wash data received:', carWashData);
          console.log('Sales data received:', salesData);
          
          // Transform car wash data
          const carWashPayments = carWashData.payments?.map((payment: CarWashPayment) => ({
            ...payment,
            type: 'car_wash' as const,
            transactionType: 'Car Wash Service',
            assignedAdminName: payment.assignedAdminId ? adminNames[payment.assignedAdminId] || 'Unknown Admin' : undefined
          })) || [];
          
          console.log('Transformed car wash payments:', carWashPayments);
          
          // Transform sales data
          const salesPayments = salesData.transactions?.map((transaction: SalesTransaction) => {
            console.log('Raw transaction data:', transaction);
            console.log('Customer data:', {
              customer_id: transaction.customer_id,
              customer_name: transaction.customer_name,
              customer_object: transaction.customer
            });
            return {
            id: transaction.id,
            type: 'sales_transaction' as const,
            customerName: transaction.customer?.name || transaction.customer_name || 'Walk-in Customer',
            amount: transaction.total_amount,
            date: transaction.created_at,
            status: transaction.status,
            paymentMethod: transaction.payment_method || 'Not specified',
            serviceType: 'Product Sales',
            customerId: transaction.customer_id,
            assignedAdminId: transaction.admin_id,
            assignedAdminName: transaction.admin_id ? adminNames[transaction.admin_id] || 'Unknown Admin' : undefined,
            remarks: transaction.remarks,
            transactionType: 'Product Sale',
            // Product information
            productName: transaction.inventory?.name || transaction.inventory_name || 'Unknown Product',
            productCategory: transaction.inventory?.category || 'General',
            productQuantity: transaction.quantity_sold || 0,
            productUnit: transaction.inventory?.unit || 'units',
            inventoryId: transaction.inventory_id
          };
          }) || [];
          
          console.log('Transformed sales payments:', salesPayments);
          
          // Combine and sort by date
          const allPayments = [...carWashPayments, ...salesPayments]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          
          console.log('Combined payments:', allPayments);
          setPayments(allPayments);
        } else {
          // Handle partial success - if one API fails, still show data from the other
          console.log('Partial API success - car wash:', carWashData.success, 'sales:', salesData.success);
          let allPayments: PaymentRecord[] = [];
          
          if (carWashData.success) {
            console.log('Car wash API succeeded, processing data...');
            const carWashPayments = carWashData.payments?.map((payment: CarWashPayment) => ({
              ...payment,
              type: 'car_wash' as const,
              transactionType: 'Car Wash Service',
              assignedAdminName: payment.assignedAdminId ? adminNames[payment.assignedAdminId] || 'Unknown Admin' : undefined
            })) || [];
            console.log('Car wash payments from partial success:', carWashPayments);
            allPayments = [...allPayments, ...carWashPayments];
          }
          
          if (salesData.success) {
            console.log('Sales API succeeded, processing data...');
            const salesPayments = salesData.transactions?.map((transaction: SalesTransaction) => ({
              id: transaction.id,
              type: 'sales_transaction' as const,
              customerName: transaction.customer?.name || transaction.customer_name || 'Walk-in Customer',
              amount: transaction.total_amount,
              date: transaction.created_at,
              status: transaction.status === 'completed' ? 'completed' : 'pending',
              paymentMethod: transaction.payment_method || 'Not specified',
              serviceType: 'Product Sales',
              customerId: transaction.customer_id,
              assignedAdminId: transaction.admin_id,
              assignedAdminName: transaction.admin_id ? adminNames[transaction.admin_id] || 'Unknown Admin' : undefined,
              remarks: transaction.remarks,
              transactionType: 'Product Sale'
            })) || [];
            console.log('Sales payments from partial success:', salesPayments);
            allPayments = [...allPayments, ...salesPayments];
          }
          
          if (allPayments.length > 0) {
            allPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            console.log('Final combined payments from partial success:', allPayments);
            setPayments(allPayments);
          } else {
            console.log('No payments data available from either API');
            setError('Failed to fetch payment data from both sources');
          }
        }
      } catch (err) {
        console.error('Error fetching payments:', err);
        console.log('Error details:', {
          message: err instanceof Error ? err.message : 'Unknown error',
          stack: err instanceof Error ? err.stack : undefined
        });
        setError('Failed to fetch payments from server');
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-light-100 text-green-light-800 dark:bg-green-light-900/30 dark:text-green-light-300";
      case "pending":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
      case "failed":
        return "bg-error-100 text-error-800 dark:bg-error-900/30 dark:text-error-300";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "car_wash":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "sales_transaction":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
    }
  };

  // Filter payments based on selected type and date
  const filteredPayments = (() => {
    const filtered = filterType === 'all' 
      ? payments 
      : payments.filter(p => p.type === filterType);
    
    return filterPaymentsByDate(filtered);
  })();

  const totalRevenue = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const completedPayments = filteredPayments.filter(p => p.status === "completed").length;
  const pendingPayments = filteredPayments.filter(p => p.status === "pending").length;
  const cancelledPayments = filteredPayments.filter(p => p.status === "cancelled").length;
  const carWashCount = filteredPayments.filter(p => p.type === 'car_wash').length;
  const salesCount = filteredPayments.filter(p => p.type === 'sales_transaction').length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-light-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading payments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 text-xl mb-4">⚠️</div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageBreadCrumb pageTitle="Payment History" />

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Filter Transactions</h2>
           <div className="flex space-x-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filterType === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('car_wash')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filterType === 'car_wash'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Car Wash Only
            </button>
            <button
              onClick={() => setFilterType('sales_transaction')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filterType === 'sales_transaction'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Sales Only
            </button>
          </div>
        </div>
      </div>

      {/* Period Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Period Selector */}
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Period:</label>
            <select
              value={selectedPeriod}
              onChange={(e) => handlePeriodChange(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              {periodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Date Range Inputs */}
          {selectedPeriod === 'custom' && (
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Custom Date Range:</label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
                <span className="text-gray-600 dark:text-gray-400 flex items-center">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">₦ {totalRevenue.toFixed(2)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {filteredPayments.length} transactions
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{completedPayments}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {filteredPayments.length > 0 ? ((completedPayments / filteredPayments.length) * 100).toFixed(1) : 0}% success rate
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingPayments}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {filteredPayments.length > 0 ? ((pendingPayments / filteredPayments.length) * 100).toFixed(1) : 0}% pending
              </p>
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
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Cancelled</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{cancelledPayments}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {filteredPayments.length > 0 ? ((cancelledPayments / filteredPayments.length) * 100).toFixed(1) : 0}% cancelled
              </p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Car Washes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{carWashCount}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {filteredPayments.length > 0 ? ((carWashCount / filteredPayments.length) * 100).toFixed(1) : 0}% of total
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Car Wash Metrics */}
      {filterType === 'car_wash' && carWashCount > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">
            Car Wash Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg. Car Wash Value</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${(filteredPayments.filter(p => p.type === 'car_wash').reduce((sum, p) => sum + p.amount, 0) / carWashCount).toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                  <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Product Sales</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{salesCount}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {filteredPayments.length > 0 ? ((salesCount / filteredPayments.length) * 100).toFixed(1) : 0}% of total
                  </p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Today&apos;s Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${filteredPayments
                      .filter(p => new Date(p.date).toDateString() === new Date().toDateString())
                      .reduce((sum, p) => sum + p.amount, 0)
                      .toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Sales Summary */}
      {filterType === 'sales_transaction' && salesCount > 0 && (
        <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-4">
            Product Sales Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg. Sale Value</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ₦{(filteredPayments.filter(p => p.type === 'sales_transaction').reduce((sum, p) => sum + p.amount, 0) / salesCount).toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Products Sold</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {filteredPayments
                      .filter(p => p.type === 'sales_transaction' && p.productQuantity)
                      .reduce((sum, p) => sum + (p.productQuantity || 0), 0)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">units sold</p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Top Product Category</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {(() => {
                      const categories = filteredPayments
                        .filter(p => p.type === 'sales_transaction' && p.productCategory)
                        .reduce((acc: Record<string, number>, p) => {
                          acc[p.productCategory!] = (acc[p.productCategory!] || 0) + (p.productQuantity || 0);
                          return acc;
                        }, {});
                      const topCategory = Object.keys(categories).reduce((a, b) => 
                        categories[a] > categories[b] ? a : b, 'General'
                      );
                      return topCategory;
                    })()}
                  </p>
                </div>
                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                  <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payments Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Transaction History</h2>
        </div>
        <div className="overflow-x-auto">
          {filteredPayments.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 dark:text-gray-500 text-4xl mb-4">📋</div>
              <p className="text-gray-600 dark:text-gray-400">No transactions found</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Transactions will appear here once customers complete their services or purchases.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vehicle</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Services</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payment Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Washer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Admin</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredPayments.map((payment) => (
                  <tr key={`${payment.type}-${payment.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(payment.type)}`}>
                        {payment.type === 'car_wash' ? 'Car Wash' : 'Product Sale'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {payment.customerName}
                      </div>
                      {payment.customerId && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          ID: {payment.customerId}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {payment.type === 'car_wash' && payment.licensePlate ? (
                        <div className="text-sm">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {payment.licensePlate}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {payment.vehicleColor} {payment.vehicleType}
                            {payment.vehicleModel && ` • ${payment.vehicleModel}`}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {payment.serviceType}
                      </div>
                      {payment.type === 'sales_transaction' && payment.productName ? (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <div className="font-medium">{payment.productName}</div>
                          <div>
                            {payment.productQuantity} {payment.productUnit}
                            {payment.productCategory && ` • ${payment.productCategory}`}
                          </div>
                        </div>
                      ) : payment.type === 'car_wash' && payment.remarks ? (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {payment.remarks}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      ₦ {payment.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {new Date(payment.date).toLocaleDateString()}
                      </div>
                      {payment.type === 'car_wash' && payment.checkInTime && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(payment.checkInTime).toLocaleTimeString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {payment.paymentMethod}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {payment.type === 'car_wash' && payment.assignedWasherId ? (
                        <div className="text-sm text-gray-900 dark:text-white">
                          Washer #{payment.assignedWasherId.slice(0, 8)}...
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {payment.assignedAdminName ? (
                        <div className="text-sm text-gray-900 dark:text-white">
                          {payment.assignedAdminName}
                        </div>
                      ) : payment.assignedAdminId ? (
                        <div className="text-sm text-gray-900 dark:text-white">
                          Admin #{payment.assignedAdminId.slice(0, 8)}...
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinancialPaymentsPage; 