"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/button/Button';
import InputField from '@/components/form/input/InputField';

const WorkerEditPage: React.FC = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Mock worker data
  const [workerData, setWorkerData] = useState({
    name: 'Mike Johnson',
    email: 'mike.johnson@carwash.com',
    phone: '+1 (555) 123-4567',
    hourlyRate: 15.00,
    isAvailable: true,
    assignedAdminId: 'admin1'
  });

  useEffect(() => {
    // Simulate loading worker data
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    router.push('/workers/list');
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading worker data...</p>
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

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Full Name
            </label>
            <InputField
              type="text"
              value={workerData.name}
              onChange={(e) => setWorkerData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            <InputField
              type="email"
              value={workerData.email}
              onChange={(e) => setWorkerData(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Phone
            </label>
            <InputField
              type="tel"
              value={workerData.phone}
              onChange={(e) => setWorkerData(prev => ({ ...prev, phone: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Hourly Rate
            </label>
            <InputField
              type="number"
              value={workerData.hourlyRate.toString()}
              onChange={(e) => setWorkerData(prev => ({ ...prev, hourlyRate: parseFloat(e.target.value) || 0 }))}
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