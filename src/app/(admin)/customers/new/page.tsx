"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/button/Button';
import InputField from '@/components/form/input/InputField';
import Select from '@/components/form/Select';
import Label from '@/components/form/Label';
import { useAuth } from '@/context/AuthContext';

interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  licensePlate: string;
  vehicleType: string;
  vehicleModel: string;
  vehicleColor: string;
}

// Form Field Wrapper Component
const FormField: React.FC<{
  label: string;
  required?: boolean;
  children: React.ReactNode;
}> = ({ label, required, children }) => (
  <div className="space-y-2">
    <Label htmlFor={label.toLowerCase().replace(/\s+/g, '-')}>
      {label} {required && <span className="text-error-500">*</span>}
    </Label>
    {children}
  </div>
);

const CustomerRegistrationPage: React.FC = () => {
  const router = useRouter();
  const { createCustomer } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    email: '',
    phone: '',
    licensePlate: '',
    vehicleType: '',
    vehicleModel: '',
    vehicleColor: '',
  });

  const vehicleTypes = [
    { value: 'sedan', label: 'Sedan' },
    { value: 'suv', label: 'SUV' },
    { value: 'truck', label: 'Truck' },
    { value: 'van', label: 'Van' },
    { value: 'luxury', label: 'Luxury' },
    { value: 'sports', label: 'Sports Car' },
    { value: 'electric', label: 'Electric Vehicle' },
    { value: 'hybrid', label: 'Hybrid' },
    { value: 'other', label: 'Other' },
  ];

  const vehicleColors = [
    { value: 'white', label: 'White' },
    { value: 'black', label: 'Black' },
    { value: 'silver', label: 'Silver' },
    { value: 'gray', label: 'Gray' },
    { value: 'red', label: 'Red' },
    { value: 'blue', label: 'Blue' },
    { value: 'green', label: 'Green' },
    { value: 'yellow', label: 'Yellow' },
    { value: 'orange', label: 'Orange' },
    { value: 'purple', label: 'Purple' },
    { value: 'brown', label: 'Brown' },
    { value: 'other', label: 'Other' },
  ];

  const handleInputChange = (field: keyof CustomerFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Customer name is required');
      return false;
    }
    if (!formData.phone.trim()) {
      setError('Phone number is required');
      return false;
    }
    if (!formData.licensePlate.trim()) {
      setError('License plate is required');
      return false;
    }
    if (!formData.vehicleType) {
      setError('Vehicle type is required');
      return false;
    }
    if (!formData.vehicleColor) {
      setError('Vehicle color is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    if (!validateForm()) {
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await createCustomer({
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone,
        licensePlate: formData.licensePlate,
        vehicleType: formData.vehicleType,
        vehicleModel: formData.vehicleModel || undefined,
        vehicleColor: formData.vehicleColor,
      });
      
      if (!result.success) {
        setError(result.error || 'Failed to register customer');
        return;
      }
      
      setSuccess('Customer registered successfully!');
      setTimeout(() => {
        router.push('/customers/list');
      }, 2000);
    } catch {
      setError('Failed to register customer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Register New Customer
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Add a new customer to the car wash system
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-green-800 dark:text-green-200">{success}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Customer Information */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Customer Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Full Name" required>
              <InputField
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter customer's full name"
              />
            </FormField>
            <FormField label="Phone Number" required>
              <InputField
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Enter phone number"
              />
            </FormField>
            <FormField label="Email Address">
              <InputField
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter email address (optional)"
              />
            </FormField>
          </div>
        </div>

        {/* Vehicle Information */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Vehicle Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FormField label="License Plate" required>
              <InputField
                type="text"
                value={formData.licensePlate}
                onChange={(e) => handleInputChange('licensePlate', e.target.value)}
                placeholder="Enter license plate"
              />
            </FormField>
            <FormField label="Vehicle Type" required>
              <Select
                value={formData.vehicleType}
                onChange={(value) => handleInputChange('vehicleType', value)}
                options={vehicleTypes}
                placeholder="Select vehicle type"
              />
            </FormField>
            <FormField label="Vehicle Model">
              <InputField
                type="text"
                value={formData.vehicleModel}
                onChange={(e) => handleInputChange('vehicleModel', e.target.value)}
                placeholder="Enter vehicle model (optional)"
              />
            </FormField>
            <FormField label="Vehicle Color" required>
              <Select
                value={formData.vehicleColor}
                onChange={(value) => handleInputChange('vehicleColor', value)}
                options={vehicleColors}
                placeholder="Select vehicle color"
              />
            </FormField>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Registration Summary
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Customer Name</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formData.name || 'Not provided'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Phone Number</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formData.phone || 'Not provided'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Email Address</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formData.email || 'Not provided'}
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">License Plate</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formData.licensePlate || 'Not provided'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Vehicle</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formData.vehicleColor && formData.vehicleType 
                    ? `${formData.vehicleColor} ${formData.vehicleType}` 
                    : 'Not provided'
                  }
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Vehicle Model</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formData.vehicleModel || 'Not provided'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="min-w-[120px]"
          >
            {isSubmitting ? 'Registering...' : 'Register Customer'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CustomerRegistrationPage; 