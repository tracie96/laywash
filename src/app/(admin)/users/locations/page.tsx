"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Location, LocationStats } from '../../../../types/location';
import { PlusIcon, SearchIcon, EditIcon, TrashBinIcon, AlertIcon, CheckCircleIcon, CloseIcon, EyeIcon } from '../../../../icons';
import { Modal } from '../../../../components/ui/modal';
import { useModal } from '../../../../hooks/useModal';

const LocationsPage: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);
  const [stats, setStats] = useState<LocationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLGA, setSelectedLGA] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [uniqueLGAs, setUniqueLGAs] = useState<string[]>([]);
  const createModal = useModal();
  const editModal = useModal();
  const viewModal = useModal();
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [viewingLocation, setViewingLocation] = useState<Location | null>(null);
  const [workers, setWorkers] = useState<Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    is_active: boolean;
  }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state for create/edit
  const [formData, setFormData] = useState({
    address: '',
    lga: '',
    is_active: true
  });

  useEffect(() => {
    fetchLocations();
    fetchStats();
    fetchUniqueLGAs();
  }, []);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/locations');
      const result = await response.json();
      
      if (result.success) {
        setLocations(result.data);
        setError(null);
      } else {
        throw new Error(result.error || 'Failed to fetch locations');
      }
    } catch (err) {
      setError('Failed to fetch locations');
      console.error('Error fetching locations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/locations/stats');
      const result = await response.json();
      
      if (result.success) {
        setStats(result.data);
      } else {
        console.error('Failed to fetch stats:', result.error);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchUniqueLGAs = async () => {
    try {
      const response = await fetch('/api/admin/locations/lgas');
      const result = await response.json();
      
      if (result.success) {
        setUniqueLGAs(result.data);
      } else {
        console.error('Failed to fetch LGAs:', result.error);
      }
    } catch (err) {
      console.error('Error fetching LGAs:', err);
    }
  };

  const filterLocations = useCallback(() => {
    let filtered = [...locations];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(location =>
        location.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.lga.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // LGA filter
    if (selectedLGA) {
      filtered = filtered.filter(location => location.lga === selectedLGA);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(location => 
        statusFilter === 'active' ? location.is_active : !location.is_active
      );
    }

    setFilteredLocations(filtered);
  }, [locations, searchTerm, selectedLGA, statusFilter]);

  useEffect(() => {
    filterLocations();
  }, [filterLocations]);

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const result = await response.json();
      
      if (result.success) {
        createModal.closeModal();
        setFormData({ address: '', lga: '', is_active: true });
        setSuccessMessage('Location created successfully!');
        fetchLocations();
        fetchStats();
        fetchUniqueLGAs();
      } else {
        setError(result.error || 'Failed to create location');
      }
    } catch (err) {
      setError('Failed to create location. Please try again.');
      console.error('Error creating location:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLocation) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/admin/locations/${editingLocation.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setEditingLocation(null);
        editModal.closeModal();
        setFormData({ address: '', lga: '', is_active: true });
        setSuccessMessage('Location updated successfully!');
        fetchLocations();
        fetchStats();
      } else {
        setError(result.error || 'Failed to update location');
      }
    } catch (err) {
      setError('Failed to update location. Please try again.');
      console.error('Error updating location:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLocation = async (id: string) => {
    if (window.confirm('Are you sure you want to deactivate this location?')) {
      try {
        const response = await fetch(`/api/admin/locations/${id}`, {
          method: 'DELETE',
        });
        
        const result = await response.json();
        
        if (result.success) {
          fetchLocations();
          fetchStats();
        } else {
          console.error('Failed to delete location:', result.error);
        }
      } catch (err) {
        console.error('Error deleting location:', err);
      }
    }
  };

  const openEditModal = (location: Location) => {
    setEditingLocation(location);
    setFormData({
      address: location.address,
      lga: location.lga,
      is_active: location.is_active
    });
    editModal.openModal();
  };

  const openViewModal = async (location: Location) => {
    setViewingLocation(location);
    try {
      const response = await fetch(`/api/admin/locations/${location.id}/workers`);
      const result = await response.json();
      if (result.success) {
        setWorkers(result.data);
      } else {
        setWorkers([]);
      }
    } catch (err) {
      console.error('Error fetching workers:', err);
      setWorkers([]);
    }
    viewModal.openModal();
  };

  const closeCreateModal = () => {
    createModal.closeModal();
    setFormData({ address: '', lga: '', is_active: true });
  };

  const closeEditModal = () => {
    editModal.closeModal();
    setEditingLocation(null);
    setFormData({ address: '', lga: '', is_active: true });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Locations Management</h1>
          <p className="text-gray-600">Manage car wash locations and their details</p>
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertIcon className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setError(null)}
                  className="inline-flex text-red-400 hover:text-red-600"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-5 w-5 text-green-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-800">{successMessage}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setSuccessMessage(null)}
                  className="inline-flex text-green-400 hover:text-green-600"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <div className="w-6 h-6 bg-blue-600 rounded"></div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Locations</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.total_locations}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <div className="w-6 h-6 bg-green-600 rounded"></div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Locations</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.active_locations}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <div className="w-6 h-6 bg-yellow-600 rounded"></div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Inactive Locations</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.inactive_locations}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <div className="w-6 h-6 bg-purple-600 rounded"></div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Unique LGAs</p>
                  <p className="text-2xl font-semibold text-gray-900">{uniqueLGAs.length}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search locations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* LGA Filter */}
                <select
                  value={selectedLGA}
                  onChange={(e) => setSelectedLGA(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All LGAs</option>
                  {uniqueLGAs.map((lga) => (
                    <option key={lga} value={lga}>{lga}</option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Create Button */}
              <button
                onClick={createModal.openModal}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Add Location
              </button>
            </div>
          </div>
        </div>

        {/* Locations Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    LGA
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLocations.map((location) => (
                  <tr key={location.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{location.address}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{location.lga}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        location.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {location.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(location.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openViewModal(location)}
                          className="text-green-600 hover:text-green-900"
                          title="View Details"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(location)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit"
                        >
                          <EditIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteLocation(location.id)}
                          className="text-red-600 hover:text-red-900"
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
          </div>

          {filteredLocations.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg">No locations found</div>
              <div className="text-gray-400 text-sm mt-2">
                {searchTerm || selectedLGA || statusFilter !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'Create your first location to get started'}
              </div>
            </div>
          )}
        </div>

        {/* Create Location Modal */}
        <Modal isOpen={createModal.isOpen} onClose={createModal.closeModal} className="max-w-md mx-4">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Location</h3>
            <form onSubmit={handleCreateLocation}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter full address"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  LGA
                </label>
                <input
                  type="text"
                  required
                  value={formData.lga}
                  onChange={(e) => setFormData({ ...formData, lga: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter Local Government Area"
                />
              </div>
              
              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Active Location</span>
                </label>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </div>
                  ) : (
                    'Create'
                  )}
                </button>
              </div>
            </form>
          </div>
        </Modal>

        {/* Edit Location Modal */}
        <Modal isOpen={editModal.isOpen} onClose={editModal.closeModal}>
          <div className="p-6 w-96">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Location</h3>
            <form onSubmit={handleUpdateLocation}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter full address"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  LGA
                </label>
                <input
                  type="text"
                  required
                  value={formData.lga}
                  onChange={(e) => setFormData({ ...formData, lga: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter Local Government Area"
                />
              </div>
              
              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Active Location</span>
                </label>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:border-transparent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </div>
                  ) : (
                    'Update'
                  )}
                </button>
              </div>
            </form>
          </div>
        </Modal>

        {/* View Location Details Modal */}
        <Modal isOpen={viewModal.isOpen} onClose={viewModal.closeModal} className="max-w-4xl mx-4">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Location Details</h3>
            {viewingLocation && (
              <div className="space-y-6">
                {/* Location Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Location Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Address</label>
                      <p className="text-sm text-gray-900">{viewingLocation.address}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">LGA</label>
                      <p className="text-sm text-gray-900">{viewingLocation.lga}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Status</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        viewingLocation.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {viewingLocation.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Created</label>
                      <p className="text-sm text-gray-900">
                        {new Date(viewingLocation.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Workers List */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Workers at this Location</h4>
                  {workers.length > 0 ? (
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Email
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Phone
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {workers.map((worker) => (
                            <tr key={worker.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {worker.first_name} {worker.last_name}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{worker.email}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{worker.phone || 'N/A'}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  worker.is_active
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {worker.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">No workers assigned to this location</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={viewModal.closeModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:ring-2 focus:ring-gray-500"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default LocationsPage;
