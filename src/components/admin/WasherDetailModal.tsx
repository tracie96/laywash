"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/ui/modal';
import { ExpandableImage } from '@/components/ui/ExpandableImage';

interface CarWashRecord {
  id: string;
  carModel: string;
  color: string;
  licensePlate: string;
  serviceType: string;
  price: number;
  rating: number;
  completedAt: Date | string;
  duration: number;
  customerName: string;
  customerPhone: string;
}

interface WasherProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalEarnings: number;
  isAvailable: boolean;
  assignedAdminId: string | null;
  assignedAdminName: string;
  totalCheckIns: number;
  completedCheckIns: number;
  averageRating: number;
  createdAt: Date | string;
  lastActive: Date | string;
  assigned_location: string;
  address: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  skills?: string[];
  certifications?: string[];
  notes?: string;
  picture_url?: string | null;
}

interface WasherDetailModalProps {
  washer: WasherProfile | null;
  isOpen: boolean;
  onClose: () => void;
}

const WasherDetailModal: React.FC<WasherDetailModalProps> = ({
  washer,
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'performance'>('overview');
  const [carWashHistory, setCarWashHistory] = useState<CarWashRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchWasherHistory = useCallback(async () => {
    if (!washer) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/washers/${washer.id}/details`);
      const data = await response.json();
      
      if (data.success) {
        setCarWashHistory(data.carWashHistory || []);
      }
    } catch (error) {
      console.error('Error fetching washer history:', error);
    } finally {
      setLoading(false);
    }
  }, [washer]);

  useEffect(() => {
    if (washer && isOpen) {
      fetchWasherHistory();
    }
  }, [washer, isOpen, fetchWasherHistory]);

  if (!washer) return null;

  const formatDate = (date: Date | string) => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      if (isNaN(dateObj.getTime())) {
        return 'Invalid date';
      }
      
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(dateObj);
    } catch {
      return 'Invalid date';
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getAvailabilityBadge = (isAvailable: boolean) => {
    return isAvailable ? 
      <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        Available
      </span> : 
      <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
        Unavailable
      </span>;
  };

  const calculatePerformanceStats = () => {
    if (!carWashHistory.length) return null;

    const totalRevenue = carWashHistory.reduce((sum, record) => sum + record.price, 0);
    const averageRating = carWashHistory.reduce((sum, record) => sum + record.rating, 0) / carWashHistory.length;
    const totalDuration = carWashHistory.reduce((sum, record) => sum + record.duration, 0);
    const averageDuration = totalDuration / carWashHistory.length;

    return {
      totalRevenue,
      averageRating,
      totalDuration,
      averageDuration,
      totalCars: carWashHistory.length
    };
  };

  const performanceStats = calculatePerformanceStats();

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-6xl">
      <div className="p-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-start space-x-4">
            {/* Profile Picture */}
            <div className="flex-shrink-0">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600">
                {washer.picture_url ? (
                  <ExpandableImage
                    src={washer.picture_url}
                    alt={`${washer.name}'s profile`}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                    <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
            
            {/* Washer Info */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                {washer.name}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1 text-lg">
                Car Washer • {washer.assignedAdminName}
              </p>
              <div className="flex items-center mt-2 space-x-3">
                {getAvailabilityBadge(washer.isAvailable)}
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Member since {formatDate(washer.createdAt)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'history', label: 'Car Wash History' },
              { id: 'performance', label: 'Performance' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'overview' | 'history' | 'performance')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Contact Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
                    <p className="text-gray-900 dark:text-white">{washer.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</label>
                    <p className="text-gray-900 dark:text-white">{washer.phone}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</label>
                    <p className="text-gray-900 dark:text-white">{washer.address}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Emergency Contact
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</label>
                    <p className="text-gray-900 dark:text-white">{washer.emergencyContact || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</label>
                    <p className="text-gray-900 dark:text-white">{washer.emergencyPhone || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Work Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Work Details
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Assigned Location</label>
                    <p className="text-gray-900 dark:text-white">{washer.assigned_location}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Check-ins</label>
                    <p className="text-gray-900 dark:text-white">{washer.totalCheckIns}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Completed Check-ins</label>
                    <p className="text-gray-900 dark:text-white">{washer.completedCheckIns}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Skills & Certifications
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Skills</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {(washer.skills || []).map((skill, index) => (
                        <span
                          key={index}
                          className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Certifications</label>
                    <p className="text-gray-900 dark:text-white">
                      {(washer.certifications || []).length > 0 ? (washer.certifications || []).join(', ') : 'None'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {washer.notes && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Additional Notes
                </h3>
                <p className="text-gray-700 dark:text-gray-300">{washer.notes}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Car Wash History
              </h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {carWashHistory.length} cars washed
              </span>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Loading history...</p>
              </div>
            ) : carWashHistory.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No completed car washes
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    This washer hasn&apos;t completed any car wash services yet.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Car Details
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Service
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Rating
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Completed
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {carWashHistory.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {record.carModel}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {record.licensePlate}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm text-gray-900 dark:text-white">
                                {record.serviceType}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {formatDuration(record.duration)}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm text-gray-900 dark:text-white">
                                {record.customerName}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {record.customerPhone}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              ₦ {record.price.toFixed(2)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className="text-sm text-gray-900 dark:text-white mr-1">
                                {record.rating}
                              </span>
                              <span className="text-yellow-500">⭐</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {formatDate(record.completedAt)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Performance Statistics
            </h3>
            
            {performanceStats ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Earnings</p>
                      <p className="text-2xl font-semibold text-gray-900 dark:text-white">₦{performanceStats.totalRevenue.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Cars Washed</p>
                      <p className="text-2xl font-semibold text-gray-900 dark:text-white">{performanceStats.totalCars}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Average Rating</p>
                      <p className="text-2xl font-semibold text-gray-900 dark:text-white">{performanceStats.averageRating.toFixed(1)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg. Duration</p>
                      <p className="text-2xl font-semibold text-gray-900 dark:text-white">{formatDuration(performanceStats.averageDuration)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No performance data available
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Performance statistics will appear here once the washer completes some car washes.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Close Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default WasherDetailModal;
