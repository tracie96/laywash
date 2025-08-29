"use client";
import React, { useState, useCallback, useEffect } from 'react';
import Badge from '@/components/ui/badge/Badge';
import Button from '@/components/ui/button/Button';
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import { Modal } from '@/components/ui/modal';

interface StockItem {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  minStockLevel: number;
  maxStockLevel: number;
  unit: string;
  price: number;
  supplier: string;
  lastUpdated: string;
  lastRestocked: string;
  totalValue: number;
  isActive: boolean;
}

interface CreateStockForm {
  name: string;
  category: string;
  currentStock: number;
  minStockLevel: number;
  maxStockLevel: number;
  unit: string;
  price: number;
  supplier: string;
}

const StockInventoryPage: React.FC = () => {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'medium' | 'good'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'currentStock' | 'totalValue' | 'lastUpdated'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateStockForm>({
    name: '',
    category: '',
    currentStock: 0,
    minStockLevel: 0,
    maxStockLevel: 0,
    unit: '',
    price: 0,
    supplier: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [inventoryChangeNotification, setInventoryChangeNotification] = useState<string | null>(null);

  const fetchInventoy = useCallback(async () => {
    console.log('i got here')
    try {
      setIsLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filter !== 'all') params.append('status', filter);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      
      const response = await fetch(`/api/admin/inventory?${params.toString()}`);
      const data = await response.json();
      console.log({data})

      if (data.success) {
        setStockItems(data.inventory);
        setLastUpdateTime(new Date());
      } else {
        setError(data.error || 'Failed to fetch inventory');
      }
    } catch {
      console.error('Error fetching inventory');
      setError('Failed to fetch inventory from server');
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, filter, sortBy, sortOrder]);

  // Add useEffect to fetch data on mount and when dependencies change
  useEffect(() => {
    fetchInventoy();
  }, [fetchInventoy]);

  // Auto-refresh every 5 minutes to keep inventory up-to-date (only when page is active)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchInventoy();
    }, 300000); // Refresh every 5 minutes

    return () => clearInterval(interval);
  }, [fetchInventoy]);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createForm.name || !createForm.category || !createForm.unit || !createForm.supplier) {
      setError('Please fill in all required fields');
      return;
    }

    if (createForm.currentStock < 0 || createForm.minStockLevel < 0 || createForm.maxStockLevel < 0 || createForm.price <= 0) {
      setError('Please enter valid numeric values');
      return;
    }

    if (createForm.minStockLevel >= createForm.maxStockLevel) {
      setError('Minimum stock level must be less than maximum stock level');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/inventory', {
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
          name: '',
          category: '',
          currentStock: 0,
          minStockLevel: 0,
          maxStockLevel: 0,
          unit: '',
          price: 0,
          supplier: ''
        });
        fetchInventoy(); // Refresh the list
      } else {
        setError(data.error || 'Failed to create inventory item');
      }
    } catch {
      setError('Failed to create inventory item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStockUpdate = async (itemId: string, newStock: number) => {
    try {
      const response = await fetch(`/api/admin/inventory/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentStock: newStock
        }),
      });

      const data = await response.json();

      if (data.success) {
          fetchInventoy(); // Refresh the list
      } else {
        setError(data.error || 'Failed to update stock');
      }
    } catch {
      setError('Failed to update stock');
    }
  };

  const filteredAndSortedItems = stockItems
    .filter(item => {
      const matchesFilter = filter === 'all' || 
        (filter === 'low' && item.currentStock <= item.minStockLevel) ||
        (filter === 'medium' && item.currentStock > item.minStockLevel && item.currentStock <= item.minStockLevel * 2) ||
        (filter === 'good' && item.currentStock > item.minStockLevel * 2);
      
      const matchesSearch = searchTerm === '' || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.supplier.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesFilter && matchesSearch;
    });

  const calculateStats = () => {
    const stats = {
      total: stockItems.length,
      low: stockItems.filter(item => item.currentStock <= item.minStockLevel).length,
      medium: stockItems.filter(item => item.currentStock > item.minStockLevel && item.currentStock <= item.minStockLevel * 2).length,
      good: stockItems.filter(item => item.currentStock > item.minStockLevel * 2).length,
      totalValue: stockItems.reduce((sum, item) => sum + item.totalValue, 0),
      totalItems: stockItems.reduce((sum, item) => sum + item.currentStock, 0)
    };
    return stats;
  };

  const stats = calculateStats();

  const getStockStatus = (item: StockItem) => {
    if (item.currentStock <= item.minStockLevel) return 'low';
    if (item.currentStock <= item.minStockLevel * 2) return 'medium';
    return 'good';
  };

  const getStockStatusBadge = (status: string) => {
    switch (status) {
      case 'low':
        return <Badge color="error">Low Stock</Badge>;
      case 'medium':
        return <Badge color="warning">Medium</Badge>;
      case 'good':
        return <Badge color="success">Good</Badge>;
      default:
        return <Badge color="primary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageBreadCrumb pageTitle="Stock Inventory" />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Stock Inventory
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Comprehensive view of all inventory items
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
            Last updated: {lastUpdateTime.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            Add Item
          </Button>
          <Button
            onClick={() => window.location.href = '/stock/update'}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Update Stock
          </Button>
          <Button
            onClick={() => window.location.href = '/sales'}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Create Sale
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Items
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.total}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Low Stock Items
              </p>
              <p className="text-2xl font-bold text-red-600">
                {stats.low}
              </p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Value
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${stats.totalValue.toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Units
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalItems}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
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
              placeholder="Search by name, category, or supplier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Filter */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              All ({stats.total})
            </button>
            <button
              onClick={() => setFilter('low')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'low'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Low Stock ({stats.low})
            </button>
            <button
              onClick={() => setFilter('medium')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'medium'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Medium ({stats.medium})
            </button>
            <button
              onClick={() => setFilter('good')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'good'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Good ({stats.good})
            </button>
          </div>
        </div>
      </div>

      {/* Inventory Change Notification */}
      {inventoryChangeNotification && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-blue-800 dark:text-blue-200">{inventoryChangeNotification}</span>
            </div>
            <button
              onClick={() => setInventoryChangeNotification(null)}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

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

      {/* Inventory Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          {filteredAndSortedItems.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 dark:text-gray-500 text-4xl mb-4">📦</div>
              <p className="text-gray-600 dark:text-gray-400">No inventory items found</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                {searchTerm || filter !== 'all'
                  ? 'Try adjusting your search or filters to see more results.'
                  : 'Add your first inventory item to get started.'
                }
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <button
                      onClick={() => {
                        setSortBy('name');
                        setSortOrder(sortBy === 'name' && sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      <span>Item</span>
                      {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <button
                      onClick={() => {
                        setSortBy('currentStock');
                        setSortOrder(sortBy === 'currentStock' && sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      <span>Stock Level</span>
                      {sortBy === 'currentStock' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <button
                      onClick={() => {
                        setSortBy('totalValue');
                        setSortOrder(sortBy === 'totalValue' && sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      <span>Total Value</span>
                      {sortBy === 'totalValue' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAndSortedItems.map((item) => {
                  const status = getStockStatus(item);
                  
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {item.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {item.supplier}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {item.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {item.currentStock} {item.unit}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Min: {item.minStockLevel} | Max: {item.maxStockLevel}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        ${item.price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        ${item.totalValue.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStockStatusBadge(status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const newStock = prompt(`Enter new stock level for ${item.name}:`, item.currentStock.toString());
                              if (newStock !== null) {
                                const stock = parseInt(newStock);
                                if (!isNaN(stock) && stock >= 0) {
                                  handleStockUpdate(item.id, stock);
                                } else {
                                  setError('Please enter a valid number');
                                }
                              }
                            }}
                          >
                            Update Stock
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Item Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        className="w-full max-w-md mx-4"
      >
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add New Inventory Item</h3>
          </div>

          <form onSubmit={handleCreateItem} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Item Name
              </label>
              <input
                type="text"
                value={createForm.name}
                onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter item name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <input
                type="text"
                value={createForm.category}
                onChange={(e) => setCreateForm({...createForm, category: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Cleaning Supplies"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Stock
                </label>
                <input
                  type="number"
                  min="0"
                  value={createForm.currentStock}
                  onChange={(e) => setCreateForm({...createForm, currentStock: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Unit
                </label>
                <input
                  type="text"
                  value={createForm.unit}
                  onChange={(e) => setCreateForm({...createForm, unit: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Liters, Pieces"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Min Stock Level
                </label>
                <input
                  type="number"
                  min="0"
                  value={createForm.minStockLevel}
                  onChange={(e) => setCreateForm({...createForm, minStockLevel: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max Stock Level
                </label>
                <input
                  type="number"
                  min="0"
                  value={createForm.maxStockLevel}
                  onChange={(e) => setCreateForm({...createForm, maxStockLevel: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Price per Unit
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={createForm.price}
                  onChange={(e) => setCreateForm({...createForm, price: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Supplier
                </label>
                <input
                  type="text"
                  value={createForm.supplier}
                  onChange={(e) => setCreateForm({...createForm, supplier: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter supplier name"
                  required
                />
              </div>
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
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Creating...' : 'Create Item'}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};

export default StockInventoryPage; 