"use client";
import React, { useState, useEffect } from 'react';
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
  services: string[]; // Now stores service IDs
  assignedWasherId: string;
  assignedMaterials: Array<{
    materialId: string;
    materialName: string;
    quantity: number;
    unit: string;
  }>;
  specialInstructions: string;
  estimatedDuration: number;
  // Security fields
  customerType: 'instant' | 'registered';
  valuableItems: string;
  securityCode: string;
  userCode: string;
  checkInProcess: string;
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
    assignedWasherId: '',
    assignedMaterials: [],
    specialInstructions: '',
    estimatedDuration: 30,
    // Security fields
    customerType: 'instant',
    valuableItems: '',
    securityCode: '',
    userCode: '',
    checkInProcess: '',
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [availableServices, setAvailableServices] = useState<Array<{
    id: string;
    name: string;
    description: string;
    price: number;
    duration: number;
    category: string;
    isActive: boolean;
  }>>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  
  // Washer and materials state
  const [availableWashers, setAvailableWashers] = useState<Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
  }>>([]);
  const [isLoadingWashers, setIsLoadingWashers] = useState(true);
  
  const [washerMaterials, setWasherMaterials] = useState<Array<{
    id: string;
    materialName: string;
    materialType: string;
    quantity: number;
    unit: string;
  }>>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);

  const vehicleTypes = [
    { value: 'sedan', label: 'Sedan' },
    { value: 'suv', label: 'SUV' },
    { value: 'truck', label: 'Truck' },
    { value: 'van', label: 'Van' },
    { value: 'luxury', label: 'Luxury' },
    { value: 'other', label: 'Other' },
  ];

  const handleInputChange = (field: keyof CheckInFormData, value: string | string[] | number | Array<{
    materialId: string;
    materialName: string;
    quantity: number;
    unit: string;
  }>) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleServiceToggle = (serviceId: string) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.includes(serviceId)
        ? prev.services.filter(s => s !== serviceId)
        : [...prev.services, serviceId]
    }));
  };

  const fetchServices = async () => {
    try {
      setIsLoadingServices(true);
      const response = await fetch('/api/admin/services?status=active');
      const result = await response.json();
      
      if (result.success) {
        setAvailableServices(result.services);
      } else {
        console.error('Failed to fetch services:', result.error);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setIsLoadingServices(false);
    }
  };

  // Fetch washers from database
  const fetchWashers = async () => {
    try {
      setIsLoadingWashers(true);
      const response = await fetch('/api/admin/washers');
      const result = await response.json();
      
      if (result.success) {
        setAvailableWashers(result.washers);
      } else {
        console.error('Failed to fetch washers:', result.error);
      }
    } catch (error) {
      console.error('Error fetching washers:', error);
    } finally {
      setIsLoadingWashers(false);
    }
  };

  // Fetch washer materials
  const fetchWasherMaterials = async (washerId: string) => {
    if (!washerId) return;
    
    try {
      setIsLoadingMaterials(true);
      const response = await fetch(`/api/admin/washer-materials?washerId=${washerId}&isReturned=false`);
      const result = await response.json();
      
      if (result.success) {
        setWasherMaterials(result.materials);
      } else {
        console.error('Failed to fetch washer materials:', result.error);
      }
    } catch (error) {
      console.error('Error fetching washer materials:', error);
    } finally {
      setIsLoadingMaterials(false);
    }
  };

  // Load services and washers on component mount
  useEffect(() => {
    fetchServices();
    fetchWashers();
  }, []);

  const searchCustomer = async () => {
    const query = searchQuery.trim();
    
    if (!query) {
      setError('Please enter a name, phone number, plate number, or email address to search');
      return;
    }

    setIsSearching(true);
    setError('');
    setFoundCustomers([]);
    setShowCustomerResults(false);

    try {
      // Use the general query parameter for flexible search
      const result = await searchCustomers({ query });
      
      if (!result.success) {
        setError(result.error || 'Failed to search for customer');
        return;
      }

      if (result.found && result.customers) {
        setFoundCustomers(result.customers);
        setShowCustomerResults(true);
        setSuccess(`Found ${result.customers.length} customer(s) matching your search`);
      } else {
        setError('No existing customer found with this information. You can proceed to register a new customer.');
        setShowCustomerResults(false);
      }
    } catch {
      setError('Failed to search for customer. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const selectExistingCustomer = (customer: Customer) => {
    // Get the primary vehicle or first vehicle
    const primaryVehicle = customer.vehicles?.find(v => v.is_primary) || customer.vehicles?.[0];
    
    setFormData(prev => ({
      ...prev,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerEmail: customer.email || '',
      licensePlate: primaryVehicle?.license_plate || '',
      vehicleType: primaryVehicle?.vehicle_type || '',
      vehicleColor: primaryVehicle?.vehicle_color || '',
      // Set customer type to registered for existing customers
      customerType: 'registered',
      // Clear security fields to be filled by user
      securityCode: '',
      userCode: '',
      pareCode: '',
      checkInProcess: '',
    }));
    setShowCustomerResults(false);
    setSuccess(`Selected customer: ${customer.name} with vehicle: ${primaryVehicle?.vehicle_color || ''} ${primaryVehicle?.vehicle_type || ''} (${primaryVehicle?.license_plate || ''}) - Security codes required`);
  };

  const calculateTotalPrice = () => {
    return availableServices
      .filter(service => formData.services.includes(service.id))
      .reduce((total, service) => total + service.price, 0);
  };

  const calculateEstimatedDuration = () => {
    const baseDuration = 30; // Base 30 minutes
    const selectedServices = availableServices.filter(service => formData.services.includes(service.id));
    const serviceDuration = selectedServices.reduce((total, service) => total + service.duration, 0);
    return Math.min(baseDuration + serviceDuration, 120); // Max 2 hours
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    // Security validation
    if (!formData.valuableItems.trim()) {
      setError('Valuable items documentation is required for all customers');
      setIsSubmitting(false);
      return;
    }

    if (formData.customerType === 'registered') {
      if (!formData.securityCode.trim() || !formData.userCode.trim()) {
        setError('Security code and user code are required for registered customers');
        setIsSubmitting(false);
        return;
      }
      if (!formData.checkInProcess.trim()) {
        setError('Check-in process details are required for registered customers');
        setIsSubmitting(false);
        return;
      }
    }

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
              Search by name, phone number, plate number, or email address
            </p>
            <div className="mb-3">
              <Label htmlFor="search-customer" className="text-blue-900 dark:text-blue-100 text-sm font-medium">
                Search Customer
              </Label>
              <InputField
                id="search-customer"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter name, phone, plate number, or email"
              />
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
                          {customer.vehicles?.length || 0} vehicle(s) - {customer.vehicles?.find(v => v.is_primary)?.vehicle_color || ''} {customer.vehicles?.find(v => v.is_primary)?.vehicle_type || ''} ({customer.vehicles?.find(v => v.is_primary)?.license_plate || ''})
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

        {/* Washer Assignment */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Washer Assignment
          </h2>
          <FormField label="Assign Washer" required>
            {isLoadingWashers ? (
              <div className="text-center py-4">
                <p className="text-gray-600 dark:text-gray-400">Loading washers...</p>
              </div>
            ) : availableWashers.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-600 dark:text-gray-400">No washers available</p>
              </div>
            ) : (
              <Select
                value={formData.assignedWasherId}
                onChange={(value) => {
                  handleInputChange('assignedWasherId', value);
                  if (value) {
                    fetchWasherMaterials(value);
                  }
                }}
                options={availableWashers.map(washer => ({
                  value: washer.id,
                  label: `${washer.name} (${washer.phone})`
                }))}
                placeholder="Select a washer"
              />
            )}
          </FormField>
        </div>

        {/* Material Assignment */}
        {formData.assignedWasherId && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Material Assignment
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Select materials to assign for this car wash
            </p>
            {isLoadingMaterials ? (
              <div className="text-center py-4">
                <p className="text-gray-600 dark:text-gray-400">Loading materials...</p>
              </div>
            ) : washerMaterials.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-600 dark:text-gray-400">No materials available for this washer</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {washerMaterials.map((material) => (
                  <div
                    key={material.id}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {material.materialName}
                      </h3>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {material.quantity} {material.unit}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-600 dark:text-gray-400">
                        Quantity to use:
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={material.quantity}
                        step="0.1"
                        className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0"
                        onChange={(e) => {
                          const quantity = parseFloat(e.target.value) || 0;
                          const existingIndex = formData.assignedMaterials.findIndex(m => m.materialId === material.id);
                          
                          if (quantity > 0) {
                            if (existingIndex >= 0) {
                              // Update existing material
                              const updatedMaterials = [...formData.assignedMaterials];
                              updatedMaterials[existingIndex] = {
                                ...updatedMaterials[existingIndex],
                                quantity
                              };
                              handleInputChange('assignedMaterials', updatedMaterials);
                            } else {
                              // Add new material
                              const newMaterial = {
                                materialId: material.id,
                                materialName: material.materialName,
                                quantity,
                                unit: material.unit
                              };
                              handleInputChange('assignedMaterials', [...formData.assignedMaterials, newMaterial]);
                            }
                          } else {
                            // Remove material if quantity is 0
                            if (existingIndex >= 0) {
                              const updatedMaterials = formData.assignedMaterials.filter(m => m.materialId !== material.id);
                              handleInputChange('assignedMaterials', updatedMaterials);
                            }
                          }
                        }}
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {material.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Services Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Services
          </h2>
          {isLoadingServices ? (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">Loading services...</p>
            </div>
          ) : availableServices.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">No services available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableServices.map((service) => (
                <div
                  key={service.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    formData.services.includes(service.id)
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  onClick={() => handleServiceToggle(service.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {service.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        ${service.price} • {service.duration} min
                      </p>
                      {service.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {service.description}
                        </p>
                      )}
                    </div>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      formData.services.includes(service.id)
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {formData.services.includes(service.id) && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security & Check-in Process */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Security & Check-in Process
          </h2>
          
          {/* Customer Type Selection */}
          <div className="mb-6">
            <FormField label="Customer Type" required>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="customerType"
                    value="instant"
                    checked={formData.customerType === 'instant'}
                    onChange={(e) => handleInputChange('customerType', e.target.value as 'instant' | 'registered')}
                    className="mr-2 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Instant Customer (Walk-in)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="customerType"
                    value="registered"
                    checked={formData.customerType === 'registered'}
                    onChange={(e) => handleInputChange('customerType', e.target.value as 'instant' | 'registered')}
                    className="mr-2 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Registered Customer</span>
                </label>
              </div>
            </FormField>
          </div>

          {/* Valuable Items Documentation */}
          <div className="mb-6">
            <FormField label="Valuable Items Documentation" required>
              <TextArea
                value={formData.valuableItems}
                onChange={(value) => handleInputChange('valuableItems', value)}
                placeholder={formData.customerType === 'instant' 
                  ? "Note of valuable items for instant customer..." 
                  : "Note of valuable items and check-in process for registered customer..."
                }
                rows={3}
              />
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {formData.customerType === 'instant' 
                  ? "For instant customers: Take note of valuable items only"
                  : "For registered customers: Take note of valuable items AND complete check-in process"
                }
              </p>
            </FormField>
          </div>

          {/* Security Codes - Only for Registered Customers */}
          {formData.customerType === 'registered' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Security Code" required>
                  <InputField
                    type="text"
                    value={formData.securityCode}
                    onChange={(e) => handleInputChange('securityCode', e.target.value)}
                    placeholder="Enter security code"
                  />
                </FormField>
                <FormField label="User Code" required>
                  <InputField
                    type="text"
                    value={formData.userCode}
                    onChange={(e) => handleInputChange('userCode', e.target.value)}
                    placeholder="Enter user code"
                  />
                </FormField>
              </div>
              
              <FormField label="Check-in Process Details" required>
                <TextArea
                  value={formData.checkInProcess}
                  onChange={(value) => handleInputChange('checkInProcess', value)}
                  placeholder="Document the complete check-in process including verification steps..."
                  rows={3}
                />
              </FormField>
            </div>
          )}
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