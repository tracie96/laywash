"use client";
import React, { useState, useEffect, useCallback } from "react";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import { PlusIcon, PencilIcon, EyeIcon } from "@/icons";
import { Modal } from "@/components/ui/modal";

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone: string;
  dateOfBirth?: string;
  isRegistered: boolean;
  registrationDate?: string;
  totalVisits: number;
  totalSpent: number;
  averageSpending?: number;
  lastVisit?: string;
  mostUsedServices?: Array<{
    service: string;
    count: number;
  }>;
  createdAt: string;
  updatedAt: string;
  vehicles?: Array<{
    id: string;
    customer_id: string;
    license_plate: string;
    vehicle_type: string;
    vehicle_make?: string;
    vehicle_model?: string;
    vehicle_color: string;
    is_primary: boolean;
    created_at: string;
    updated_at: string;
  }>;
}

interface CheckIn {
  id: string;
  licensePlate: string;
  vehicleType: string;
  vehicleModel?: string;
  vehicleColor?: string;
  status: string;
  checkInTime: string;
  completedTime?: string;
  estimatedDuration?: number;
  totalAmount: number;
  paymentStatus: string;
  paymentMethod?: string;
  specialInstructions?: string;
  valuableItems?: string;
  washType: string;
  assignedWasher: string;
  services: Array<{
    id: string;
    name: string;
    price: number;
    duration: number;
    service?: {
      id: string;
      name: string;
      description?: string;
      base_price?: number;
      
      category?: string;
    };
  }>;
  createdAt: string;
  updatedAt: string;
}

const OperationsCustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'registered' | 'unregistered'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'totalVisits' | 'totalSpent' | 'lastVisit'>('totalSpent');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedCustomerCheckIns, setSelectedCustomerCheckIns] = useState<CheckIn[]>([]);
  const [customerDetailsLoading, setCustomerDetailsLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    dateOfBirth: ''
  });

  const [vehicles, setVehicles] = useState<Array<{
    licensePlate: string;
    vehicleType: string;
    vehicleMake: string;
    vehicleModel: string;
    vehicleColor: string;
    isPrimary: boolean;
  }>>([{
    licensePlate: '',
    vehicleType: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleColor: '',
    isPrimary: true
  }]);
