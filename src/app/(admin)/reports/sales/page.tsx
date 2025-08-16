"use client";
import React, { useState, useEffect, useCallback } from "react";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";

interface SalesReport {
  id: string;
  period: string;
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  topService: string;
  topWorker: string;
  date: string;
}

interface SalesData {
  id: string;
  customerName: string;
  totalAmount: number;
  paymentMethod: string;
  status: string;
  adminName: string;
  createdAt: string;
  items: Array<{
    name: string;
    category: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  remarks: string;
}

const SalesReportsPage: React.FC = () => {
  const [reports, setReports] = useState<SalesReport[]>([]);
  const [individualSales, setIndividualSales] = useState<SalesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'summary' | 'individual'>('individual');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [itemFilter, setItemFilter] = useState<string>('all');

  const fetchSalesData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      // Fetch sales data from the API
      const response = await fetch('/api/admin/sales');
      const data = await response.json();
      console.log(data);
      
              if (data.success && data.sales) {
          // Store individual sales for detailed view
          setIndividualSales(data.sales);
          
          // Also generate monthly reports for summary view
          const monthlyReports = generateMonthlyReports(data.sales);
          console.log('Generated monthly reports:', monthlyReports);
          setReports(monthlyReports);
        } else {
          const errorMsg = data.error || 'Failed to fetch sales data';
          console.error('Failed to fetch sales data:', errorMsg);
          
          // Check if it's a database schema issue
          if (errorMsg.includes('relationship') || errorMsg.includes('foreign key')) {
            setError('Database tables not set up yet. Please run the database schema first.');
          } else {
            setError(errorMsg);
          }
          setReports([]);
        }
    } catch (error) {
      console.error('Error fetching sales data:', error);
      setError('Failed to connect to server');
      setReports([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSalesData();
  }, [fetchSalesData]);

  const handleRefresh = () => {
    fetchSalesData(true);
  };

  const generateMonthlyReports = (salesData: SalesData[]): SalesReport[] => {
    if (!salesData || salesData.length === 0) {
      return [];
    }

    // Group sales by month
    const monthlyGroups = new Map<string, {
      sales: SalesData[];
      totalSales: number;
      totalOrders: number;
      services: Map<string, number>;
      workers: Map<string, number>;
    }>();

    salesData.forEach(sale => {
      const date = new Date(sale.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyGroups.has(monthKey)) {
        monthlyGroups.set(monthKey, {
          sales: [],
          totalSales: 0,
          totalOrders: 0,
          services: new Map(),
          workers: new Map()
        });
      }

      const monthData = monthlyGroups.get(monthKey)!;
      monthData.sales.push(sale);
      monthData.totalSales += sale.totalAmount;
      monthData.totalOrders += 1;

      // Count services
      sale.items.forEach(item => {
        const serviceName = item.name;
        monthData.services.set(serviceName, (monthData.services.get(serviceName) || 0) + item.quantity);
      });

      // Count workers (admins who processed sales)
      const workerName = sale.adminName;
      monthData.workers.set(workerName, (monthData.workers.get(workerName) || 0) + 1);
    });

    // Convert to reports array
    const reports: SalesReport[] = Array.from(monthlyGroups.entries()).map(([monthKey, data]) => {
      const [year, month] = monthKey.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      
      // Find top service
      let topService = 'N/A';
      let maxServiceCount = 0;
      data.services.forEach((count, service) => {
        if (count > maxServiceCount) {
          maxServiceCount = count;
          topService = service;
        }
      });

      // Find top worker
      let topWorker = 'N/A';
      let maxWorkerCount = 0;
      data.workers.forEach((count, worker) => {
        if (count > maxWorkerCount) {
          maxWorkerCount = count;
          topWorker = worker;
        }
      });

      return {
        id: monthKey,
        period: date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
        totalSales: data.totalSales,
        totalOrders: data.totalOrders,
        averageOrderValue: data.totalOrders > 0 ? data.totalSales / data.totalOrders : 0,
        topService: topService,
        topWorker: topWorker,
        date: date.toISOString().split('T')[0]
      };
    });

    // Sort by date (newest first)
    return reports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  // Filter individual sales based on selected filters
  const filteredSales = individualSales.filter(sale => {
    const saleDate = new Date(sale.createdAt);
    const saleMonth = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}`;
    
    const matchesMonth = monthFilter === 'all' || saleMonth === monthFilter;
    const matchesItem = itemFilter === 'all' || 
      sale.items.some(item => 
        item.name.toLowerCase().includes(itemFilter.toLowerCase()) ||
        item.category.toLowerCase().includes(itemFilter.toLowerCase())
      );
    
    return matchesMonth && matchesItem;
  });

  // Get available months for filter
  const availableMonths = Array.from(new Set(
    individualSales.map(sale => {
      const date = new Date(sale.createdAt);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    })
  )).sort().reverse();

  // Get available items for filter
  const availableItems = Array.from(new Set(
    individualSales.flatMap(sale => 
      sale.items.map(item => item.name)
    )
  )).filter(name => name !== 'Item Details Not Available');

  const totalSales = reports.reduce((sum, report) => sum + report.totalSales, 0);
  const totalOrders = reports.reduce((sum, report) => sum + report.totalOrders, 0);
  const averageOrderValue = reports.length > 0 ? reports.reduce((sum, report) => sum + report.averageOrderValue, 0) / reports.length : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-light-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading sales reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageBreadCrumb pageTitle="Sales Reports" />

      {/* Header with Refresh Button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Sales Reports
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Real-time sales analytics and performance metrics
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('summary')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'summary'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setViewMode('individual')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'individual'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Individual Sales
            </button>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {refreshing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Refreshing...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </>
          )}
        </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-red-800 dark:text-red-200">{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Additional help for database setup issues */}
          {error.includes('Database tables not set up') && (
            <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-700">
              <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                To fix this issue, you need to:
              </p>
              <ol className="text-sm text-red-700 dark:text-red-300 list-decimal list-inside space-y-1">
                <li>Run the database schema from <code className="bg-red-100 dark:bg-red-800 px-1 rounded">sales_schema.sql</code></li>
                <li>Or create the required tables manually in your Supabase dashboard</li>
                <li>Test the database connection using <code className="bg-red-100 dark:bg-red-800 px-1 rounded">/api/admin/sales/test</code></li>
              </ol>
            </div>
          )}
        </div>
      )}

      {/* Filters - Only show when viewing individual sales */}
      {viewMode === 'individual' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filter by Month
              </label>
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Months</option>
                {availableMonths.map(month => {
                  const [year, monthNum] = month.split('-');
                  const date = new Date(parseInt(year), parseInt(monthNum) - 1);
                  return (
                    <option key={month} value={month}>
                      {date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                    </option>
                  );
                })}
              </select>
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filter by Item
              </label>
              <select
                value={itemFilter}
                onChange={(e) => setItemFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Items</option>
                {availableItems.map(item => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Sales</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">${totalSales.toFixed(2)}</p>
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
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalOrders}</p>
            </div>
            <div className="p-3 bg-blue-light-100 dark:bg-blue-light-900/30 rounded-lg">
              <svg className="w-6 h-6 text-blue-light-600 dark:text-blue-light-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Average Order Value</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">${averageOrderValue.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Sales Data Table - Conditional based on view mode */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {viewMode === 'summary' ? 'Sales Reports (Monthly Summary)' : 'Individual Sales Transactions'}
          </h2>
        </div>
        <div className="overflow-x-auto">
          {viewMode === 'summary' ? (
            // Summary View - Monthly Reports
            reports.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-gray-400 dark:text-gray-500 text-4xl mb-4">📊</div>
                <p className="text-gray-600 dark:text-gray-400">No sales data available</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                  {error ? 'There was an error loading sales data.' : 'Start creating sales to see reports here.'}
                </p>
                {!error && (
                  <button
                    onClick={handleRefresh}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Refresh Data
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Period</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Sales</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Orders</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Average Order</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Top Service</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Top Worker</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {reports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {report.period}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400">
                        ${report.totalSales.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {report.totalOrders}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        ${report.averageOrderValue.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {report.topService}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {report.topWorker}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <button className="text-green-light-600 hover:text-green-light-500 dark:text-green-light-400 dark:hover:text-green-light-300">
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            // Individual Sales View
            filteredSales.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-gray-400 dark:text-gray-500 text-4xl mb-4">🛒</div>
                <p className="text-gray-600 dark:text-gray-400">No sales transactions found</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                  {error ? 'There was an error loading sales data.' : 'Try adjusting your filters or create some sales.'}
                </p>
                {!error && (
                  <button
                    onClick={handleRefresh}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Refresh Data
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Items</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payment Method</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Admin</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {new Date(sale.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {sale.customerName}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="space-y-1">
                          {sale.items.map((item, index) => (
                            <div key={index} className="text-xs">
                              <span className="font-medium">{item.name}</span>
                              <span className="text-gray-400"> × {item.quantity}</span>
                              <span className="text-green-600"> ${item.totalPrice}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600 dark:text-green-400">
                        ${sale.totalAmount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <span className="capitalize">{sale.paymentMethod}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {sale.adminName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          sale.status === 'completed' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                        }`}>
                          {sale.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesReportsPage; 