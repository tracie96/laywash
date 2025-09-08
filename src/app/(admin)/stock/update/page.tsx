"use client";
import React, { useState, useEffect } from 'react';
import Button from '@/components/ui/button/Button';
import InputField from '@/components/form/input/InputField';
import { Modal } from '@/components/ui/modal';
import { useAuth } from '@/context/AuthContext';

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

interface InventoryApiResponse {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  minStockLevel: number;
  unit: string;
  price: number;
  supplier: string;
  lastUpdated: string;
}

interface CreateStockForm {
  name: string;
  description: string;
  category: string;
  currentStock: number;
  minStockLevel: number;
  maxStockLevel: number;
  unit: string;
  price: number;
  supplier: string;
}

const StockUpdatePage: React.FC = () => {
  const { user, hasAnyRole } = useAuth();
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [updateQuantity, setUpdateQuantity] = useState('');
  const [updateType, setUpdateType] = useState<'in' | 'out'>('in');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateStockForm>({
    name: '',
    description: '',
    category: '',
    currentStock: 0,
    minStockLevel: 0,
    maxStockLevel: 0,
    unit: '',
    price: 0,
    supplier: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch real stock data from API
  const fetchStockItems = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/inventory');
      const result = await response.json();
      
      if (result.success) {
        // Transform the API response to match our StockItem interface
        const transformedItems: StockItem[] = result.inventory.map((item: InventoryApiResponse) => ({
          id: item.id,
          name: item.name,
          category: item.category,
          currentStock: item.currentStock,
          minStockLevel: item.minStockLevel,
          unit: item.unit,
          price: item.price,
          supplier: item.supplier,
          lastUpdated: new Date(item.lastUpdated)
        }));
        
        setStockItems(transformedItems);
      } else {
        console.error('Failed to fetch stock items:', result.error);
        setStockItems([]);
      }
    } catch (error) {
      console.error('Error fetching stock items:', error);
      setStockItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStockItems();
  }, []);

  // Reset updateType to 'in' if user is not super admin and updateType is 'out'
  useEffect(() => {
    if (user?.role !== 'super_admin' && updateType === 'out') {
      setUpdateType('in');
    }
  }, [user, updateType]);

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
          description: '',
          category: '',
          currentStock: 0,
          minStockLevel: 0,
          maxStockLevel: 0,
          unit: '',
          price: 0,
          supplier: ''
        });
        fetchStockItems(); // Refresh the list
        alert('Item created successfully!');
      } else {
        setError(data.error || 'Failed to create inventory item');
      }
    } catch {
      setError('Failed to create inventory item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStock = async () => {
    if (!selectedItem || !updateQuantity) return;

    const quantity = parseInt(updateQuantity);
    if (isNaN(quantity) || quantity <= 0) return;

    // Prevent stock out operations for non-super admin users
    if (updateType === 'out' && user?.role !== 'super_admin') {
      alert('Only Super Administrators can perform stock out operations');
      return;
    }

    const newStock = updateType === 'in' 
      ? selectedItem.currentStock + quantity
      : selectedItem.currentStock - quantity;

    if (newStock < 0) {
      alert('Cannot reduce stock below 0');
      return;
    }

    try {
      // Call API to update stock
      const response = await fetch(`/api/admin/inventory/${selectedItem.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentStock: newStock
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Refresh data from API to ensure consistency
        await fetchStockItems();
        
        setSelectedItem(null);
        setUpdateQuantity('');
        setUpdateType('in');
        
        // Show success message
        alert('Stock updated successfully!');
      } else {
        alert(`Failed to update stock: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating stock:', error);
      alert('Failed to update stock. Please try again.');
    }
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Update Stock
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage inventory levels and stock movements
            </p>
            {user?.role !== 'super_admin' && (
              <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                ⚠️ Stock Out operations are restricted to Super Administrators only
              </p>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {hasAnyRole(['super_admin', 'admin']) && (
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                Add Item
              </Button>
            )}
            {user?.role === 'super_admin' && (
              <div className="bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg px-4 py-2">
                <div className="flex items-center text-green-800 dark:text-green-200">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium">Full Access</span>
                </div>
              </div>
            )}
          </div>
        </div>
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
                    ₦ {item.price}
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
      <Modal
        isOpen={!!selectedItem}
        onClose={() => {
          setSelectedItem(null);
          setUpdateQuantity('');
          setUpdateType('in');
        }}
        className="max-w-md w-full mx-4"
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Update Stock: {selectedItem?.name}
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
                {user?.role === 'super_admin' && (
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
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quantity ({selectedItem?.unit})
              </label>
              <InputField
                type="number"
                value={updateQuantity}
                onChange={(e) => setUpdateQuantity(e.target.value)}
                placeholder="Enter quantity"
              />
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400">
              Current: {selectedItem?.currentStock} {selectedItem?.unit}
              {updateQuantity && (
                <span className="ml-2">
                  → {updateType === 'in' 
                    ? (selectedItem?.currentStock || 0) + parseInt(updateQuantity)
                    : (selectedItem?.currentStock || 0) - parseInt(updateQuantity)
                  } {selectedItem?.unit}
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
      </Modal>

      {/* Create Item Modal */}
      {hasAnyRole(['super_admin', 'admin']) && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          className="w-full max-w-md mx-4"
        >
          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add New Inventory Item</h3>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

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
                  Description
                </label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({...createForm, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter item description"
                  rows={3}
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
      )}
    </div>
  );
};

export default StockUpdatePage; 