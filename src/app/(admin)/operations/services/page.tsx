"use client";
import React, { useState, useCallback, useEffect } from "react";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import { PlusIcon, TrashBinIcon } from "@/icons";
import { Modal } from "@/components/ui/modal";
import { useModal } from "@/hooks/useModal";
import { useAuth } from "@/context/AuthContext";

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  category: 'exterior' | 'interior' | 'engine' | 'vacuum' | 'complementary';
  washerCommissionPercentage: number;
  companyCommissionPercentage: number;
  maxWashersPerService: number;
  commissionNotes: string;
  isActive: boolean;
  popularity: number;
  createdAt: string;
  updatedAt: string;
}

interface CreateServiceForm {
  name: string;
  description: string;
  price: number;
  category: 'exterior' | 'interior' | 'engine' | 'vacuum' | 'complementary';
  duration: number;
  washerCommissionPercentage: number;
  companyCommissionPercentage: number;
  maxWashersPerService: number;
  commissionNotes: string;
}

const OperationsServicesPage: React.FC = () => {
  const { hasRole } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'exterior' | 'interior' | 'engine' | 'vacuum' | 'complementary'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const { isOpen: showCreateModal, openModal, closeModal } = useModal();
  const [createForm, setCreateForm] = useState<CreateServiceForm>({
    name: '',
    description: '',
    price: 0,
    category: 'exterior',
    duration: 30,
    washerCommissionPercentage: 40,
    companyCommissionPercentage: 60,
    maxWashersPerService: 2,
    commissionNotes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterCategory !== 'all') params.append('category', filterCategory);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      
      const response = await fetch(`/api/admin/services?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setServices(data.services);
      } else {
        setError(data.error || 'Failed to fetch services');
      }
    } catch {
      console.error('Error fetching services');
      setError('Failed to fetch services from server');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterCategory, filterStatus]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createForm.name || !createForm.duration) {
      setError('Please fill in all required fields');
      return;
    }


    if (createForm.duration <= 0) {
      setError('Duration must be greater than 0');
      return;
    }

    if (createForm.washerCommissionPercentage + createForm.companyCommissionPercentage !== 100) {
      setError('Washer and company commission percentages must equal 100%');
      return;
    }

    if (createForm.maxWashersPerService < 1) {
      setError('Maximum washers per service must be at least 1');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createForm),
      });

      const data = await response.json();

      if (data.success) {
        closeModal();
        setCreateForm({
          name: '',
          description: '',
          price: 0,
          category: 'exterior',
          duration: 30,
          washerCommissionPercentage: 40,
          companyCommissionPercentage: 60,
          maxWashersPerService: 2,
          commissionNotes: ''
        });
        fetchServices(); 
      } else {
        setError(data.error || 'Failed to create service');
      }
    } catch {
      setError('Failed to create service');
    } finally {
      setSubmitting(false);
    }
  };

  const handleServiceAction = async (serviceId: string, action: 'toggle' | 'delete') => {
    try {
      if (action === 'delete') {
        const response = await fetch(`/api/admin/services/${serviceId}`, {
          method: 'DELETE',
        });
        const data = await response.json();
        
        if (data.success) {
          fetchServices();
        } else {
          setError(data.error || 'Failed to delete service');
        }
      } else if (action === 'toggle') {
        const currentService = services.find(s => s.id === serviceId);
        if (!currentService) return;

        const response = await fetch(`/api/admin/services/${serviceId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            isActive: !currentService.isActive
          }),
        });

        const data = await response.json();

        if (data.success) {
          fetchServices(); 
        } else {
          setError(data.error || 'Failed to update service');
        }
      }
    } catch {
      setError('Failed to perform action');
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive 
      ? "bg-green-light-100 text-green-light-800 dark:bg-green-light-900/30 dark:text-green-light-300"
      : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "exterior":
        return "bg-blue-light-100 text-blue-light-800 dark:bg-blue-light-900/30 dark:text-blue-light-300";
      case "interior":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      case "engine":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
      case "vacuum":
        return "bg-green-light-100 text-green-light-800 dark:bg-green-light-900/30 dark:text-green-light-300";
      case "complementary":
        return "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "exterior": return "Exterior";
      case "interior": return "Interior";
      case "engine": return "Engine";
      case "vacuum": return "Vacuum";
      case "complementary": return "Complementary";
      default: return category;
    }
  };

  const totalServices = services.length;
  const activeServices = services.filter(s => s.isActive).length;
  const averagePrice = services.length > 0 ? services.reduce((sum, service) => sum + service.price, 0) / services.length : 0;

  const filteredServices = services.filter(service => {
    if (filterCategory !== 'all' && service.category !== filterCategory) return false;
    if (filterStatus !== 'all') {
      if (filterStatus === 'active' && !service.isActive) return false;
      if (filterStatus === 'inactive' && service.isActive) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-light-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageBreadCrumb pageTitle="Service Management" />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Services</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalServices}</p>
            </div>
            <div className="p-3 bg-blue-light-100 dark:bg-blue-light-900/30 rounded-lg">
              <svg className="w-6 h-6 text-blue-light-600 dark:text-blue-light-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Services</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeServices}</p>
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
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Average Price</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">₦ {averagePrice.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-green-light-100 dark:bg-green-light-900/3q0 rounded-lg">
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
            <input
              type="text"
              placeholder="Search services..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as 'all' | 'exterior' | 'interior' | 'engine' | 'vacuum' | 'complementary')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              <option value="exterior">Exterior</option>
              <option value="interior">Interior</option>
              <option value="engine">Engine</option>
              <option value="vacuum">Vacuum</option>
              <option value="complementary">Complementary</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          {hasRole('super_admin') && (
            <button
              onClick={openModal}
              className="inline-flex items-center px-4 py-2 bg-green-light-600 text-white rounded-lg hover:bg-green-light-700 focus:ring-2 focus:ring-green-light-500 focus:ring-offset-2 transition-colors"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Service
            </button>
          )}
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

      {/* Services Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Service Management</h2>
        </div>
        <div className="overflow-x-auto">
          {filteredServices.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 dark:text-gray-500 text-4xl mb-4">🔧</div>
              <p className="text-gray-600 dark:text-gray-400">No services found</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                {searchTerm || filterCategory !== 'all' || filterStatus !== 'all'
                  ? 'Try adjusting your search or filters to see more results.'
                  : 'Add your first service to get started.'
                }
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Service Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Commission</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Max Washers</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredServices.map((service) => (
                  <tr key={service.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {service.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          ID: {service.id.slice(0, 8)}...
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                      {service.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      ₦ {service.price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {service.duration} min
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(service.category)}`}>
                        {getCategoryLabel(service.category)}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="text-xs">
                        <div>Washer: {service.washerCommissionPercentage}%</div>
                        <div>Company: {service.companyCommissionPercentage}%</div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {service.maxWashersPerService}
                    </td>
                
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(service.isActive)}`}>
                        {service.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleServiceAction(service.id, 'toggle')}
                          className={`${
                            service.isActive 
                              ? 'text-orange-600 hover:text-orange-500 dark:text-orange-400 dark:hover:text-orange-300'
                              : 'text-green-600 hover:text-green-500 dark:text-green-400 dark:hover:text-green-300'
                          }`}
                          title={service.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {service.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button 
                          onClick={() => handleServiceAction(service.id, 'delete')}
                          className="text-error-600 hover:text-error-500 dark:text-error-400 dark:hover:text-error-300"
                          title="Delete"
                        >
                          <TrashBinIcon className="w-4 h-4" />
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

      {/* Create Service Modal */}
      {hasRole('super_admin') && (
        <Modal
          isOpen={showCreateModal}
          onClose={closeModal}
          className="max-w-3xl p-6"
        >
        
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add New Service</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Create a new car wash service with custom commission settings
          </p>
        </div>

        <form onSubmit={handleCreateService} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Service Name
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter service name"
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
                  placeholder="Enter service description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Price (₦)
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
                    Duration (min)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={createForm.duration}
                    onChange={(e) => setCreateForm({...createForm, duration: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="30"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={createForm.category}
                  onChange={(e) => setCreateForm({...createForm, category: e.target.value as 'exterior' | 'interior' | 'engine' | 'vacuum' | 'complementary'})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="exterior">Exterior</option>
                  <option value="interior">Interior</option>
                  <option value="engine">Engine</option>
                  <option value="vacuum">Vacuum</option>
                  <option value="complementary">Complementary</option>
                </select>
              </div>

              {/* Commission Settings */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Commission Settings
                </h4>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Washer Commission (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={createForm.washerCommissionPercentage}
                      onChange={(e) => {
                        const washerPercentage = parseFloat(e.target.value) || 0;
                        setCreateForm({
                          ...createForm,
                          washerCommissionPercentage: washerPercentage,
                          companyCommissionPercentage: 100 - washerPercentage
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="40"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Company Commission (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={createForm.companyCommissionPercentage}
                      onChange={(e) => {
                        const companyPercentage = parseFloat(e.target.value) || 0;
                        setCreateForm({
                          ...createForm,
                          companyCommissionPercentage: companyPercentage,
                          washerCommissionPercentage: 100 - companyPercentage
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="60"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Max Washers Per Service
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={createForm.maxWashersPerService}
                      onChange={(e) => setCreateForm({...createForm, maxWashersPerService: parseInt(e.target.value) || 1})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="2"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Commission Notes
                    </label>
                    <input
                      type="text"
                      value={createForm.commissionNotes}
                      onChange={(e) => setCreateForm({...createForm, commissionNotes: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Optional notes"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-green-light-600 text-white rounded-lg hover:bg-green-light-700 disabled:bg-green-light-400 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Creating...' : 'Create Service'}
                </button>
              </div>
            </form>
        </Modal>
      )}
    </div>
  );
};

export default OperationsServicesPage; 