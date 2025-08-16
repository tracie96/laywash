"use client";
import React, { useState, useCallback, useEffect } from "react";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";

interface StockReport {
  id: string;
  itemName: string;
  category: string;
  currentStock: number;
  minimumStock: number;
  reorderPoint: number;
  lastRestocked: string;
  usageRate: number;
  status: "in_stock" | "low_stock" | "out_of_stock";
  cost: number;
}

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  minStockLevel: number;
  price?: number;
  costPerUnit?: number;
  lastRestocked?: string;
  lastUpdated?: string;
}

const StockReportsPage: React.FC = () => {
  const [reports, setReports] = useState<StockReport[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStockReports = useCallback(async () => {
    console.log('Fetching stock reports...');
    try {
      setLoading(true);
      
      const response = await fetch('/api/admin/inventory?sortBy=name&sortOrder=asc');
      const data = await response.json();
      console.log('Stock reports API response:', data);

      if (data.success && data.inventory && Array.isArray(data.inventory)) {
        // Transform inventory data to stock reports format
        const stockReports: StockReport[] = data.inventory.map((item: InventoryItem) => {
          // Calculate status based on current stock vs minimum stock
          let status: "in_stock" | "low_stock" | "out_of_stock";
          if (item.currentStock === 0) {
            status = "out_of_stock";
          } else if (item.currentStock <= item.minStockLevel) {
            status = "low_stock";
          } else {
            status = "in_stock";
          }

          // Calculate usage rate (mock calculation for now)
          const usageRate = Math.floor(Math.random() * 10) + 1; // Random 1-10 items per day

          return {
            id: item.id,
            itemName: item.name,
            category: item.category,
            currentStock: item.currentStock,
            minimumStock: item.minStockLevel,
            reorderPoint: item.minStockLevel + 5, // Set reorder point 5 above minimum
            lastRestocked: item.lastRestocked || item.lastUpdated || new Date().toISOString().split('T')[0],
            usageRate,
            status,
            cost: item.price || item.costPerUnit || 0
          };
        });
        
        console.log('Transformed stock reports:', stockReports);
        setReports(stockReports);
      } else {
        console.error('Failed to fetch inventory data:', data.error || 'No inventory data found');
        console.error('Data structure:', data);
        setReports([]);
      }
    } catch (error) {
      console.error('Error fetching stock reports:', error);
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStockReports();
  }, [fetchStockReports]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in_stock":
        return "bg-green-light-100 text-green-light-800 dark:bg-green-light-900/30 dark:text-green-light-300";
      case "low_stock":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
      case "out_of_stock":
        return "bg-error-100 text-error-800 dark:bg-error-900/30 dark:text-error-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
    }
  };

  const getStockLevelColor = (current: number, minimum: number) => {
    const percentage = (current / minimum) * 100;
    if (percentage >= 150) return "text-green-600 dark:text-green-400";
    if (percentage >= 100) return "text-orange-600 dark:text-orange-400";
    return "text-error-600 dark:text-error-400";
  };

  const totalItems = reports.length;
  const lowStockItems = reports.filter(r => r.status === "low_stock" || r.status === "out_of_stock").length;
  const totalValue = reports.reduce((sum, report) => sum + (report.cost * report.currentStock), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-light-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading stock reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageBreadCrumb pageTitle="Stock Reports" />

      {/* Header with Refresh Button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Stock Reports
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Real-time inventory status and stock management
          </p>
        </div>
        <button
          onClick={fetchStockReports}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Refreshing...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </>
          )}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Items</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalItems}</p>
            </div>
            <div className="p-3 bg-blue-light-100 dark:bg-blue-light-900/30 rounded-lg">
              <svg className="w-6 h-6 text-blue-light-600 dark:text-blue-light-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Low Stock Items</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{lowStockItems}</p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Stock Value</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">${totalValue.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-green-light-100 dark:bg-green-light-900/30 rounded-lg">
              <svg className="w-6 h-6 text-green-light-600 dark:text-green-light-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Reports Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Stock Reports</h2>
        </div>
        <div className="overflow-x-auto">
          {reports.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 dark:text-gray-500 text-4xl mb-4">📦</div>
              <p className="text-gray-600 dark:text-gray-400">No stock items found</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                The inventory appears to be empty. Please check if items have been added to the inventory.
              </p>
            </div>
          ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Item Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Current Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Minimum Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reorder Point</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Usage Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Restocked</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {report.itemName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {report.category}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getStockLevelColor(report.currentStock, report.minimumStock)}`}>
                    {report.currentStock}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {report.minimumStock}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {report.reorderPoint}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {report.usageRate}/day
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(report.lastRestocked).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(report.status)}`}>
                      {report.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex space-x-2">
                      <button className="text-blue-light-600 hover:text-blue-light-500 dark:text-blue-light-400 dark:hover:text-blue-light-300">
                        Restock
                      </button>
                      <button className="text-green-light-600 hover:text-green-light-500 dark:text-green-light-400 dark:hover:text-green-light-300">
                        History
                      </button>
                    </div>
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

export default StockReportsPage; 