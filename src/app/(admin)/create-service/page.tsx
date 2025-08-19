"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '../../../components/form/input/InputField';
import Label from '../../../components/form/Label';
import Button from '../../../components/ui/button/Button';
import { ChevronLeftIcon } from '../../../icons';
import Link from 'next/link';

const CreateServicePage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    basePrice: '',
    category: 'exterior',
    estimatedDuration: '',
    washerCommissionPercentage: 40,
    companyCommissionPercentage: 60,
    maxWashersPerService: 2,
    commissionNotes: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const router = useRouter();

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.basePrice || !formData.estimatedDuration) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate commission percentages
    if (formData.washerCommissionPercentage + formData.companyCommissionPercentage !== 100) {
      setError('Washer and company commission percentages must equal 100%');
      return;
    }

    if (formData.maxWashersPerService < 1) {
      setError('Maximum washers per service must be at least 1');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.basePrice),
          category: formData.category,
          duration: parseInt(formData.estimatedDuration),
          washerCommissionPercentage: formData.washerCommissionPercentage,
          companyCommissionPercentage: formData.companyCommissionPercentage,
          maxWashersPerService: formData.maxWashersPerService,
          commissionNotes: formData.commissionNotes
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Service created successfully!');
        setFormData({ 
          name: '', 
          description: '', 
          basePrice: '', 
          category: 'exterior', 
          estimatedDuration: '',
          washerCommissionPercentage: 40,
          companyCommissionPercentage: 60,
          maxWashersPerService: 2,
          commissionNotes: ''
        });
        // Redirect to services page after creation
        setTimeout(() => {
          router.push('/(admin)/operations/services');
        }, 1500);
      } else {
        setError(data.error || 'Failed to create service');
      }
    } catch (error) {
      console.error('Error creating service:', error);
      setError('An error occurred while creating the service.');
    } finally {
      setIsLoading(false);
    }
  };

  const serviceCategories = [
    { value: 'exterior', label: 'Exterior Wash' },
    { value: 'interior', label: 'Interior Clean' },
    { value: 'engine', label: 'Engine Bay Clean' },
    { value: 'vacuum', label: 'Vacuum Service' },
    { value: 'complementary', label: 'Complementary Service' }
  ];

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
          Create New Service
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Add a new car wash service to your business offerings
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
          {/* Service Name */}
          <div>
            <Label>
              Service Name <span className="text-error-500">*</span>
            </Label>
            <Input
              type="text"
              placeholder="e.g., Premium Exterior Wash"
              defaultValue={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <Label>
              Description
            </Label>
            <textarea
              className="w-full h-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Describe what this service includes..."
              defaultValue={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
            />
          </div>

          {/* Category */}
          <div>
            <Label>
              Service Category <span className="text-error-500">*</span>
            </Label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
            >
              {serviceCategories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          {/* Base Price */}
          <div>
            <Label>
              Base Price ($) <span className="text-error-500">*</span>
            </Label>
            <Input
              type="number"
              step={0.01}
              min="0"
              placeholder="Enter base price"
              defaultValue={formData.basePrice}
              onChange={(e) => handleInputChange('basePrice', e.target.value)}
            />
          </div>

          {/* Estimated Duration */}
          <div>
            <Label>
              Estimated Duration (minutes) <span className="text-error-500">*</span>
            </Label>
            <Input
              type="number"
              min="1"
              placeholder="Enter estimated duration in minutes"
              defaultValue={formData.estimatedDuration}
              onChange={(e) => handleInputChange('estimatedDuration', e.target.value)}
            />
          </div>

          {/* Commission Settings */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Commission Settings
            </h3>
            
            {/* Washer Commission Percentage */}
            <div className="mb-4">
              <Label>
                Washer Commission (%) <span className="text-error-500">*</span>
              </Label>
              <Input
                type="number"
                min="0"
                max="100"
                step={0.01}
                placeholder="Enter washer commission percentage"
                defaultValue={formData.washerCommissionPercentage.toString()}
                onChange={(e) => {
                  const washerPercentage = parseFloat(e.target.value) || 0;
                  handleInputChange('washerCommissionPercentage', washerPercentage);
                  handleInputChange('companyCommissionPercentage', 100 - washerPercentage);
                }}
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Company commission will automatically be set to {100 - formData.washerCommissionPercentage}%
              </p>
            </div>

            {/* Company Commission Percentage */}
            <div className="mb-4">
              <Label>
                Company Commission (%) <span className="text-error-500">*</span>
              </Label>
              <Input
                type="number"
                min="0"
                max="100"
                step={0.01}
                placeholder="Enter company commission percentage"
                defaultValue={formData.companyCommissionPercentage.toString()}
                onChange={(e) => {
                  const companyPercentage = parseFloat(e.target.value) || 0;
                  handleInputChange('companyCommissionPercentage', companyPercentage);
                  handleInputChange('washerCommissionPercentage', 100 - companyPercentage);
                }}
              />
            </div>

            {/* Max Washers Per Service */}
            <div className="mb-4">
              <Label>
                Maximum Washers Per Service <span className="text-error-500">*</span>
              </Label>
              <Input
                type="number"
                min="1"
                max="10"
                placeholder="Enter maximum number of washers"
                defaultValue={formData.maxWashersPerService.toString()}
                onChange={(e) => handleInputChange('maxWashersPerService', parseInt(e.target.value) || 1)}
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Maximum number of washers that can work on this service simultaneously
              </p>
            </div>

            {/* Commission Notes */}
            <div className="mb-4">
              <Label>
                Commission Notes
              </Label>
              <textarea
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                rows={3}
                placeholder="Any special notes about commission structure for this service..."
                defaultValue={formData.commissionNotes}
                onChange={(e) => handleInputChange('commissionNotes', e.target.value)}
              />
            </div>
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
                  Creating Service...
                </div>
              ) : (
                'Create Service'
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
                Service Categories Explained
              </h4>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>• <strong>Exterior Wash:</strong> Car body, windows, wheels cleaning</li>
                <li>• <strong>Interior Clean:</strong> Dashboard, seats, carpets cleaning</li>
                <li>• <strong>Engine Bay Clean:</strong> Engine compartment cleaning</li>
                <li>• <strong>Vacuum Service:</strong> Interior vacuuming and dusting</li>
                <li>• <strong>Complementary:</strong> Additional services like waxing, polishing</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateServicePage; 