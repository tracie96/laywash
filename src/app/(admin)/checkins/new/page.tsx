"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/button/Button';
import InputField from '@/components/form/input/InputField';
import Select from '@/components/form/Select';
import TextArea from '@/components/form/input/TextArea';
import Label from '@/components/form/Label';
import { useAuth } from '@/context/AuthContext';
import { Customer } from '@/types/carwash';

interface CheckInFormData {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  licensePlate: string;
  vehicleType: string;
  vehicleColor: string;
  services: string[];
  specialInstructions: string;
  estimatedDuration: number;
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

const NewCheckInPage: React.FC = () => {
  const router = useRouter();
  const { searchCustomers } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [foundCustomers, setFoundCustomers] = useState<Customer[]>([]);
  const [showCustomerResults, setShowCustomerResults] = useState(false);

  const [formData, setFormData] = useState<CheckInFormData>({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    licensePlate: '',
    vehicleType: '',
    vehicleColor: '',
    services: [],
    specialInstructions: '',
    estimatedDuration: 30,
  });

  const vehicleTypes = [
    { value: 'sedan', label: 'Sedan' },
    { value: 'suv', label: 'SUV' },
    { value: 'truck', label: 'Truck' },
    { value: 'van', label: 'Van' },
    { value: 'luxury', label: 'Luxury' },
    { value: 'other', label: 'Other' },
  ];

  const availableServices = [
    { value: 'exterior_wash', label: 'Exterior Wash', price: 15 },
    { value: 'interior_clean', label: 'Interior Clean', price: 20 },
    { value: 'full_service', label: 'Full Service Wash', price: 35 },
    { value: 'wax', label: 'Wax Treatment', price: 25 },
    { value: 'tire_shine', label: 'Tire Shine', price: 10 },
    { value: 'engine_clean', label: 'Engine Clean', price: 30 },
  ];

  const handleInputChange = (field: keyof CheckInFormData, value: string | string[] | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleServiceToggle = (serviceValue: string) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.includes(serviceValue)
        ? prev.services.filter(s => s !== serviceValue)
        : [...prev.services, serviceValue]
    }));
  };

  const searchCustomer = async () => {
    const email = formData.customerEmail.trim();
    const licensePlate = formData.licensePlate.trim();
    
    if (!email && !licensePlate) {
      setError('Please enter an email address or license plate to search');
      return;
    }

    setIsSearching(true);
    setError('');
    setFoundCustomers([]);
    setShowCustomerResults(false);

    try {
      const result = await searchCustomers({ 
        email: email || undefined, 
        licensePlate: licensePlate || undefined 
      });
      
      if (!result.success) {
        setError(result.error || 'Failed to search for customer');
        return;
      }

      if (result.found && result.customers) {
        setFoundCustomers(result.customers);
        setShowCustomerResults(true);
        setSuccess(`Found ${result.customers.length} vehicle(s) matching your search`);
      } else {
        setSuccess('No existing customer found with this information. You can proceed to register a new customer.');
        setShowCustomerResults(false);
      }
    } catch {
      setError('Failed to search for customer. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const selectExistingCustomer = (customer: Customer) => {
    setFormData(prev => ({
      ...prev,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerEmail: customer.email || '',
      licensePlate: customer.licensePlate,
      vehicleType: customer.vehicleType,
      vehicleColor: customer.vehicleColor || '',
    }));
    setShowCustomerResults(false);
    setSuccess(`Selected vehicle: ${customer.vehicleColor} ${customer.vehicleType} (${customer.licensePlate})`);
  };

  const calculateTotalPrice = () => {
    return availableServices
      .filter(service => formData.services.includes(service.value))
      .reduce((total, service) => total + service.price, 0);
  };

  const calculateEstimatedDuration = () => {
    const baseDuration = 30; // Base 30 minutes
    const serviceDuration = formData.services.length * 15; // 15 minutes per service
    return Math.min(baseDuration + serviceDuration, 120); // Max 2 hours
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      // TODO: Implement API call to create check-in
      console.log('Creating check-in:', formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess('Check-in created successfully!');
      setTimeout(() => {
        router.push('/checkins/active');
      }, 2000);
    } catch {
      setError('Failed to create check-in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          New Car Check-in
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Register a new customer and their vehicle for car wash services
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
          
          {/* Customer Search Section */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-3">
              Search for Existing Customer
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
              Search by email address or license plate number (or both)
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <Label htmlFor="search-email" className="text-blue-900 dark:text-blue-100 text-sm font-medium">
                  Email Address
                </Label>
                <InputField
                  id="search-email"
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                  placeholder="Enter customer email"
                />
              </div>
              <div>
                <Label htmlFor="search-license" className="text-blue-900 dark:text-blue-100 text-sm font-medium">
                  License Plate
                </Label>
                <InputField
                  id="search-license"
                  type="text"
                  value={formData.licensePlate}
                  onChange={(e) => handleInputChange('licensePlate', e.target.value)}
                  placeholder="Enter license plate number"
                />
              </div>
            </div>
            <div className="flex justify-center">
              <Button
                type="button"
                onClick={searchCustomer}
                disabled={isSearching}
                className="bg-blue-600 hover:bg-blue-700 min-w-[120px]"
              >
                {isSearching ? 'Searching...' : 'Search Customer'}
              </Button>
            </div>
          </div>

          {/* Customer Search Results */}
          {showCustomerResults && foundCustomers.length > 0 && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
              <h3 className="text-lg font-medium text-green-900 dark:text-green-100 mb-3">
                Found Customer Vehicles
              </h3>
              <div className="space-y-2">
                {foundCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-700 cursor-pointer hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                    onClick={() => selectExistingCustomer(customer)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {customer.name} - {customer.phone}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {customer.vehicleColor} {customer.vehicleType} ({customer.licensePlate})
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => selectExistingCustomer(customer)}
                      >
                        Select
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Customer Name" required>
              <InputField
                type="text"
                value={formData.customerName}
                onChange={(e) => handleInputChange('customerName', e.target.value)}
                placeholder="Enter customer's full name"
              />
            </FormField>
            <FormField label="Phone Number" required>
              <InputField
                type="tel"
                value={formData.customerPhone}
                onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                placeholder="Enter phone number"
              />
            </FormField>
            <FormField label="Email Address">
              <InputField
                type="email"
                value={formData.customerEmail}
                onChange={(e) => handleInputChange('customerEmail', e.target.value)}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            <FormField label="Vehicle Color">
              <InputField
                type="text"
                value={formData.vehicleColor}
                onChange={(e) => handleInputChange('vehicleColor', e.target.value)}
                placeholder="Enter vehicle color"
              />
            </FormField>
          </div>
        </div>

        {/* Services Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Services
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableServices.map((service) => (
              <div
                key={service.value}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  formData.services.includes(service.value)
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => handleServiceToggle(service.value)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {service.label}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      ${service.price}
                    </p>
                  </div>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    formData.services.includes(service.value)
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {formData.services.includes(service.value) && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Special Instructions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Special Instructions
          </h2>
          <FormField label="Additional Notes">
            <TextArea
              value={formData.specialInstructions}
              onChange={(value) => handleInputChange('specialInstructions', value)}
              placeholder="Any special instructions or notes about the vehicle..."
              rows={3}
            />
          </FormField>
        </div>

        {/* Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Summary
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Price</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${calculateTotalPrice()}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Estimated Duration</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {calculateEstimatedDuration()} min
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Services Selected</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formData.services.length}
              </p>
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
            {isSubmitting ? 'Creating...' : 'Create Check-in'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NewCheckInPage; 