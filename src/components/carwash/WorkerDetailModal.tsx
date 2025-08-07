"use client";
import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import Badge from '@/components/ui/badge/Badge';
import Button from '@/components/ui/button/Button';

interface CarWashRecord {
  id: string;
  carModel: string;
  color: string;
  licensePlate: string;
  serviceType: string;
  price: number;
  rating: number;
  completedAt: Date;
  duration: number; // in minutes
  customerName: string;
  customerPhone: string;
}

interface Worker {
  id: string;
  name: string;
  email: string;
  phone: string;
  hourlyRate: number;
  totalEarnings: number;
  isAvailable: boolean;
  assignedAdminId: string;
  assignedAdminName: string;
  totalCheckIns: number;
  completedCheckIns: number;
  averageRating: number;
  createdAt: Date;
  lastActive: Date;
  address: string;
  emergencyContact: string;
  emergencyPhone: string;
  skills: string[];
  certifications: string[];
  notes: string;
}

interface WorkerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  workerId: string;
}

const WorkerDetailModal: React.FC<WorkerDetailModalProps> = ({
  isOpen,
  onClose,
  workerId
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'performance'>('overview');
  const [worker, setWorker] = useState<Worker | null>(null);
  const [carWashHistory, setCarWashHistory] = useState<CarWashRecord[]>([]);

  useEffect(() => {
    const loadWorkerData = async () => {
      setIsLoading(true);
      
      // Mock data - replace with actual API calls
      const mockWorker: Worker = {
        id: workerId,
        name: 'Mike Johnson',
        email: 'mike.johnson@carwash.com',
        phone: '+1 (555) 123-4567',
        hourlyRate: 15.00,
        totalEarnings: 1250.00,
        isAvailable: true,
        assignedAdminId: 'admin1',
        assignedAdminName: 'John Admin',
        totalCheckIns: 45,
        completedCheckIns: 42,
        averageRating: 4.8,
        createdAt: new Date('2024-01-15'),
        lastActive: new Date(),
        address: '123 Main St, City, State 12345',
        emergencyContact: 'Jane Johnson',
        emergencyPhone: '+1 (555) 987-6543',
        skills: ['Exterior Wash', 'Interior Cleaning', 'Waxing', 'Detailing'],
        certifications: ['Car Wash Safety', 'Customer Service Excellence'],
        notes: 'Reliable worker with excellent customer feedback. Specializes in premium detailing services.'
      };

      const mockCarWashHistory: CarWashRecord[] = [
        {
          id: '1',
          carModel: 'Toyota Camry',
          color: 'Red',
          licensePlate: 'ABC-1234',
          serviceType: 'Premium Wash',
          price: 45.00,
          rating: 5,
          completedAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
          duration: 45,
          customerName: 'John Smith',
          customerPhone: '+1 (555) 111-2222'
        },
        {
          id: '2',
          carModel: 'Honda Civic ',
          color: 'Blue',
          licensePlate: 'XYZ-5678',
          serviceType: 'Basic Wash',
          price: 25.00,
          rating: 4,
          completedAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
          duration: 30,
          customerName: 'Sarah Wilson',
          customerPhone: '+1 (555) 333-4444'
        },
        {
          id: '3',
          carModel: 'BMW X5 2024',
          color: 'Black',
          licensePlate: 'LUX-9999',
          serviceType: 'Full Detail',
          price: 120.00,
          rating: 5,
          completedAt: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
          duration: 120,
          customerName: 'Michael Brown',
          customerPhone: '+1 (555) 555-6666'
        },
        {
          id: '4',
          carModel: 'Ford F-150 2023',
          color: 'White',
          licensePlate: 'TRK-7777',
          serviceType: 'Truck Wash',
          price: 35.00,
          rating: 4,
          completedAt: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
          duration: 40,
          customerName: 'David Lee',
          customerPhone: '+1 (555) 777-8888'
        },
        {
          id: '5',
          carModel: 'Tesla Model 3 2024',
          color: 'Green',
          licensePlate: 'EV-2024',
          serviceType: 'Electric Vehicle Care',
          price: 55.00,
          rating: 5,
          completedAt: new Date(Date.now() - 1000 * 60 * 60 * 8), // 8 hours ago
          duration: 50,
          customerName: 'Emily Chen',
          customerPhone: '+1 (555) 999-0000'
        }
      ];

      setTimeout(() => {
        setWorker(mockWorker);
        setCarWashHistory(mockCarWashHistory);
        setIsLoading(false);
      }, 1000);
    };

    if (isOpen && workerId) {
      loadWorkerData();
    }
  }, [isOpen, workerId]);

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

  const getAvailabilityBadge = (isAvailable: boolean) => {
    return isAvailable ? 
      <Badge color="success">Available</Badge> : 
      <Badge color="warning">Unavailable</Badge>;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (isLoading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl">
        <div className="p-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading worker details...</p>
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-6xl">
      <div className="p-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {worker?.name}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Car Washer • {worker?.assignedAdminName}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {getAvailabilityBadge(worker?.isAvailable || false)}
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.location.href = `/workers/edit/${worker?.id}`}
            >
              Edit Worker
            </Button>
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
                    <p className="text-gray-900 dark:text-white">{worker?.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</label>
                    <p className="text-gray-900 dark:text-white">{worker?.phone}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</label>
                    <p className="text-gray-900 dark:text-white">{worker?.address}</p>
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
                    <p className="text-gray-900 dark:text-white">{worker?.emergencyContact}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</label>
                    <p className="text-gray-900 dark:text-white">{worker?.emergencyPhone}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Skills and Certifications */}
            <div className="grid  gap-6">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {worker?.skills.map((skill: string, index: number) => (
                    <Badge key={index} color="success">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
{/* 
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Certifications
                </h3>
                <div className="flex flex-wrap gap-2">
                  {worker.certifications.map((cert: string, index: number) => (
                    <Badge key={index} color="warning" className="text-xs">
                      {cert}
                    </Badge>
                  ))}
                </div>
              </div> */}
            </div>

            {/* Notes */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Notes
              </h3>
              <p className="text-gray-700 dark:text-gray-300">{worker?.notes}</p>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Car Wash History
              </h3>
              <Badge color="success">{carWashHistory.length} cars washed</Badge>
            </div>

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
                            ${record.price.toFixed(2)}
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
          </div>
        )}

        {activeTab === 'performance' && performanceStats && (
          <div className="space-y-6">
            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Total Cars Washed
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {performanceStats.totalCars}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Total Revenue
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      ${performanceStats.totalRevenue.toFixed(2)}
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
                      Average Rating
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {performanceStats.averageRating.toFixed(1)}
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Avg. Duration
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatDuration(performanceStats.averageDuration)}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Performance Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Efficiency Metrics</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                                              <span className="text-gray-600 dark:text-gray-400">Completion Rate</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {worker ? ((worker.completedCheckIns / worker.totalCheckIns) * 100).toFixed(1) : '0'}%
                        </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Average Cars/Day</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {(performanceStats.totalCars / 30).toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Revenue/Car</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        ${(performanceStats.totalRevenue / performanceStats.totalCars).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Quality Metrics</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">5-Star Ratings</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {carWashHistory.filter(r => r.rating === 5).length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Customer Satisfaction</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {(performanceStats.averageRating / 5 * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Premium Services</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {carWashHistory.filter(r => r.price > 40).length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default WorkerDetailModal; 