console.log(customers);
  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterType !== 'all') params.append('filter', filterType);
      params.append('limit', '10000'); // Request all customers
      
      const response = await fetch(`/api/admin/customers?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setCustomers(data.customers);
      } else {
        setError(data.error || 'Failed to fetch customers');
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Failed to fetch customers from server');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterType]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleSearch = () => {
    setSearchTerm(searchInput);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchTerm('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };


  const handleVehicleChange = (index: number, field: string, value: string | boolean) => {
    setVehicles(prev => prev.map((vehicle, i) => 
      i === index ? { ...vehicle, [field]: value } : vehicle
    ));
  };

  const addVehicle = () => {
    setVehicles(prev => [...prev, {
      licensePlate: '',
      vehicleType: '',
      vehicleMake: '',
      vehicleModel: '',
      vehicleColor: '',
      isPrimary: false
    }]);
  };

  const removeVehicle = (index: number) => {
    if (vehicles.length > 1) {
      setVehicles(prev => prev.filter((_, i) => i !== index));
    }
  };

  const setPrimaryVehicle = (index: number) => {
    setVehicles(prev => prev.map((vehicle, i) => ({
      ...vehicle,
      isPrimary: i === index
    })));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      dateOfBirth: ''
    });
    setVehicles([{
      licensePlate: '',
      vehicleType: '',
      vehicleMake: '',
      vehicleModel: '',
      vehicleColor: '',
      isPrimary: true
    }]);
    setCreateError(null);
    setSuccessMessage(null);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    resetForm();
  };

  const fetchCustomerDetails = async (customerId: string) => {
    try {
      setCustomerDetailsLoading(true);
      const response = await fetch(`/api/admin/customers/${customerId}/details`);
      const data = await response.json();
      
      if (data.success) {
        setSelectedCustomer(data.customer);
        setSelectedCustomerCheckIns(data.checkIns);
      } else {
        console.error('Failed to fetch customer details:', data.error);
      }
    } catch (error) {
      console.error('Error fetching customer details:', error);
    } finally {
      setCustomerDetailsLoading(false);
    }
  };

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowViewModal(true);
    fetchCustomerDetails(customer.id);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);

    setFormData({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone,
      dateOfBirth: customer.dateOfBirth || ''
    });
    
    // Set vehicles from customer data
    if (customer.vehicles && customer.vehicles.length > 0) {
      setVehicles(customer.vehicles.map(v => ({
        licensePlate: v.license_plate,
        vehicleType: v.vehicle_type,
        vehicleMake: (v as typeof v & { vehicle_make?: string }).vehicle_make || '',
        vehicleModel: v.vehicle_model || '',
        vehicleColor: v.vehicle_color,
        isPrimary: v.is_primary
      })));
    } else {
      // Fallback to empty vehicle if no vehicles array
      setVehicles([{
        licensePlate: '',
        vehicleType: '',
        vehicleMake: '',
        vehicleModel: '',
        vehicleColor: '',
        isPrimary: true
      }]);
    }
    setShowEditModal(true);
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setSelectedCustomer(null);
    setSelectedCustomerCheckIns([]);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedCustomer(null);
    setEditError(null);
    resetForm();
  };

  
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);

    try {
      const customerData = {
        ...formData,
        vehicles: vehicles
      };

      const response = await fetch('/api/admin/create-customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customerData),
      });

      const result = await response.json();

      if (result.success) {
        setCustomers(prev => [result.customer, ...prev]);
        setSuccessMessage(`Customer "${result.customer.name}" created successfully with ${result.customer.vehicles?.length || 0} vehicle(s)!`);
        handleCloseModal();
      } else {
        setCreateError(result.error || 'Failed to create customer');
      }
    } catch (err) {
      console.error('Error creating customer:', err);
      setCreateError('Failed to create customer. Please try again.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    
    setEditLoading(true);
    setEditError(null);

    try {
      const customerData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
        vehicles: vehicles
      };

      const response = await fetch(`/api/admin/customers/${selectedCustomer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customerData),
      });

      const result = await response.json();

      if (result.success) {
        // Update the customer in the local state
        setCustomers(prev => prev.map(customer => 
          customer.id === selectedCustomer.id ? result.customer : customer
        ));
        handleCloseEditModal();
      } else {
        setEditError(result.error || 'Failed to update customer');
      }
    } catch (err) {
      console.error('Error updating customer:', err);
      setEditError('Failed to update customer. Please try again.');
    } finally {
      setEditLoading(false);
    }
  };

  
    const isFormValid = () => {
    return formData.name.trim() &&
           formData.phone.trim() &&
           vehicles.length > 0 &&
           vehicles.every(vehicle => 
             vehicle.licensePlate.trim() &&
             vehicle.vehicleType.trim() &&
             vehicle.vehicleColor.trim()
           );
  };

  const getStatusColor = (isRegistered: boolean) => {
    return isRegistered 
      ? "bg-green-light-100 text-green-light-800 dark:bg-green-light-900/30 dark:text-green-light-300"
      : "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
  };

  const getStatusText = (isRegistered: boolean) => {
    return isRegistered ? "Registered" : "Walk-in";
  };

  const handleSort = (column: 'name' | 'totalVisits' | 'totalSpent' | 'lastVisit') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (column: 'name' | 'totalVisits' | 'totalSpent' | 'lastVisit') => {
    if (sortBy !== column) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    
    return sortOrder === 'asc' ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
      </svg>
    );
  };

  const totalCustomers = customers.length;
  const registeredCustomers = customers.filter(c => c.isRegistered).length;
  const totalRevenue = customers.reduce((sum, customer) => sum + customer.totalSpent, 0);

  const filteredCustomers = customers.filter(customer => {
    if (filterType === 'registered' && !customer.isRegistered) return false;
    if (filterType === 'unregistered' && customer.isRegistered) return false;
    return true;
  }).sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    switch (sortBy) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'totalVisits':
        aValue = a.totalVisits || 0;
        bValue = b.totalVisits || 0;
        break;
      case 'totalSpent':
        aValue = a.totalSpent || 0;
        bValue = b.totalSpent || 0;
        break;
      case 'lastVisit':
        aValue = a.lastVisit ? new Date(a.lastVisit).getTime() : 0;
        bValue = b.lastVisit ? new Date(b.lastVisit).getTime() : 0;
        break;
      default:
        return 0;
    }

    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-light-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageBreadCrumb pageTitle="Customer Database" />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCustomers}</p>
            </div>
            <div className="p-3 bg-blue-light-100 dark:bg-blue-light-900/30 rounded-lg">
              <svg className="w-6 h-6 text-blue-light-600 dark:text-blue-light-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Registered Customers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{registeredCustomers}</p>
            </div>
            <div className="p-3 bg-green-light-100 dark:bg-green-light-900/30 rounded-lg">
              <svg className="w-6 h-6 text-green-light-600 dark:text-green-light-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalRevenue?.toFixed(2) || 0}</p>
            </div>
            <div className="p-3 bg-green-light-100 dark:bg-green-light-900/30 rounded-lg">
              <svg className="w-6 h-6 text-green-light-600 dark:text-green-light-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search customers..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Search
              </button>
              {searchTerm && (
                <button
                  onClick={handleClearSearch}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'registered' | 'unregistered')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Customers</option>
              <option value="registered">Registered Only</option>
              <option value="unregistered">Walk-in Only</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'totalVisits' | 'totalSpent' | 'lastVisit')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="name">Sort by Name</option>
              <option value="totalVisits">Sort by Total Visits</option>
              <option value="totalSpent">Sort by Total Spent</option>
              <option value="lastVisit">Sort by Last Visit</option>
            </select>

            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-green-light-600 text-white rounded-lg hover:bg-green-light-700 focus:ring-2 focus:ring-green-light-500 focus:ring-offset-2 transition-colors"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Customer
          </button>
        </div>
      </div>

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

      {/* Success Message Display */}
      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-green-800 dark:text-green-200">{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Customers Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Customer Database</h2>
        </div>
        <div className="overflow-x-auto">
          {filteredCustomers.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 dark:text-gray-500 text-4xl mb-4">👥</div>
              <p className="text-gray-600 dark:text-gray-400">No customers found</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                {searchTerm || filterType !== 'all' 
                  ? 'Try adjusting your search or filters to see more results.'
                  : 'Add your first customer to get started.'
                }
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Name</span>
                      {getSortIcon('name')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vehicle</th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => handleSort('totalVisits')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Total Visits</span>
                      {getSortIcon('totalVisits')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => handleSort('totalSpent')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Total Spent</span>
                      {getSortIcon('totalSpent')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {customer.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          ID: {customer.id.slice(0, 8)}...
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-gray-900 dark:text-white">
                          {customer.phone}
                        </div>
                        {customer.email && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {customer.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        {customer.vehicles && customer.vehicles.length > 0 ? (
                          <>
                            <div className="text-sm text-gray-900 dark:text-white">
                              {customer.vehicles.find(v => v.is_primary)?.license_plate || customer.vehicles[0].license_plate}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {customer.vehicles.find(v => v.is_primary)?.vehicle_type || customer.vehicles[0].vehicle_type}
                              {customer.vehicles.find(v => v.is_primary)?.vehicle_model && ` • ${customer.vehicles.find(v => v.is_primary)?.vehicle_model}`}
                            </div>
                            {customer.vehicles.find(v => v.is_primary)?.vehicle_color && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {customer.vehicles.find(v => v.is_primary)?.vehicle_color}
                              </div>
                            )}
                            {customer.vehicles.length > 1 && (
                              <div className="text-xs text-blue-600 dark:text-blue-400">
                                +{customer.vehicles.length - 1} more vehicles
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            No vehicles
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {customer.totalVisits || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {customer?.totalSpent?.toFixed(2) || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(customer.isRegistered)}`}>
                        {getStatusText(customer.isRegistered)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleViewCustomer(customer)}
                          className="text-blue-light-600 hover:text-blue-light-500 dark:text-blue-light-400 dark:hover:text-blue-light-300 transition-colors"
                          title="View Details"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleEditCustomer(customer)}
                          className="text-green-light-600 hover:text-green-light-500 dark:text-green-light-400 dark:hover:text-green-light-300 transition-colors"
                          title="Edit Customer"
                        >
                          <PencilIcon className="w-4 h-4" />
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

            {/* Create Customer Modal */}
      <Modal isOpen={showCreateModal} onClose={handleCloseModal} className="max-w-lg">
        <div className="p-6">
          <form onSubmit={handleCreateCustomer}>
            {/* Modal Header */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Add New Customer</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Create a new customer profile for the car wash system
              </p>
            </div>

            {/* Modal Body */}
            <div className="space-y-5">
                {/* Error Display */}
                {createError && (
                  <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="text-red-800 dark:text-red-200 text-sm">{createError}</span>
                    </div>
                  </div>
                )}

                {/* Customer Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-light-500 focus:border-transparent"
                    placeholder="Enter customer name"
                  />
                </div>

                {/* Email (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-light-500 focus:border-transparent"
                    placeholder="Enter email address (optional)"
                  />
                </div>

                {/* Date of Birth (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    max={new Date().toISOString().split('T')[0]} // Prevents future dates
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-light-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Optional - helps with promotions and special offers
                  </p>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-light-500 focus:border-transparent"
                    placeholder="Enter phone number"
                  />
                </div>

                {/* Vehicles Section */}
                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Vehicles <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={addVehicle}
                      className="px-3 py-1 text-sm bg-green-light-600 text-white rounded-lg hover:bg-green-light-700 transition-colors"
                    >
                      + Add Vehicle
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {vehicles.map((vehicle, index) => (
                      <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                            Vehicle {index + 1}
                            {vehicle.isPrimary && (
                              <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded">
                                Primary
                              </span>
                            )}
                          </h4>
                          <div className="flex items-center space-x-2">
                            {!vehicle.isPrimary && (
                              <button
                                type="button"
                                onClick={() => setPrimaryVehicle(index)}
                                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                Set Primary
                              </button>
                            )}
                            {vehicles.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeVehicle(index)}
                                className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* License Plate */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              License Plate <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={vehicle.licensePlate}
                              onChange={(e) => handleVehicleChange(index, 'licensePlate', e.target.value)}
                              required
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-light-500 focus:border-transparent"
                              placeholder="Enter license plate"
                            />
                          </div>

                          {/* Vehicle Type */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Vehicle Type <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={vehicle.vehicleType}
                              onChange={(e) => handleVehicleChange(index, 'vehicleType', e.target.value)}
                              required
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-light-500 focus:border-transparent"
                            >
                              <option value="">Select vehicle type</option>
                              <option value="Sedan">Sedan</option>
                              <option value="SUV">SUV</option>
                              <option value="Truck">Truck</option>
                              <option value="Hatchback">Hatchback</option>
                              <option value="Coupe">Coupe</option>
                              <option value="Convertible">Convertible</option>
                              <option value="Van">Van</option>
                              <option value="Motorcycle">Motorcycle</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>

                          {/* Vehicle Make */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Vehicle Make
                            </label>
                            <input
                              type="text"
                              value={vehicle.vehicleMake}
                              onChange={(e) => handleVehicleChange(index, 'vehicleMake', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-light-500 focus:border-transparent"
                              placeholder="Enter vehicle make (optional)"
                            />
                          </div>

                          {/* Vehicle Model */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Vehicle Model
                            </label>
                            <input
                              type="text"
                              value={vehicle.vehicleModel}
                              onChange={(e) => handleVehicleChange(index, 'vehicleModel', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-light-500 focus:border-transparent"
                              placeholder="Enter vehicle model (optional)"
                            />
                          </div>

                          {/* Vehicle Color */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Vehicle Color <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={vehicle.vehicleColor}
                              onChange={(e) => handleVehicleChange(index, 'vehicleColor', e.target.value)}
                              required
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-light-500 focus:border-transparent"
                              placeholder="Enter vehicle color"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={createLoading}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              <button
                  type="submit"
                  disabled={createLoading || !isFormValid()}
                  className="px-4 py-2 bg-green-light-600 text-white rounded-lg hover:bg-green-light-700 focus:ring-2 focus:ring-green-light-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </div>
                  ) : (
                    'Create Customer'
                  )}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* View Customer Modal */}
      <Modal isOpen={showViewModal} onClose={handleCloseViewModal} className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {selectedCustomer && (
            <div>
              {/* Modal Header */}
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Customer Details</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  View detailed information for {selectedCustomer.name}
                </p>
              </div>

              {/* Customer Information */}
              <div className="space-y-6">
                {/* Basic Info Section */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Basic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                      <p className="text-gray-900 dark:text-white">{selectedCustomer.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                      <p className="text-gray-900 dark:text-white">{selectedCustomer.phone}</p>
                    </div>
                    {selectedCustomer.email && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                        <p className="text-gray-900 dark:text-white">{selectedCustomer.email}</p>
                      </div>
                    )}
                    {selectedCustomer.dateOfBirth && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date of Birth</label>
                        <p className="text-gray-900 dark:text-white">{new Date(selectedCustomer.dateOfBirth).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Vehicle Info Section */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Vehicle Information</h4>
                  {selectedCustomer.vehicles && selectedCustomer.vehicles.length > 0 ? (
                    <div className="space-y-4">
                      {selectedCustomer.vehicles.map((vehicle, index) => (
                        <div key={vehicle.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                              Vehicle {index + 1}
                              {vehicle.is_primary && (
                                <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded">
                                  Primary
                                </span>
                              )}
                            </h5>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">License Plate</label>
                              <p className="text-sm text-gray-900 dark:text-white font-mono">{vehicle.license_plate}</p>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Vehicle Type</label>
                              <p className="text-sm text-gray-900 dark:text-white">{vehicle.vehicle_type}</p>
                            </div>
                            {vehicle.vehicle_make && (
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Make</label>
                                <p className="text-sm text-gray-900 dark:text-white">{vehicle.vehicle_make}</p>
                              </div>
                            )}
                            {vehicle.vehicle_model && (
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Model</label>
                                <p className="text-sm text-gray-900 dark:text-white">{vehicle.vehicle_model}</p>
                              </div>
                            )}
                            {vehicle.vehicle_color && (
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Color</label>
                                <p className="text-sm text-gray-900 dark:text-white">{vehicle.vehicle_color}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">No vehicles registered</p>
                  )}
                </div>

                {/* Account Status Section */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Account Status & Statistics</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedCustomer.isRegistered)}`}>
                        {getStatusText(selectedCustomer.isRegistered)}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Total Visits</label>
                      <p className="text-gray-900 dark:text-white font-semibold">{selectedCustomer.totalVisits}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Total Spent</label>
                      <p className="text-gray-900 dark:text-white font-semibold">${selectedCustomer?.totalSpent?.toFixed(2)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Average Spending</label>
                      <p className="text-gray-900 dark:text-white font-semibold">${selectedCustomer?.averageSpending?.toFixed(2) || '0.00'}</p>
                    </div>
                    {selectedCustomer.lastVisit && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Last Visit</label>
                        <p className="text-gray-900 dark:text-white">{new Date(selectedCustomer.lastVisit).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Most Used Services Section */}
                {selectedCustomer.mostUsedServices && selectedCustomer.mostUsedServices.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Most Used Services</h4>
                    <div className="space-y-2">
                      {selectedCustomer.mostUsedServices.map((service, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span className="text-gray-900 dark:text-white">{service.service}</span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">{service.count} times</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Registration Info Section */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Registration Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Created On</label>
                      <p className="text-gray-900 dark:text-white">{new Date(selectedCustomer.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Last Updated</label>
                      <p className="text-gray-900 dark:text-white">{new Date(selectedCustomer.updatedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                {/* Check-in History Section */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Recent Check-ins</h4>
                  {customerDetailsLoading ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-light-600"></div>
                    </div>
                  ) : selectedCustomerCheckIns.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {selectedCustomerCheckIns.slice(0, 10).map((checkIn) => (
                        <div key={checkIn.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                                {checkIn.licensePlate} - {checkIn.vehicleType}
                              </h5>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                {new Date(checkIn.checkInTime).toLocaleDateString()} at {new Date(checkIn.checkInTime).toLocaleTimeString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                checkIn.status === 'completed' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                  : checkIn.status === 'in_progress'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                              }`}>
                                {checkIn.status.replace('_', ' ').toUpperCase()}
                              </span>
                              <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                                ${checkIn.totalAmount.toFixed(2)}
                              </p>
                            </div>
                          </div>
                          
                          {checkIn.services.length > 0 && (
                            <div className="mb-2">
                              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Services:</p>
                              <div className="flex flex-wrap gap-1">
                                {checkIn.services.map((service, index) => (
                                  <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded">
                                    {service.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
                            <span>Washer: {checkIn.assignedWasher}</span>
                            <span>Payment: {checkIn.paymentStatus}</span>
                          </div>
                          
                          {checkIn.specialInstructions && (
                            <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs">
                              <p className="font-medium text-yellow-800 dark:text-yellow-300">Special Instructions:</p>
                              <p className="text-yellow-700 dark:text-yellow-400">{checkIn.specialInstructions}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">No check-ins found</p>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
                <button
                  type="button"
                  onClick={handleCloseViewModal}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleCloseViewModal();
                    handleEditCustomer(selectedCustomer);
                  }}
                  className="px-4 py-2 bg-green-light-600 text-white rounded-lg hover:bg-green-light-700 focus:ring-2 focus:ring-green-light-500 focus:ring-offset-2 transition-colors"
                >
                  Edit Customer
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Edit Customer Modal */}
      <Modal isOpen={showEditModal} onClose={handleCloseEditModal} className="max-w-lg">
        <div className="p-6">
          <form onSubmit={handleUpdateCustomer}>
            {/* Modal Header */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Customer</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Update customer information for {selectedCustomer?.name}
              </p>
            </div>

            {/* Modal Body */}
            <div className="space-y-5">
                {/* Error Display */}
                {editError && (
                  <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="text-red-800 dark:text-red-200 text-sm">{editError}</span>
                    </div>
                  </div>
                )}

                {/* Customer Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-light-500 focus:border-transparent"
                    placeholder="Enter customer name"
                  />
                </div>

                {/* Email (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-light-500 focus:border-transparent"
                    placeholder="Enter email address (optional)"
                  />
                </div>

                {/* Date of Birth (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    max={new Date().toISOString().split('T')[0]} // Prevents future dates
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-light-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Optional - helps with promotions and special offers
                  </p>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-light-500 focus:border-transparent"
                    placeholder="Enter phone number"
                  />
                </div>

                {/* Vehicles Section */}
                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Vehicles <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={addVehicle}
                      className="px-3 py-1 text-sm bg-green-light-600 text-white rounded-lg hover:bg-green-light-700 transition-colors"
                    >
                      + Add Vehicle
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {vehicles.map((vehicle, index) => (
                      <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                            Vehicle {index + 1}
                            {vehicle.isPrimary && (
                              <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded">
                                Primary
                              </span>
                            )}
                          </h4>
                          <div className="flex items-center space-x-2">
                            {!vehicle.isPrimary && (
                              <button
                                type="button"
                                onClick={() => setPrimaryVehicle(index)}
                                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                Set Primary
                              </button>
                            )}
                            {vehicles.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeVehicle(index)}
                                className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* License Plate */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              License Plate <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={vehicle.licensePlate}
                              onChange={(e) => handleVehicleChange(index, 'licensePlate', e.target.value)}
                              required
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-light-500 focus:border-transparent"
                              placeholder="Enter license plate"
                            />
                          </div>

                          {/* Vehicle Type */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Vehicle Type <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={vehicle.vehicleType}
                              onChange={(e) => handleVehicleChange(index, 'vehicleType', e.target.value)}
                              required
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-light-500 focus:border-transparent"
                            >
                              <option value="">Select vehicle type</option>
                              <option value="Sedan">Sedan</option>
                              <option value="SUV">SUV</option>
                              <option value="Truck">Truck</option>
                              <option value="Hatchback">Hatchback</option>
                              <option value="Coupe">Coupe</option>
                              <option value="Convertible">Convertible</option>
                              <option value="Van">Van</option>
                              <option value="Motorcycle">Motorcycle</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>

                          {/* Vehicle Make */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Vehicle Make
                            </label>
                            <input
                              type="text"
                              value={vehicle.vehicleMake}
                              onChange={(e) => handleVehicleChange(index, 'vehicleMake', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-light-500 focus:border-transparent"
                              placeholder="Enter vehicle make (optional)"
                            />
                          </div>

                          {/* Vehicle Model */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Vehicle Model
                            </label>
                            <input
                              type="text"
                              value={vehicle.vehicleModel}
                              onChange={(e) => handleVehicleChange(index, 'vehicleModel', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-light-500 focus:border-transparent"
                              placeholder="Enter vehicle model (optional)"
                            />
                          </div>

                          {/* Vehicle Color */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Vehicle Color <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={vehicle.vehicleColor}
                              onChange={(e) => handleVehicleChange(index, 'vehicleColor', e.target.value)}
                              required
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-light-500 focus:border-transparent"
                              placeholder="Enter vehicle color"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  disabled={editLoading}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              <button
                  type="submit"
                  disabled={editLoading || !isFormValid()}
                  className="px-4 py-2 bg-green-light-600 text-white rounded-lg hover:bg-green-light-700 focus:ring-2 focus:ring-green-light-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </div>
                  ) : (
                    'Update Customer'
                  )}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};

export default OperationsCustomersPage; 