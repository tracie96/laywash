"use client";
import React, { useState, useCallback, useEffect } from 'react';
import Badge from '@/components/ui/badge/Badge';
import Button from '@/components/ui/button/Button';
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import { useAuth } from '@/context/AuthContext';
import SearchableSelect from '@/components/ui/SearchableSelect';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  unit: string;
  price: number;
  supplier: string;
}

interface SalesItem {
  inventoryId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
}

const SalesPage: React.FC = () => {
  const { user } = useAuth();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [salesItems, setSalesItems] = useState<SalesItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);



  const fetchInventory = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/inventory');
      const data = await response.json();

      if (data.success) {
        setInventoryItems(data.inventory);
      } else {
        setError(data.error || 'Failed to fetch inventory');
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setError('Failed to fetch inventory from server');
    }
  }, []);
  const fetchCustomers = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/customers');
      const data = await response.json();

      if (data.success) {
        setCustomers(data.customers);
      } else {
        setError(data.error || 'Failed to fetch customers');
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      setError('Failed to fetch customers from server');
    }
  }, []);

  useEffect(() => {
    if (user) {
      const loadData = async () => {
        setIsLoading(true);
        await Promise.all([fetchInventory(), fetchCustomers()]);
        setIsLoading(false);
      };
      loadData();
    }
  }, [user, fetchInventory, fetchCustomers]);

  const addSalesItem = () => {
    if (inventoryItems.length === 0) return;
    
    const newItem: SalesItem = {
      inventoryId: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0
    };
    setSalesItems([...salesItems, newItem]);
  };

  const removeSalesItem = (index: number) => {
    setSalesItems(salesItems.filter((_, i) => i !== index));
  };

  const updateSalesItem = (index: number, field: keyof SalesItem, value: number | string) => {
    const updatedItems = [...salesItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Recalculate total price when any field changes
    const item = updatedItems[index];
    if (item.inventoryId && item.quantity && item.unitPrice) {
      item.totalPrice = item.quantity * item.unitPrice;
    }
    
    setSalesItems(updatedItems);
  };

  const getTotalAmount = () => {
    return salesItems.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (salesItems.length === 0) {
      setError('Please add at least one item to the sale');
      return;
    }

    if (salesItems.some(item => !item.inventoryId || item.quantity <= 0)) {
      setError('Please fill in all item details correctly');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: selectedCustomer || null,
          items: salesItems,
          totalAmount: getTotalAmount(),
          paymentMethod,
          adminId: user?.id,
          remarks
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setShowSuccess(true);
        setSalesItems([]);
        setSelectedCustomer('');
        setPaymentMethod('cash');
        setRemarks('');
        
        // Refresh inventory to show updated stock levels
        await fetchInventory();
        
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        setError(data.error || 'Failed to create sale');
      }
    } catch (error) {
      console.error('Error creating sale:', error);
      setError('Failed to create sale');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredInventory = inventoryItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading sales page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageBreadCrumb pageTitle="Sales" />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Create Sale
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Process sales transactions and automatically update inventory
          </p>
        </div>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-green-800 dark:text-green-200">Sale completed successfully! Inventory has been updated.</span>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {/* Sales Form */}
        <div className="lg:col-span-2 xl:col-span-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Sale Details</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Customer and Payment Method Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Customer Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Customer (Optional)
                  </label>
                  <SearchableSelect
                    options={[
                      { value: '', label: 'Walk-in Customer' },
                      ...customers.map(customer => ({
                        value: customer.id,
                        label: `${customer.name} - ${customer.phone}`
                      }))
                    ]}
                    value={selectedCustomer}
                    onChange={setSelectedCustomer}
                    placeholder="Walk-in Customer"
                    searchPlaceholder="Search customers..."
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="mobile">Mobile Payment</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>

              {/* Sales Items */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Sale Items
                  </label>
                  <Button
                    type="button"
                    onClick={addSalesItem}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Add Item
                  </Button>
                </div>

                {salesItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <p>No items added yet. Click &quot;Add Item&quot; to start.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {salesItems.map((item, index) => (
                      <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                          <div className="lg:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Item
                            </label>
                            <SearchableSelect
                              options={[
                                { value: '', label: 'Select Item' },
                                ...filteredInventory.map(invItem => ({
                                  value: invItem.id,
                                  label: `${invItem.name} (${invItem.currentStock}  available)`
                                }))
                              ]}
                              value={item.inventoryId}
                              onChange={(value) => {
                                updateSalesItem(index, 'inventoryId', value);
                                // Auto-populate unit price when item is selected
                                if (value) {
                                  const selectedInventoryItem = inventoryItems.find(inv => inv.id === value);
                                  if (selectedInventoryItem) {
                                    updateSalesItem(index, 'unitPrice', selectedInventoryItem.price);
                                  }
                                }
                              }}
                              placeholder="Select Item"
                              searchPlaceholder="Search inventory items..."
                             
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Quantity
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateSalesItem(index, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Unit Price
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={inventoryItems.find(inv => inv.id === item.inventoryId)?.price || 0}
                              onChange={(e) => updateSalesItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              required
                            />
                          </div>

                          <div className="lg:col-span-1">
                            <div className="flex items-end space-x-2">
                              <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Total
                                </label>
                                <div className="px-3 py-2 bg-gray-100 dark:bg-gray-600 rounded-lg text-gray-900 dark:text-white">
                                  NGN {item.totalPrice.toFixed(2)}
                                </div>
                              </div>
                              <Button
                                type="button"
                                onClick={() => removeSalesItem(index)}
                                className="bg-red-600 hover:bg-red-700"
                                size="sm"
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>



              {/* Remarks */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Remarks (Optional)
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Any additional notes about this sale..."
                />
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={submitting || salesItems.length === 0}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Processing Sale...' : `Complete Sale - NGN ${getTotalAmount().toFixed(2)}`}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Inventory Search */}
        <div className="lg:col-span-1 xl:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Inventory Search</h3>
            
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search inventory items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredInventory.map(item => (
                <div key={item.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                  <div className="font-medium text-gray-900 dark:text-white">{item.name}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {item.category} • {item.currentStock} {item.unit} available
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    NGN {item.price.toFixed(2)} per {item.unit}
                  </div>
                  <div className="mt-2">
                    {item.currentStock <= 10 ? (
                      <Badge color="error">Low Stock</Badge>
                    ) : item.currentStock <= 25 ? (
                      <Badge color="warning">Medium Stock</Badge>
                    ) : (
                      <Badge color="success">Good Stock</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesPage;
