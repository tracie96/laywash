"use client";
import React, { useState, useEffect } from "react";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import { useRouter } from "next/navigation";
import WasherDetailModal from "@/components/admin/WasherDetailModal";
import { LocationDisplay } from "@/components/ui/LocationDisplay";

interface Washer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  totalEarnings: number;
  isAvailable: boolean;
  assignedAdminId: string | null;
  assignedAdminName: string;
  totalCheckIns: number;
  completedCheckIns: number;
  assigned_location: string;
  averageRating: number;
  createdAt: string;
  lastActive: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  skills?: string[];
  certifications?: string[];
  notes?: string;
  picture_url?: string | null;
}

const UsersWashersPage: React.FC = () => {
  const [washers, setWashers] = useState<Washer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'unavailable'>('all');
  const [viewingWasher, setViewingWasher] = useState<Washer | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchWashers();
  }, []);

  const fetchWashers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/washers');
      const data = await response.json();
      
      if (data.success) {
        setWashers(data.washers);
      } else {
        setError(data.error || 'Failed to fetch washers');
      }
    } catch (err) {
      console.error('Error fetching washers:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  // Filter washers based on selected status
  const filteredWashers = filterStatus === 'all' 
    ? washers 
    : washers.filter(w => 
        filterStatus === 'available' ? w.isAvailable : !w.isAvailable
      );

  // Calculate totals based on filtered data
  const totalWashers = filteredWashers.length;
  const activeWashers = filteredWashers.filter(w => w.isAvailable).length;
  const unavailableWashers = filteredWashers.filter(w => !w.isAvailable).length;
  const totalCheckInsCompleted = filteredWashers.reduce((sum, washer) => sum + washer.completedCheckIns, 0);

  const handleViewWasher = (washer: Washer) => {
    setViewingWasher(washer);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setViewingWasher(null);
  };

  const handleDeactivateWasher = async (washerId: string, washerName: string) => {
    const confirmDeactivate = window.confirm(
      `Are you sure you want to deactivate ${washerName}? They will no longer be able to access the system or receive new assignments.`
    );
    
    if (!confirmDeactivate) return;

    try {
      const response = await fetch(`/api/admin/washers/${washerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: false }),
      });

      const data = await response.json();

      if (data.success) {
        // Refresh the washers list
        await fetchWashers();
        alert(`${washerName} has been successfully deactivated.`);
      } else {
        alert(`Failed to deactivate ${washerName}: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error deactivating washer:', err);
      alert(`Failed to deactivate ${washerName}. Please try again.`);
    }
  };

  const getStatusColor = (isAvailable: boolean) => {
    return isAvailable
      ? "bg-green-light-100 text-green-light-800 dark:bg-green-light-900/30 dark:text-green-light-300"
      : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
  };

  const getStatusText = (isAvailable: boolean) => {
    return isAvailable ? "Available" : "Unavailable";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-light-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading washers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageBreadCrumb pageTitle="Manage Washers" />
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error loading washers</h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={fetchWashers}
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
      <PageBreadCrumb pageTitle="Manage Washers" />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Washers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalWashers}</p>
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
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Available Washers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeWashers}</p>
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
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Unavailable Washers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{unavailableWashers}</p>
            </div>
            <div className="p-3 bg-gray-100 dark:bg-gray-900/30 rounded-lg">
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed Check-ins</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCheckInsCompleted}</p>
            </div>
            <div className="p-3 bg-green-light-100 dark:bg-green-light-900/30 rounded-lg">
              <svg className="w-6 h-6 text-green-light-600 dark:text-green-light-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <button
          onClick={fetchWashers}
          className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
        <button 
          onClick={() => router.push('/add-worker')}
          className="bg-green-light-600 hover:bg-green-light-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
        >
          Add New Washer
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 mb-4">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
            filterStatus === 'all'
              ? 'bg-green-light-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          All Washers
        </button>
        <button
          onClick={() => setFilterStatus('available')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
            filterStatus === 'available'
              ? 'bg-green-light-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Available Washers
        </button>
        <button
          onClick={() => setFilterStatus('unavailable')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
            filterStatus === 'unavailable'
              ? 'bg-green-light-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Unavailable Washers
        </button>
      </div>

      {/* Washers Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Washer Management
              {filterStatus !== 'all' && (
                <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                  ({filterStatus === 'available' ? 'Available' : 'Unavailable'} Washers)
                </span>
              )}
            </h2>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing {filteredWashers.length} of {washers.length} washers
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          {filteredWashers.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto h-12 w-12 text-gray-400">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                {filterStatus === 'all' 
                  ? 'No washers found' 
                  : filterStatus === 'available' 
                    ? 'No available washers found' 
                    : 'No unavailable washers found'
                }
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {filterStatus === 'all' 
                  ? 'Get started by creating a new washer account.'
                  : filterStatus === 'available'
                    ? 'All washers are currently unavailable.'
                    : 'All washers are currently available.'
                }
              </p>
              {filterStatus === 'all' && (
                <div className="mt-6">
                  <button 
                    onClick={() => router.push('/add-worker')}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-light-600 hover:bg-green-light-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-light-500"
                  >
                    <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add New Washer
                  </button>
                </div>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Join Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Check-ins</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Earnings</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Assigned Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredWashers?.map((washer) => (
                  <tr key={washer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {washer.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {washer.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {washer.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(washer.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(washer.isAvailable)}`}>
                        {getStatusText(washer.isAvailable)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {washer.completedCheckIns} / {washer.totalCheckIns}
                    </td>
                
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      ${washer.totalEarnings.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <LocationDisplay locationId={washer.assigned_location} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleViewWasher(washer)}
                          className="text-green-600 hover:text-green-500 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                        >
                          View Details
                        </button>
                        <button 
                          onClick={() => router.push(`/workers/edit?id=${washer.id}`)}
                          className="text-blue-light-600 hover:text-blue-light-500 dark:text-blue-light-400 dark:hover:text-blue-light-300 transition-colors"
                        >
                          Edit
                        </button>
                    
                        <button 
                          onClick={() => handleDeactivateWasher(washer.id, washer.name)}
                          className="text-error-600 hover:text-error-500 dark:text-error-400 dark:hover:text-error-300 transition-colors"
                        >
                          Deactivate
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

      {/* Washer Detail Modal */}
      <WasherDetailModal
        washer={viewingWasher}
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
      />
    </div>
  );
};

export default UsersWashersPage; 