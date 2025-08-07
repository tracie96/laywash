"use client";
import React, { useState, useEffect } from 'react';
import Badge from '@/components/ui/badge/Badge';
import Button from '@/components/ui/button/Button';
import WorkerDetailModal from '@/components/carwash/WorkerDetailModal';

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
}

const WorkerListPage: React.FC = () => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'available' | 'unavailable'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'totalEarnings' | 'completedCheckIns' | 'averageRating'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Mock data for development
  useEffect(() => {
    const mockWorkers: Worker[] = [
      {
        id: '1',
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
        lastActive: new Date()
      },
      {
        id: '2',
        name: 'David Brown',
        email: 'david.brown@carwash.com',
        phone: '+1 (555) 987-6543',
        hourlyRate: 14.50,
        totalEarnings: 980.00,
        isAvailable: true,
        assignedAdminId: 'admin1',
        assignedAdminName: 'John Admin',
        totalCheckIns: 32,
        completedCheckIns: 30,
        averageRating: 4.6,
        createdAt: new Date('2024-02-01'),
        lastActive: new Date(Date.now() - 1000 * 60 * 30) // 30 minutes ago
      },
      {
        id: '3',
        name: 'Sarah Wilson',
        email: 'sarah.wilson@carwash.com',
        phone: '+1 (555) 456-7890',
        hourlyRate: 16.00,
        totalEarnings: 2100.00,
        isAvailable: false,
        assignedAdminId: 'admin2',
        assignedAdminName: 'Lisa Admin',
        totalCheckIns: 78,
        completedCheckIns: 75,
        averageRating: 4.9,
        createdAt: new Date('2023-12-10'),
        lastActive: new Date(Date.now() - 1000 * 60 * 60 * 2) // 2 hours ago
      },
      {
        id: '4',
        name: 'Robert Chen',
        email: 'robert.chen@carwash.com',
        phone: '+1 (555) 789-0123',
        hourlyRate: 15.50,
        totalEarnings: 850.00,
        isAvailable: true,
        assignedAdminId: 'admin2',
        assignedAdminName: 'Lisa Admin',
        totalCheckIns: 28,
        completedCheckIns: 26,
        averageRating: 4.7,
        createdAt: new Date('2024-02-15'),
        lastActive: new Date(Date.now() - 1000 * 60 * 15) // 15 minutes ago
      }
    ];

    setTimeout(() => {
      setWorkers(mockWorkers);
      setIsLoading(false);
    }, 1000);
  }, []);

  const filteredAndSortedWorkers = workers
    .filter(worker => {
      const matchesFilter = filter === 'all' || 
        (filter === 'available' && worker.isAvailable) ||
        (filter === 'unavailable' && !worker.isAvailable);
      
      const matchesSearch = searchTerm === '' || 
        worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        worker.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        worker.phone.includes(searchTerm);
      
      return matchesFilter && matchesSearch;
    })
    .sort((a, b) => {
      let aValue: string | number, bValue: string | number;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'totalEarnings':
          aValue = a.totalEarnings;
          bValue = b.totalEarnings;
          break;
        case 'completedCheckIns':
          aValue = a.completedCheckIns;
          bValue = b.completedCheckIns;
          break;
        case 'averageRating':
          aValue = a.averageRating;
          bValue = b.averageRating;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const calculateStats = () => {
    const stats = {
      total: workers.length,
      available: workers.filter(w => w.isAvailable).length,
      unavailable: workers.filter(w => !w.isAvailable).length,
      totalEarnings: workers.reduce((sum, w) => sum + w.totalEarnings, 0),
      totalCheckIns: workers.reduce((sum, w) => sum + w.completedCheckIns, 0),
      averageRating: workers.length > 0 ? workers.reduce((sum, w) => sum + w.averageRating, 0) / workers.length : 0
    };
    return stats;
  };

  const stats = calculateStats();

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: typeof sortBy) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  const getAvailabilityBadge = (isAvailable: boolean) => {
    return isAvailable ? 
      <Badge color="success">Available</Badge> : 
      <Badge color="warning">Unavailable</Badge>;
  };

  const handleViewWorker = (workerId: string) => {
    setSelectedWorkerId(workerId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedWorkerId(null);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading workers...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Worker Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage and monitor car washer performance
          </p>
        </div>
        <Button
          onClick={() => window.location.href = '/add-worker'}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Add New Worker
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Workers
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.total}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Available Workers
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.available}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Earnings
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${stats.totalEarnings.toFixed(2)}
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
                Avg. Rating
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.averageRating.toFixed(1)}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Filter */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              All ({stats.total})
            </button>
            <button
              onClick={() => setFilter('available')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'available'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Available ({stats.available})
            </button>
            <button
              onClick={() => setFilter('unavailable')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'unavailable'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Unavailable ({stats.unavailable})
            </button>
          </div>
        </div>
      </div>

      {/* Workers Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    <span>Worker</span>
                    {getSortIcon('name')}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Performance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('totalEarnings')}
                    className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    <span>Earnings</span>
                    {getSortIcon('totalEarnings')}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAndSortedWorkers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="text-gray-500 dark:text-gray-400">
                      <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <p className="text-lg font-medium">No workers found</p>
                      <p className="text-sm">
                        {searchTerm ? 'No workers match your search criteria.' : 'No workers found for the selected filter.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAndSortedWorkers.map((worker) => (
                  <tr key={worker.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {worker.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Assigned to: {worker.assignedAdminName}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-gray-900 dark:text-white">
                          {worker.phone}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {worker.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-gray-900 dark:text-white">
                          {worker.completedCheckIns}/{worker.totalCheckIns} completed
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Rating: {worker.averageRating.toFixed(1)} ⭐
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          ${worker.totalEarnings.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          ${worker.hourlyRate}/hr
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getAvailabilityBadge(worker.isAvailable)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewWorker(worker.id)}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.location.href = `/workers/edit/${worker.id}`}
                        >
                          Edit
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Worker Detail Modal */}
      {selectedWorkerId && (
        <WorkerDetailModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          workerId={selectedWorkerId}
        />
      )}
    </div>
  );
};

export default WorkerListPage; 