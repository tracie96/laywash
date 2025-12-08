"use client";
import React, { useState, useEffect, useCallback } from "react";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import { useAuth } from "@/context/AuthContext";
import { PlusIcon, TrashBinIcon } from "@/icons";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { LocationSelect } from "@/components/ui/LocationSelect";

interface Bonus {
  id: string;
  type: 'customer' | 'washer';
  recipientId: string;
  recipientName?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  amount: number;
  reason: string;
  milestone?: string;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  paidAt?: string;
  createdAt: string;
  bonusType?: 'cash' | 'service' | 'item';
  serviceId?: string;
  itemId?: string;
}

interface CreateBonusForm {
  type: 'customer' | 'washer';
  recipientId: string;
  serviceId: string;
  amount: string;
  reason: string;
  description: string;
  locationId: string;
  milestone: string;
}

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  companyCommissionPercentage: number;
  isActive: boolean;
}

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone: string;
  licensePlate: string;
  totalVisits: number;
  totalSpent: number;
}

interface Washer {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface InventoryItem {
  id: string;
  name: string;
}

const FinancialBonusesPage: React.FC = () => {
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [washers, setWashers] = useState<Washer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateBonusForm>({
    type: 'customer',
    recipientId: '',
    serviceId: '',
    amount: '',
    reason: '',
    description: '',
    locationId: '',
    milestone: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'customer' | 'washer'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'paid' | 'rejected'>('all');
  
  // Customer filtering states
  const [minVisits, setMinVisits] = useState<string>('');
  const [minSpent, setMinSpent] = useState<string>('');
  const [recipientSearch, setRecipientSearch] = useState<string>('');
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [filteredWashers, setFilteredWashers] = useState<Washer[]>([]);
  
  const { user } = useAuth();
  const { hasRole } = useAuth();

  const fetchBonuses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (filterType !== 'all') params.append('type', filterType);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      
      const response = await fetch(`/api/admin/bonuses?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setBonuses(data.bonuses);
      } else {
        if (data.needsTableCreation) {
          setError('The bonuses table does not exist in your database. Please run the SQL script to create it.');
        } else {
          setError(data.error || 'Failed to fetch bonuses');
        }
      }
    } catch (err) {
      console.error('Error fetching bonuses:', err);
      setError('Failed to fetch bonuses from server');
    } finally {
      setLoading(false);
    }
  }, [filterType, filterStatus]);

  // Filter customers based on visits, spending, and search
  const filterCustomers = useCallback(() => {
    let filtered = customers;
    
    if (minVisits) {
      const visits = parseInt(minVisits);
      if (!isNaN(visits)) {
        filtered = filtered.filter(customer => customer.totalVisits >= visits);
      }
    }
    
    if (minSpent) {
      const spent = parseFloat(minSpent);
      if (!isNaN(spent)) {
        filtered = filtered.filter(customer => customer.totalSpent >= spent);
      }
    }
    
    if (recipientSearch) {
      const searchTerm = recipientSearch.toLowerCase();
      filtered = filtered.filter(customer => 
        customer.name.toLowerCase().includes(searchTerm) ||
        // customer.licensePlate.toLowerCase().includes(searchTerm) ||
        customer.email?.toLowerCase().includes(searchTerm) ||
        customer.phone.includes(searchTerm)
      );
    }
    
    setFilteredCustomers(filtered);
  }, [customers, minVisits, minSpent, recipientSearch]);

  // Filter washers based on search
  const filterWashers = useCallback(() => {
    let filtered = washers;
    
    if (recipientSearch) {
      const searchTerm = recipientSearch.toLowerCase();
      filtered = filtered.filter(washer => 
        washer.name.toLowerCase().includes(searchTerm) ||
        washer.email.toLowerCase().includes(searchTerm) ||
        washer.phone.includes(searchTerm)
      );
    }
    
    setFilteredWashers(filtered);
  }, [washers, recipientSearch]);

  useEffect(() => {
    fetchBonuses();
    fetchCustomers();
    fetchWashers();
    fetchServices();
    fetchInventory();
  }, [fetchBonuses]);

  // Filter customers and washers when filters change
  useEffect(() => {
    filterCustomers();
    filterWashers();
  }, [filterCustomers, filterWashers]);

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/admin/customers?includeStats=true');
      const data = await response.json();
      if (data.success) {
        setCustomers(data.customers);
        setFilteredCustomers(data.customers);
      }
    } catch {
      console.error('Error fetching customers');
    }
  };

  const fetchWashers = async () => {
    try {
      const response = await fetch('/api/admin/washers');
      const data = await response.json();
      if (data.success) {
        setWashers(data.washers);
      }
    } catch {
      console.error('Error fetching washers');
    }
  };

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/admin/services?status=active');
      const data = await response.json();
      if (data.success) {
        setServices(data.services);
      }
    } catch {
      console.error('Error fetching services');
    }
  };

  const fetchInventory = async () => {
    try {
      const response = await fetch('/api/admin/inventory?status=active');
      const data = await response.json();
      if (data.success) {
        setInventory(data.inventory || []);
      }
    } catch {
      console.error('Error fetching inventory');
    }
  };

  const handleServiceSelect = (serviceId: string) => {
    const selectedService = services.find(s => s.id === serviceId);
    if (selectedService) {
      // Calculate amount as service price * company commission percentage / 100
      const calculatedAmount = (selectedService.price * selectedService.companyCommissionPercentage / 100).toFixed(2);
      setCreateForm({
        ...createForm,
        serviceId,
        amount: calculatedAmount
      });
    } else {
      setCreateForm({
        ...createForm,
        serviceId: '',
        amount: ''
      });
    }
  };

  const handleCreateBonus = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createForm.recipientId || !createForm.amount || !createForm.reason) {
      setError('Please fill in all required fields');
      return;
    }

    const amount = parseFloat(createForm.amount);
    if (isNaN(amount) || amount <= 0) {
      setError('Bonus amount must be greater than 0');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Create bonus entry
      const bonusResponse = await fetch('/api/admin/bonuses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: createForm.type,
          recipientId: createForm.recipientId,
          amount: amount,
          reason: createForm.reason,
          milestone: createForm.milestone || null,
        }),
      });

      const bonusData = await bonusResponse.json();

      if (bonusData.success) {
        // Create expense entry for customer bonuses
        if (createForm.type === 'customer') {
          const expenseResponse = await fetch('/api/admin/expenses', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              serviceType: 'checkin', // Free Car Wash
              amount: amount,
              reason: `Customer Bonus: ${createForm.reason}`,
              description: createForm.description || `Bonus awarded to customer - ${createForm.milestone || 'No milestone specified'}`,
              locationId: createForm.locationId || null,
              expenseDate: new Date().toISOString()
            }),
          });

          const expenseData = await expenseResponse.json();
          if (!expenseData.success) {
            console.warn('Bonus created but expense entry failed:', expenseData.error);
          }
        }

        setShowCreateModal(false);
        setCreateForm({
          type: 'customer',
          recipientId: '',
          serviceId: '',
          amount: '',
          reason: '',
          description: '',
          locationId: '',
          milestone: ''
        });
        fetchBonuses(); // Refresh the list
      } else {
        if (bonusData.needsTableCreation) {
          setError('The bonuses table does not exist in your database. Please run the SQL script to create it.');
        } else {
          setError(bonusData.error || 'Failed to create bonus');
        }
      }
    } catch {
      setError('Failed to create bonus');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBonusAction = async (bonusId: string, action: 'approve' | 'pay' | 'reject' | 'delete') => {
    try {
      if (action === 'delete') {
        const response = await fetch(`/api/admin/bonuses/${bonusId}`, {
          method: 'DELETE',
        });
        const data = await response.json();
        
        if (data.success) {
          fetchBonuses(); // Refresh the list
        } else {
          setError(data.error || 'Failed to delete bonus');
        }
      } else {
        const response = await fetch(`/api/admin/bonuses/${bonusId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action,
            approvedBy: user?.id
          }),
        });

        const data = await response.json();

        if (data.success) {
          fetchBonuses(); // Refresh the list
        } else {
          setError(data.error || 'Failed to update bonus');
        }
      }
    } catch {
      setError('Failed to perform action');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
      case "approved":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "paid":
        return "bg-green-light-100 text-green-light-800 dark:bg-green-light-900/30 dark:text-green-light-300";
      case "rejected":
        return "bg-error-100 text-error-800 dark:bg-error-900/30 dark:text-error-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "customer":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      case "washer":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
    }
  };

  const totalBonuses = bonuses.length;
  const pendingBonuses = bonuses.filter(b => b.status === 'pending').length;
  const totalAmount = bonuses.reduce((sum, bonus) => sum + bonus.amount, 0);
  const paidAmount = bonuses.filter(b => b.status === 'paid').reduce((sum, bonus) => sum + bonus.amount, 0);

  const filteredBonuses = bonuses.filter(bonus => {
    if (filterType !== 'all' && bonus.type !== filterType) return false;
    if (filterStatus !== 'all' && bonus.status !== filterStatus) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-light-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading bonuses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageBreadCrumb pageTitle="Bonus Management" />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Bonuses</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalBonuses}</p>
            </div>
            <div className="p-3 bg-blue-light-100 dark:bg-blue-light-900/30 rounded-lg">
              <svg className="w-6 h-6 text-blue-light-600 dark:text-blue-light-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Bonuses</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingBonuses}</p>
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
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">₦ {totalAmount.toFixed(2)}</p>
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
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Paid Amount</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">₦ {paidAmount.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-green-light-100 dark:bg-green-light-900/30 rounded-lg">
              <svg className="w-6 h-6 text-green-light-600 dark:text-green-light-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-wrap gap-4">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'customer' | 'washer')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="customer">Customer</option>
              <option value="washer">Washer</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'pending' | 'approved' | 'paid' | 'rejected')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          {hasRole('super_admin') &&  (

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-green-light-600 text-white rounded-lg hover:bg-green-light-700 focus:ring-2 focus:ring-green-light-500 focus:ring-offset-2 transition-colors"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Create Bonus
          </button>)}
        </div>
      </div>

      {/* Customer Filtering Section */}
      {filterType === 'customer' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Filter Customers for Bonus</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Minimum Visits</Label>
              <Input
                type="number"
                min="0"
                placeholder="e.g., 10"
                value={minVisits}
                onChange={(e) => setMinVisits(e.target.value)}
              />
            </div>
            <div>
              <Label>Minimum Amount Spent (₦)</Label>
              <Input
                type="number"
                min="0"
                step={0.01}
                placeholder="e.g., 5000"
                value={minSpent}
                onChange={(e) => setMinSpent(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => {
                  setMinVisits('');
                  setMinSpent('');
                }}
                variant="outline"
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredCustomers.length} customers matching your criteria
          </div>
          
          {/* Customer List */}
          {filteredCustomers.length > 0 && (
            <div className="mt-6">
              <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">Eligible Customers</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCustomers.map((customer) => (
                  <div 
                    key={customer.id}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                    onClick={() => {
                      setCreateForm(prev => ({...prev, recipientId: customer.id}));
                      setShowCreateModal(true);
                    }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="font-medium text-gray-900 dark:text-white">{customer.name}</h5>
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded">
                        {customer.licensePlate}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex justify-between">
                        <span>Total Visits:</span>
                        <span className="font-medium">{customer.totalVisits}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Spent:</span>
                        <span className="font-medium">₦{customer.totalSpent.toFixed(2)}</span>
                      </div>
                      {customer.email && (
                        <div className="text-xs text-gray-500 dark:text-gray-500 truncate">
                          {customer.email}
                        </div>
                      )}
                    </div>
                    <div className="mt-3 text-xs text-blue-600 dark:text-blue-400">
                      Click to select for bonus
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <span className="text-red-800 dark:text-red-200">{error}</span>
              {error.includes('table does not exist') && (
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  <p className="font-medium">To fix this:</p>
                  <ol className="list-decimal list-inside mt-1 space-y-1">
                    <li>Go to your Supabase dashboard</li>
                    <li>Navigate to the SQL Editor</li>
                    <li>Copy and paste the contents of the <code className="bg-red-100 dark:bg-red-800 px-1 rounded">bonuses_table.sql</code> file</li>
                    <li>Run the SQL script</li>
                    <li>Refresh this page</li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bonuses Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Bonus Records</h2>
        </div>
        <div className="overflow-x-auto">
          {filteredBonuses.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 dark:text-gray-500 text-4xl mb-4">🎁</div>
              <p className="text-gray-600 dark:text-gray-400">No bonuses found</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                {filterType !== 'all' || filterStatus !== 'all' 
                  ? 'Try adjusting your filters to see more results.'
                  : 'Create your first bonus to get started.'
                }
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Recipient</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredBonuses.map((bonus) => (
                  <tr key={bonus.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {bonus.recipientName || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {bonus.recipientEmail || bonus.recipientPhone || 'No contact info'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(bonus.type)}`}>
                        {bonus.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      ₦ {bonus.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white max-w-xs truncate">
                        {bonus.reason}
                      </div>
                      {bonus.milestone && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Milestone: {bonus.milestone}
                        </div>
                      )}
                      {bonus.bonusType && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Type: <span className="capitalize">{bonus.bonusType}</span>
                          {bonus.serviceId && (() => {
                            const service = services.find(s => s.id === bonus.serviceId);
                            return service ? ` - ${service.name}` : '';
                          })()}
                          {bonus.itemId && (() => {
                            const item = inventory.find(i => i.id === bonus.itemId);
                            return item ? ` - ${item.name}` : '';
                          })()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(bonus.status)}`}>
                        {bonus.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(bonus.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {bonus.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleBonusAction(bonus.id, 'approve')}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                              title="Approve"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleBonusAction(bonus.id, 'reject')}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              title="Reject"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {bonus.status === 'approved' && (
                          <button
                            onClick={() => handleBonusAction(bonus.id, 'pay')}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Mark as Paid"
                          >
                            Mark as Paid
                          </button>
                        )}
                        {bonus.status !== 'paid' && (
                          <button
                            onClick={() => handleBonusAction(bonus.id, 'delete')}
                            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                            title="Delete"
                          >
                            <TrashBinIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Bonus Modal */}
      <Modal
      isOpen={showCreateModal}
      onClose={() => setShowCreateModal(false)}
      className="max-w-md"
    >
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Create New Bonus
        </h2>

        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <span className="text-red-800 dark:text-red-200 text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleCreateBonus} className="space-y-4">
          {/* Bonus Type */}
          <div>
            <Label>Bonus Type <span className="text-error-500">*</span></Label>
            <select
              value={createForm.type}
              onChange={(e) => {
                setCreateForm({...createForm, type: e.target.value as 'customer' | 'washer', recipientId: '', serviceId: '', amount: ''});
                setRecipientSearch(''); // Clear search when type changes
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="customer">Customer</option>
              <option value="washer">Washer</option>
            </select>
          </div>

          {/* Recipient */}
          <div>
            <Label>Recipient <span className="text-error-500">*</span></Label>
            
            {/* Search input for recipients */}
            <div className="mb-2">
              <Input
                type="text"
                placeholder={createForm.type === 'customer' 
                  ? "Search customers by name, license plate, email, or phone..."
                  : "Search washers by name or email..."
                }
                value={recipientSearch}
                onChange={(e) => setRecipientSearch(e.target.value)}
                className="w-full"
              />
            </div>
            
            <select
              value={createForm.recipientId}
              onChange={(e) => setCreateForm({...createForm, recipientId: e.target.value, serviceId: '', amount: ''})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Select recipient</option>
              {createForm.type === 'customer' 
                ? filteredCustomers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} - {customer.licensePlate} (Visits: {customer.totalVisits}, Spent: ₦{customer.totalSpent.toFixed(2)})
                    </option>
                  ))
                : filteredWashers.map(washer => (
                    <option key={washer.id} value={washer.id}>
                      {washer.name} - {washer.email}
                    </option>
                  ))
              }
            </select>
          </div>

          {/* Service Selection - Only show for customers when recipient is selected */}
          {createForm.type === 'customer' && createForm.recipientId && (
            <div>
              <Label>Service <span className="text-error-500">*</span></Label>
              <select
                value={createForm.serviceId}
                onChange={(e) => handleServiceSelect(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select service</option>
                {services.map(service => (
                  <option key={service.id} value={service.id}>
                    {service.name} - ₦{service.price.toFixed(2)} (Commission: {service.companyCommissionPercentage}% = ₦{(service.price * service.companyCommissionPercentage / 100).toFixed(2)})
                  </option>
                ))}
              </select>
              {createForm.serviceId && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Amount auto-calculated based on company commission percentage
                </p>
              )}
            </div>
          )}

          {/* Amount */}
          <div>
            <Label>Amount (₦) <span className="text-error-500">*</span></Label>
            <Input
              type="number"
              step={0.01}
              min="0"
              placeholder="Enter bonus amount"
              value={createForm.amount}
              onChange={(e) => setCreateForm({...createForm, amount: e.target.value})}
              disabled={createForm.type === 'customer' && createForm.serviceId !== ''}
            />
            {createForm.type === 'customer' && createForm.serviceId && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Amount is auto-calculated from service selection. Clear service to manually enter amount.
              </p>
            )}
          </div>

          {/* Reason */}
          <div>
            <Label>Reason <span className="text-error-500">*</span></Label>
            <Input
              type="text"
              placeholder="Brief reason for bonus"
              value={createForm.reason}
              onChange={(e) => setCreateForm({...createForm, reason: e.target.value})}
            />
          </div>

          {/* Description */}
          <div>
            <Label>Description</Label>
            <textarea
              placeholder="Detailed description (optional)"
              value={createForm.description}
              onChange={(e) => setCreateForm({...createForm, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              rows={3}
            />
          </div>

          {/* Location */}
          <div>
            <Label>Location</Label>
            <LocationSelect
              value={createForm.locationId}
              onChange={(locationId) => setCreateForm({...createForm, locationId})}
              placeholder="Select location (optional)"
            />
          </div>

          {/* Milestone */}
          <div>
            <Label>Milestone (Optional)</Label>
            <Input
              type="text"
              placeholder="e.g., 100th car washed, Loyal customer"
              value={createForm.milestone}
              onChange={(e) => setCreateForm({...createForm, milestone: e.target.value})}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1"
            >
              {submitting ? 'Creating...' : 'Create Bonus'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              className="px-6"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </Modal>
    </div>
  );
};

export default FinancialBonusesPage;
 