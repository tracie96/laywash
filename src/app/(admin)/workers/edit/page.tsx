"use client";
import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Button from '@/components/ui/button/Button';
import InputField from '@/components/form/input/InputField';

interface WorkerData {
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
  averageRating: number;
  createdAt: string;
  lastActive: string;
  assigned_location?: string;
}

const WorkerEditPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workerId = searchParams.get('id');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workerData, setWorkerData] = useState<WorkerData | null>(null);

  useEffect(() => {
    const fetchWorkerData = async () => {
      if (!workerId) {
        setError('No worker ID provided');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/admin/washers/${workerId}/details`);
        const data = await response.json();

        if (data.success) {
          setWorkerData(data.worker);
        } else {
          setError(data.error || 'Failed to fetch worker data');
        }
      } catch (err) {
        console.error('Error fetching worker data:', err);
        setError('Failed to connect to server');
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkerData();
  }, [workerId]);

  const handleSave = async () => {
    if (!workerData || !workerId) return;

    try {
      setIsSaving(true);
      setError(null);

      const response = await fetch(`/api/admin/washers/${workerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: workerData.name,
          email: workerData.email,
          phone: workerData.phone,
          isAvailable: workerData.isAvailable,
          assigned_location: workerData.assigned_location,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Use replace to ensure fresh data load when navigating back
        router.replace('/users/washers');
      } else {
        setError(data.error || 'Failed to update worker');
      }
    } catch (err) {
      console.error('Error updating worker:', err);
      setError('Failed to connect to server');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-light-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading worker data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !workerData) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Worker</h1>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error loading worker data</h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error || 'Worker not found'}</p>
            </div>
            <div className="ml-auto pl-3">
              <Button variant="outline" onClick={() => router.back()}>
                Go Back
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Edit Worker
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Update worker information and settings
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Full Name
            </label>
            <InputField
              type="text"
              value={workerData.name}
              onChange={(e) => setWorkerData(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            <InputField
              type="email"
              value={workerData.email}
              onChange={(e) => setWorkerData(prev => prev ? ({ ...prev, email: e.target.value }) : null)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Phone
            </label>
            <InputField
              type="tel"
              value={workerData.phone}
              onChange={(e) => setWorkerData(prev => prev ? ({ ...prev, phone: e.target.value }) : null)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Assigned Location
            </label>
            <InputField
              type="text"
              value={workerData.assigned_location}
              onChange={(e) => setWorkerData(prev => prev ? ({ ...prev, assigned_location: e.target.value }) : null)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Address
            </label>
            <InputField
              type="text"
              value={workerData.address}
              onChange={(e) => setWorkerData(prev => prev ? ({ ...prev, address: e.target.value }) : null)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Availability Status
            </label>
            <select
              value={workerData.isAvailable ? 'available' : 'unavailable'}
              onChange={(e) => setWorkerData(prev => prev ? ({ ...prev, isAvailable: e.target.value === 'available' }) : null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-light-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="available">Available</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </div>
        
        </div>
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Total Earnings
            </label>
            <InputField
              type="text"
              value={`$${workerData.totalEarnings.toFixed(2)}`}
              disabled
              className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Check-ins Completed
            </label>
            <InputField
              type="text"
              value={`${workerData.completedCheckIns} / ${workerData.totalCheckIns}`}
              disabled
              className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Average Rating
            </label>
            <InputField
              type="text"
              value={`⭐ ${workerData.averageRating.toFixed(1)}`}
              disabled
              className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WorkerEditPage; 