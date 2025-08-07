"use client";
import React, { useState, useEffect } from 'react';
import Badge from '@/components/ui/badge/Badge';
import Button from '@/components/ui/button/Button';

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
  lastUpdated: Date;
  lastRestocked: Date;
  totalValue: number;
}

const StockInventoryPage: React.FC = () => {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'medium' | 'good'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'currentStock' | 'totalValue' | 'lastUpdated'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Mock stock data
  useEffect(() => {
    const mockStockItems: StockItem[] = [
      {
        id: '1',
        name: 'Car Wash Soap',
        category: 'Cleaning Supplies',
        currentStock: 25,
        minStockLevel: 10,
        maxStockLevel: 50,
        unit: 'Liters',
        price: 15.99,
        supplier: 'ABC Supplies',
        lastUpdated: new Date(),
        lastRestocked: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 1 week ago
        totalValue: 399.75
      },
      {
        id: '2',
        name: 'Microfiber Towels',
        category: 'Cleaning Supplies',
        currentStock: 8,
        minStockLevel: 15,
        maxStockLevel: 100,
        unit: 'Pieces',
        price: 2.50,
        supplier: 'XYZ Textiles',
        lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        lastRestocked: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
        totalValue: 20.00
      },
      {
        id: '3',
        name: 'Wax Polish',
        category: 'Finishing Products',
        currentStock: 12,
        minStockLevel: 5,
        maxStockLevel: 30,
        unit: 'Bottles',
        price: 8.99,
        supplier: 'Premium Products',
        lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
        lastRestocked: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14), // 2 weeks ago
        totalValue: 107.88
      },
      {
        id: '4',
        name: 'Tire Shine',
        category: 'Finishing Products',
        currentStock: 18,
        minStockLevel: 8,
        maxStockLevel: 25,
        unit: 'Bottles',
        price: 6.50,
        supplier: 'Premium Products',
        lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
        lastRestocked: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 days ago
        totalValue: 117.00
      },
      {
        id: '5',
        name: 'Glass Cleaner',
        category: 'Cleaning Supplies',
        currentStock: 5,
        minStockLevel: 12,
        maxStockLevel: 40,
        unit: 'Bottles',
        price: 4.99,
        supplier: 'ABC Supplies',
        lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
        lastRestocked: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10), // 10 days ago
        totalValue: 24.95
      }
    ];

    setTimeout(() => {
      setStockItems(mockStockItems);
      setIsLoading(false);
    }, 1000);
  }, []);

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
    })
    .sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'currentStock':
          aValue = a.currentStock;
          bValue = b.currentStock;
          break;
        case 'totalValue':
          aValue = a.totalValue;
          bValue = b.totalValue;
          break;
        case 'lastUpdated':
          aValue = a.lastUpdated;
          bValue = b.lastUpdated;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
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

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: typeof sortBy) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? '↑' : '↓';
  };

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
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading inventory...</p>
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
            Stock Inventory
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Comprehensive view of all inventory items
          </p>
        </div>
        <Button
          onClick={() => window.location.href = '/stock/update'}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Update Stock
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
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
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
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

      {/* Inventory Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    <span>Item</span>
                    {getSortIcon('name')}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('currentStock')}
                    className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    <span>Stock Level</span>
                    {getSortIcon('currentStock')}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('totalValue')}
                    className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    <span>Total Value</span>
                    {getSortIcon('totalValue')}
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
              {filteredAndSortedItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="text-gray-500 dark:text-gray-400">
                      <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      <p className="text-lg font-medium">No items found</p>
                      <p className="text-sm">
                        {searchTerm ? 'No items match your search criteria.' : 'No items found for the selected filter.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAndSortedItems.map((item) => {
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
                        ${item.price}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        ${item.totalValue.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStockStatusBadge(status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.location.href = `/stock/update`}
                        >
                          Update
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StockInventoryPage; 