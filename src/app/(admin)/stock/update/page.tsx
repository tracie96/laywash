"use client";
import React, { useState, useEffect } from 'react';
import Button from '@/components/ui/button/Button';
import InputField from '@/components/form/input/InputField';

interface StockItem {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  minStockLevel: number;
  unit: string;
  price: number;
  supplier: string;
  lastUpdated: Date;
}

const StockUpdatePage: React.FC = () => {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [updateQuantity, setUpdateQuantity] = useState('');
  const [updateType, setUpdateType] = useState<'in' | 'out'>('in');

  // Mock stock data
  useEffect(() => {
    const mockStockItems: StockItem[] = [
      {
        id: '1',
        name: 'Car Wash Soap',
        category: 'Cleaning Supplies',
        currentStock: 25,
        minStockLevel: 10,
        unit: 'Liters',
        price: 15.99,
        supplier: 'ABC Supplies',
        lastUpdated: new Date()
      },
      {
        id: '2',
        name: 'Microfiber Towels',
        category: 'Cleaning Supplies',
        currentStock: 8,
        minStockLevel: 15,
        unit: 'Pieces',
        price: 2.50,
        supplier: 'XYZ Textiles',
        lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 24) // 1 day ago
      },
      {
        id: '3',
        name: 'Wax Polish',
        category: 'Finishing Products',
        currentStock: 12,
        minStockLevel: 5,
        unit: 'Bottles',
        price: 8.99,
        supplier: 'Premium Products',
        lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 48) // 2 days ago
      }
    ];

    setTimeout(() => {
      setStockItems(mockStockItems);
      setIsLoading(false);
    }, 1000);
  }, []);

  const handleUpdateStock = async () => {
    if (!selectedItem || !updateQuantity) return;

    const quantity = parseInt(updateQuantity);
    if (isNaN(quantity) || quantity <= 0) return;

    const newStock = updateType === 'in' 
      ? selectedItem.currentStock + quantity
      : selectedItem.currentStock - quantity;

    if (newStock < 0) {
      alert('Cannot reduce stock below 0');
      return;
    }

    // Update the stock item
    setStockItems(prev => prev.map(item => 
      item.id === selectedItem.id 
        ? { ...item, currentStock: newStock, lastUpdated: new Date() }
        : item
    ));

    setSelectedItem(null);
    setUpdateQuantity('');
    setUpdateType('in');
  };

  const getStockStatus = (item: StockItem) => {
    if (item.currentStock <= item.minStockLevel) return 'low';
    if (item.currentStock <= item.minStockLevel * 2) return 'medium';
    return 'good';
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'low': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
      case 'good': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading stock data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Update Stock
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage inventory levels and stock movements
        </p>
      </div>

      {/* Stock Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {stockItems.map((item) => {
          const status = getStockStatus(item);
          const statusColor = getStockStatusColor(status);
          
          return (
            <div
              key={item.id}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {item.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {item.category}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}>
                  {status.toUpperCase()}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Current Stock:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {item.currentStock} {item.unit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Min Level:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {item.minStockLevel} {item.unit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Price:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    ${item.price}
                  </span>
                </div>
              </div>

              <Button
                size="sm"
                onClick={() => setSelectedItem(item)}
                className="w-full"
              >
                Update Stock
              </Button>
            </div>
          );
        })}
      </div>

      {/* Update Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Update Stock: {selectedItem.name}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Update Type
                </label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setUpdateType('in')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      updateType === 'in'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Stock In
                  </button>
                  <button
                    onClick={() => setUpdateType('out')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      updateType === 'out'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Stock Out
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Quantity ({selectedItem.unit})
                </label>
                <InputField
                  type="number"
                  value={updateQuantity}
                  onChange={(e) => setUpdateQuantity(e.target.value)}
                  placeholder="Enter quantity"
                />
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-400">
                Current: {selectedItem.currentStock} {selectedItem.unit}
                {updateQuantity && (
                  <span className="ml-2">
                    → {updateType === 'in' 
                      ? selectedItem.currentStock + parseInt(updateQuantity)
                      : selectedItem.currentStock - parseInt(updateQuantity)
                    } {selectedItem.unit}
                  </span>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedItem(null);
                  setUpdateQuantity('');
                  setUpdateType('in');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateStock}
                disabled={!updateQuantity || parseInt(updateQuantity) <= 0}
              >
                Update
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockUpdatePage; 