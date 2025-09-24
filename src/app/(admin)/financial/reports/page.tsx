"use client";
import React, { useState, useEffect, useCallback } from "react";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import { Modal } from "@/components/ui/modal";
import { useModal } from "@/hooks/useModal";
import AddExpenseModal from "@/components/admin/AddExpenseModal";

interface FinancialReport {
  id: string;
  period: string;
  date: string;
  
  // Revenue breakdown
  totalRevenue: number;
  carWashRevenue: number;
  productSalesRevenue: number;
  
  // Expense breakdown
  totalExpenses: number;
  washerSalaries: number;
  washerBonuses: number;
  customerBonuses: number;
  
  // Worker Wages
  totalWages: number; // Workers Pay - sum of total_earnings from car_washer_profiles
  pendingWages: number; // Amount Paid - sum of approved payment requests
  
  // Net profit
  netProfit: number;
  profitMargin: number;
  
  // Metrics
  customerCount: number;
  transactionCount: number;
  carWashCount: number;
  productSaleCount: number;
  averageTransaction: number;
}

const FinancialReportsPage: React.FC = () => {
  const [reports, setReports] = useState<FinancialReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('6');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [locations, setLocations] = useState<Array<{id: string, address: string, lga: string}>>([]);
  const [selectedReport, setSelectedReport] = useState<FinancialReport | null>(null);
  const { isOpen, openModal, closeModal } = useModal();
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

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

  const fetchFinancialReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        period: selectedPeriod,
        ...(selectedLocation !== 'all' && { location: selectedLocation })
      });
      
      const response = await fetch(`/api/admin/financial-reports?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setReports(data.reports);
      } else {
        setError(data.error || 'Failed to fetch financial reports');
      }
    } catch (err) {
      console.error('Error fetching financial reports:', err);
      setError('Failed to fetch financial reports from server');
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, selectedLocation]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  useEffect(() => {
    fetchFinancialReports();
  }, [fetchFinancialReports]);

  // Calculate totals across all periods
  const totals = reports.reduce((acc, report) => ({
    totalRevenue: acc.totalRevenue + report.totalRevenue,
    carWashRevenue: acc.carWashRevenue + report.carWashRevenue,
    productSalesRevenue: acc.productSalesRevenue + report.productSalesRevenue,
    totalExpenses: acc.totalExpenses + report.totalExpenses,
    washerSalaries: acc.washerSalaries + report.washerSalaries,
    washerBonuses: acc.washerBonuses + report.washerBonuses,
    customerBonuses: acc.customerBonuses + report.customerBonuses,
    totalWages: acc.totalWages + report.totalWages,
    pendingWages: acc.pendingWages + report.pendingWages,
    netProfit: acc.netProfit + report.netProfit,
    customerCount: Math.max(acc.customerCount, report.customerCount), // Max per period
    transactionCount: acc.transactionCount + report.transactionCount,
    carWashCount: acc.carWashCount + report.carWashCount,
    productSaleCount: acc.productSaleCount + report.productSaleCount
  }), {
    totalRevenue: 0,
    carWashRevenue: 0,
    productSalesRevenue: 0,
    totalExpenses: 0,
    washerSalaries: 0,
    washerBonuses: 0,
    customerBonuses: 0,
    totalWages: 0,
    pendingWages: 0,
    netProfit: 0,
    customerCount: 0,
    transactionCount: 0,
    carWashCount: 0,
    productSaleCount: 0
  });

  const overallProfitMargin = totals.totalRevenue > 0 ? (totals.netProfit / totals.totalRevenue) * 100 : 0;

  const handleViewDetails = (report: FinancialReport) => {
    setSelectedReport(report);
    openModal();
  };

  const handleExpenseAdded = () => {
    fetchFinancialReports(); // Refresh reports when expense is added
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-light-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading financial reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageBreadCrumb pageTitle="Financial Reports" />
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error loading financial reports</h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={fetchFinancialReports}
                className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 px-3 py-1 rounded-md text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageBreadCrumb pageTitle="Financial Reports" />

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Report Filters</h3>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              + Add Expense
            </button>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Period:</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="3">Last 3 Months</option>
                <option value="6">Last 6 Months</option>
                <option value="12">Last 12 Months</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Location:</label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Locations</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.address} - {location.lga}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">₦ {totals.totalRevenue.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-green-light-100 dark:bg-green-light-900/30 rounded-lg">
              <svg className="w-6 h-6 text-green-light-600 dark:text-green-light-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Car Wash:</span>
              <span className="text-green-600 dark:text-green-400">₦ {totals.carWashRevenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Product Sales:</span>
              <span className="text-green-600 dark:text-green-400">₦ {totals.productSalesRevenue.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">₦ {totals.totalExpenses.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-error-100 dark:bg-error-900/30 rounded-lg">
              <svg className="w-6 h-6 text-error-600 dark:text-error-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
         
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Company Income</p>
              <p className={`text-2xl font-bold ${totals.netProfit >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-error-600 dark:text-error-400'}`}>
                ₦ {totals.netProfit.toFixed(2)}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${totals.netProfit >= 0 ? 'bg-blue-light-100 dark:bg-blue-light-900/30' : 'bg-error-100 dark:bg-error-900/30'}`}>
              <svg className={`w-6 h-6 ${totals.netProfit >= 0 ? 'text-blue-light-600 dark:text-blue-light-400' : 'text-error-600 dark:text-error-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Profit Margin:</span>
              <span className={`font-medium ${overallProfitMargin >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-error-600 dark:text-error-400'}`}>
                {overallProfitMargin.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Transactions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totals.transactionCount}</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Car Washes:</span>
              <span className="text-purple-600 dark:text-purple-400">{totals.carWashCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Product Sales:</span>
              <span className="text-purple-600 dark:text-purple-400">{totals.productSaleCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Worker Wages Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Workers Pay</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">₦ {totals.totalWages.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Sum of total_earnings from all worker profiles
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Amount Paid</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">₦ {totals.pendingWages.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Sum of approved payment requests (status = &apos;paid&apos;)
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <button
          onClick={fetchFinancialReports}
          className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
        <button className="bg-green-light-600 hover:bg-green-light-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200">
          Export Report
        </button>
      </div>

      {/* Detailed Reports Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Monthly Financial Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          {reports.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto h-12 w-12 text-gray-400">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No financial reports found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Financial reports will appear here once you have payment data.
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Period</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Expenses</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Companny Income</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Margin</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Transactions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {report.period}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="text-green-600 dark:text-green-400 font-medium">
                          ₦ {report.totalRevenue.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          CW: ₦ {report.carWashRevenue.toFixed(2)} | PS: ₦ {report.productSalesRevenue.toFixed(2)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="text-error-600 dark:text-error-400 font-medium">
                          ₦ {report.totalExpenses.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          WS: ₦ {report.washerSalaries.toFixed(2)} | WB: ₦ {report.washerBonuses.toFixed(2)} | CB: ₦ {report.customerBonuses.toFixed(2)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${report.netProfit >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-error-600 dark:text-error-400'}`}>
                            ₦ {report.netProfit.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${report.profitMargin >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-error-600 dark:text-error-400'}`}>
                        {report.profitMargin.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        <div>Total: {report.transactionCount}</div>
                        <div className="text-xs">
                          CW: {report.carWashCount} | PS: {report.productSaleCount}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <button 
                        onClick={() => handleViewDetails(report)}
                        className="text-green-light-600 hover:text-green-light-500 dark:text-green-light-400 dark:hover:text-green-light-300"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Report Details Modal */}
      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        className="max-w-4xl p-6"
      >
        {selectedReport && (
          <div className="space-y-6">
            <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                Financial Report Details
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {selectedReport.period} - {selectedReport.date}
              </p>
            </div>

            {/* Revenue Section */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-4">
                Revenue Breakdown
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    ₦ {selectedReport.totalRevenue.toFixed(2)}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Car Wash Revenue</p>
                  <p className="text-xl font-semibold text-green-600 dark:text-green-400">
                    ₦ {selectedReport.carWashRevenue.toFixed(2)}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Product Sales Revenue</p>
                  <p className="text-xl font-semibold text-green-600 dark:text-green-400">
                    ₦ {selectedReport.productSalesRevenue.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Expenses Section */}
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-4">
                Expense Breakdown
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    ₦ {selectedReport.totalExpenses.toFixed(2)}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Washer Salaries</p>
                  <p className="text-xl font-semibold text-red-600 dark:text-red-400">
                    ₦ {selectedReport.washerSalaries.toFixed(2)}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Washer Bonuses</p>
                  <p className="text-xl font-semibold text-red-600 dark:text-red-400">
                    ₦ {selectedReport.washerBonuses.toFixed(2)}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Customer Bonuses</p>
                  <p className="text-xl font-semibold text-red-600 dark:text-red-400">
                    ₦ {selectedReport.customerBonuses.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Worker Wages Section */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-4">
                Worker Wages
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Workers Pay</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    ₦ {selectedReport.totalWages.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Sum of total_earnings from all worker profiles
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Amount Paid</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    ₦ {selectedReport.pendingWages.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Sum of approved payment requests (status = &apos;paid&apos;)
                  </p>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                Performance Metrics
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-700 rounded-lg p-4">  
                  <p className="text-sm text-gray-600 dark:text-gray-400">Company Profit</p>
                  <p className={`text-2xl font-bold ${selectedReport.netProfit >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                    ₦ {selectedReport.netProfit.toFixed(2)}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Profit Margin</p>
                  <p className={`text-2xl font-bold ${selectedReport.profitMargin >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                    {selectedReport.profitMargin.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Transactions</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {selectedReport.transactionCount}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Average Transaction</p>
                  <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    ₦ {selectedReport.averageTransaction.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Transaction Breakdown */}
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-purple-800 dark:text-purple-200 mb-4">
                Transaction Breakdown
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Car Washes</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {selectedReport.carWashCount}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Product Sales</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {selectedReport.productSaleCount}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Customers</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {selectedReport.customerCount}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  // Here you could add export functionality for individual reports
                  console.log('Export report for:', selectedReport.period);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-green-light-600 hover:bg-green-light-700 rounded-lg transition-colors"
              >
                Export This Report
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Expense Modal */}
      <AddExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onExpenseAdded={handleExpenseAdded}
      />
    </div>
  );
};

export default FinancialReportsPage; 