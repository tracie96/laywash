"use client";
import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Input from '../../../components/form/input/InputField';
import Label from '../../../components/form/Label';
import Button from '../../../components/ui/button/Button';
import { ChevronLeftIcon } from '../../../icons';
import Link from 'next/link';

const AddWorkerPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    hourlyRate: '',
    assignedAdmin: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { createCarWasher } = useAuth();
  const router = useRouter();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.phone) {
      setError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const hourlyRate = formData.hourlyRate ? parseFloat(formData.hourlyRate) : undefined;
      const result = await createCarWasher(
        formData.name,
        formData.email,
        formData.phone,
        hourlyRate
      );

      if (result.success) {
        setSuccess('Car washer account created successfully! A temporary password has been generated and sent to their email.');
        setFormData({ name: '', email: '', phone: '', hourlyRate: '', assignedAdmin: '' });
      } else {
        setError(result.error || 'Failed to create car washer account. Please try again.');
      }
    } catch {
      setError('An error occurred while creating the car washer account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/(admin)/dashboard"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 mb-4"
        >
          <ChevronLeftIcon />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Add New Car Washer
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Create a new car washer account to handle car wash operations
        </p>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-red-800 dark:text-red-200">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-800 dark:text-green-200">{success}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <Label>
              Full Name <span className="text-error-500">*</span>
            </Label>
            <Input
              type="text"
              placeholder="Enter car washer's full name"
              defaultValue={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
            />
          </div>

          {/* Email */}
          <div>
            <Label>
              Email Address <span className="text-error-500">*</span>
            </Label>
            <Input
              type="email"
              placeholder="Enter car washer's email address"
              defaultValue={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
            />
          </div>

          {/* Phone */}
          <div>
            <Label>
              Phone Number <span className="text-error-500">*</span>
            </Label>
            <Input
              type="tel"
              placeholder="Enter car washer's phone number"
              defaultValue={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
            />
          </div>

          {/* Hourly Rate */}
          <div>
            <Label>
              Hourly Rate ($)
            </Label>
            <Input
              type="number"
              step={0.01}
              min="0"
              placeholder="Enter hourly rate (optional)"
              defaultValue={formData.hourlyRate}
              onChange={(e) => handleInputChange('hourlyRate', e.target.value)}
            />
          </div>

          {/* Assigned Admin */}
          <div>
            <Label>
              Assigned Admin
            </Label>
            <Input
              type="text"
              placeholder="Enter assigned admin (optional)"
              defaultValue={formData.assignedAdmin}
              onChange={(e) => handleInputChange('assignedAdmin', e.target.value)}
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Worker...
                </div>
              ) : (
                'Create Car Washer Account'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/(admin)/dashboard')}
              className="px-6"
            >
              Cancel
            </Button>
          </div>
        </form>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                What happens next?
              </h4>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>• A temporary password will be generated automatically</li>
                <li>• The car washer will receive an email with login credentials</li>
                <li>• They can handle car wash operations and check-ins</li>
                <li>• They can track their earnings and performance</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddWorkerPage; 