"use client";
import React, { useState, useEffect } from "react";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";

interface CarWashPayment {
  id: string;
  customerName: string;
  amount: number;
  date: string;
  status: "completed" | "pending" | "failed";
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
  total_amount: number;
  payment_method?: string;
  admin_id: string;
  status: string;
  created_at: string;
  remarks?: string;
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
  status: "completed" | "pending" | "failed";
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
  transactionType?: string;
}

const FinancialPaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'car_wash' | 'sales_transaction'>('all');

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch both car wash payments and sales transactions
        const [carWashResponse, salesResponse] = await Promise.all([
          fetch('/api/admin/payments'),
          fetch('/api/admin/sales-transactions')
        ]);
        
        const carWashData = await carWashResponse.json();
        const salesData = await salesResponse.json();
        
        if (carWashData.success && salesData.success) {
          // Transform car wash data
          const carWashPayments = carWashData.payments?.map((payment: CarWashPayment) => ({
            ...payment,
            type: 'car_wash' as const,
            transactionType: 'Car Wash Service'
          })) || [];
          
          // Transform sales data
          const salesPayments = salesData.transactions?.map((transaction: SalesTransaction) => ({
            id: transaction.id,
            type: 'sales_transaction' as const,
            customerName: transaction.customer?.name || 'Walk-in Customer',
            amount: transaction.total_amount,
            date: transaction.created_at,
            status: transaction.status === 'completed' ? 'completed' : 'pending',
            paymentMethod: transaction.payment_method || 'Not specified',
            serviceType: 'Product Sales',
            customerId: transaction.customer_id,
            assignedAdminId: transaction.admin_id,
            remarks: transaction.remarks,
            transactionType: 'Product Sale'
          })) || [];
          
          // Combine and sort by date
          const allPayments = [...carWashPayments, ...salesPayments]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          
          setPayments(allPayments);
        } else {
          // Handle partial success - if one API fails, still show data from the other
          let allPayments: PaymentRecord[] = [];
          
          if (carWashData.success) {
            const carWashPayments = carWashData.payments?.map((payment: CarWashPayment) => ({
              ...payment,
              type: 'car_wash' as const,
              transactionType: 'Car Wash Service'
            })) || [];
            allPayments = [...allPayments, ...carWashPayments];
          }
          
          if (salesData.success) {
            const salesPayments = salesData.transactions?.map((transaction: SalesTransaction) => ({
              id: transaction.id,
              type: 'sales_transaction' as const,
              customerName: transaction.customer?.name || 'Walk-in Customer',
              amount: transaction.total_amount,
              date: transaction.created_at,
              status: transaction.status === 'completed' ? 'completed' : 'pending',
              paymentMethod: transaction.payment_method || 'Not specified',
              serviceType: 'Product Sales',
              customerId: transaction.customer_id,
              assignedAdminId: transaction.admin_id,
              remarks: transaction.remarks,
              transactionType: 'Product Sale'
            })) || [];
            allPayments = [...allPayments, ...salesPayments];
          }
          
          if (allPayments.length > 0) {
            allPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setPayments(allPayments);
          } else {
            setError('Failed to fetch payment data from both sources');
          }
        }
      } catch (err) {
        console.error('Error fetching payments:', err);
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

  // Filter payments based on selected type
  const filteredPayments = filterType === 'all' 
    ? payments 
    : payments.filter(p => p.type === filterType);

  const totalRevenue = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const completedPayments = filteredPayments.filter(p => p.status === "completed").length;
  const pendingPayments = filteredPayments.filter(p => p.status === "pending").length;
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

      {/* Filter Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex space-x-1">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'all'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            All Transactions
          </button>
          <button
            onClick={() => setFilterType('car_wash')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'car_wash'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Car Wash Services
          </button>
          <button
            onClick={() => setFilterType('sales_transaction')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'sales_transaction'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Product Sales
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">${totalRevenue.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-green-light-100 dark:bg-green-light-900/30 rounded-lg">
              <svg className="w-6 h-6 text-green-light-600 dark:text-green-light-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            </div>
            <div className="p-3 bg-blue-light-100 dark:bg-blue-light-900/30 rounded-lg">
              <svg className="w-6 h-6 text-blue-light-600 dark:text-blue-light-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Car Washes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{carWashCount}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Product Sales</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{salesCount}</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payment Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Service/Product</th>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {payment.customerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      ${payment.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(payment.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {payment.paymentMethod}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {payment.serviceType}
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