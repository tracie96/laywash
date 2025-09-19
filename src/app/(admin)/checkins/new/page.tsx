"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/button/Button';
import InputField from '@/components/form/input/InputField';
import Select from '@/components/form/Select';
import TextArea from '@/components/form/input/TextArea';
import Label from '@/components/form/Label';
import { useAuth } from '@/context/AuthContext';
import { Customer } from '@/types/carwash';

interface CheckInFormData {
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  licensePlate: string;
  vehicleType: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleColor: string;
  services: Array<{
    serviceId: string;
    workerId: string;
    customPrice?: number;
    materials: Array<{
      materialId: string;
      materialName: string;
      quantity: number;
      unit: string;
    }>;
  }>;
  specialInstructions: string;
  estimatedDuration: number;
  // Security fields
  washType: 'instant' | 'delayed';
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
  const { searchCustomers, user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [foundCustomers, setFoundCustomers] = useState<Customer[]>([]);
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [isCustomerSelected, setIsCustomerSelected] = useState(false);

  // Duplicate check states
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicateCheckIns, setDuplicateCheckIns] = useState<Array<{
    id: string;
    customerName: string;
    status: string;
    checkInTime: string;
    vehicleColor?: string;
    vehicleType?: string;
  }>>([]);

  const [formData, setFormData] = useState<CheckInFormData>({
    customerId: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    licensePlate: '',
    vehicleType: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleColor: '',
    services: [],
    specialInstructions: '',
    estimatedDuration: 30,
    // Security fields
    washType: 'instant',
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
  
  // Function to check for duplicate license plates on the same day
  const checkForDuplicateLicensePlate = async (licensePlate: string) => {
    if (!licensePlate.trim()) return { hasDuplicates: false, duplicates: [] };
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/admin/check-ins?licensePlate=${encodeURIComponent(licensePlate)}&date=${today}`);
      const result = await response.json();
      
      if (result.success && result.checkIns && result.checkIns.length > 0) {
        return { hasDuplicates: true, duplicates: result.checkIns };
      }
      
      return { hasDuplicates: false, duplicates: [] };
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      return { hasDuplicates: false, duplicates: [] };
    }
  };
  
  // Washer and materials state
  const [availableWashers, setAvailableWashers] = useState<Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
  }>>([]);
  const [serviceMaterials, setServiceMaterials] = useState<Record<string, Array<{
    id: string;
    toolName: string;
    materialType: string;
    quantity: number;
    unit: string;
  }>>>({});

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
      services: prev.services.some(s => s.serviceId === serviceId)
        ? prev.services.filter(s => s.serviceId !== serviceId)
        : [...prev.services, { serviceId, workerId: '', customPrice: undefined, materials: [] }]
    }));
  };

  const handleWorkerAssignment = (serviceId: string, workerId: string) => {
    console.log('Assigning worker:', { serviceId, workerId });
    setFormData(prev => {
      const updated = {
        ...prev,
        services: prev.services.map(service => 
          service.serviceId === serviceId 
            ? { ...service, workerId, materials: [] } // Clear materials when worker changes
            : service
        )
      };
      console.log('Updated form data:', updated);
      return updated;
    });
    
    // Fetch materials for this specific service
    fetchServiceMaterials(serviceId, workerId);
  };

  const handleCustomPriceChange = (serviceId: string, customPrice: number) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.map(service => 
        service.serviceId === serviceId 
          ? { ...service, customPrice }
          : service
      )
    }));
  };

  const handleMaterialAssignment = (serviceId: string, materialId: string, quantity: number) => {
    const material = serviceMaterials[serviceId]?.find(m => m.id === materialId);
    if (material && quantity > material.quantity) {
      setError(`Cannot allocate ${quantity} ${material.unit} - only ${material.quantity} ${material.unit} available`);
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      services: prev.services.map(service => {
        if (service.serviceId !== serviceId) return service;
        
        const existingIndex = service.materials.findIndex(m => m.materialId === materialId);
        let updatedMaterials = [...service.materials];
        
        if (quantity > 0) {
          if (existingIndex >= 0) {
            // Update existing material
            updatedMaterials[existingIndex] = {
              ...updatedMaterials[existingIndex],
              quantity
            };
          } else {
            // Add new material
            if (material) {
              updatedMaterials.push({
                materialId: material.id,
                materialName: material.toolName,
                quantity,
                unit: material.unit
              });
            }
          }
        } else {
          updatedMaterials = updatedMaterials.filter(m => m.materialId !== materialId);
        }
        
        return { ...service, materials: updatedMaterials };
      })
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
      const response = await fetch('/api/admin/washers');
      const result = await response.json();
      
      if (result.success) {
        const availableWashers = result.washers.filter((washer: { isActive: boolean; isAvailable: boolean }) => 
          washer.isActive && washer.isAvailable
        );
        setAvailableWashers(availableWashers);
      } else {
        console.error('Failed to fetch washers:', result.error);
      }
    } catch (error) {
      console.error('Error fetching washers:', error);
    }
  };


  const fetchServiceMaterials = useCallback(async (serviceId: string, workerId: string) => {
    if (!workerId) {
      setServiceMaterials(prev => ({ ...prev, [serviceId]: [] }));
      return;
    }
    
    try {
      const response = await fetch(`/api/admin/washer-materials?washerId=${workerId}&isReturned=false`);
      const result = await response.json();
      
      if (result.success) {
        setServiceMaterials(prev => ({ ...prev, [serviceId]: result.tools || [] }));
      } else {
        console.error('Failed to fetch materials for service:', result.error);
        setServiceMaterials(prev => ({ ...prev, [serviceId]: [] }));
      }
    } catch (error) {
      console.error('Error fetching materials for service:', error);
      setServiceMaterials(prev => ({ ...prev, [serviceId]: [] }));
    }
  }, []);

  // Load services and washers on component mount
  useEffect(() => {
    fetchServices();
    fetchWashers();
  }, []);

  // Effect to fetch materials when washer is assigned - REMOVED
  // Materials are now fetched per service when worker is assigned

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
    setIsCustomerSelected(false);

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
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerEmail: customer.email || '',
      licensePlate: primaryVehicle?.license_plate || '',
      vehicleType: primaryVehicle?.vehicle_type || '',
      vehicleMake: primaryVehicle?.vehicle_make || '',
      vehicleModel: primaryVehicle?.vehicle_model || '',
      vehicleColor: primaryVehicle?.vehicle_color || '',
      // Set customer type to registered for existing customers
      washType: 'delayed',
      // Clear security fields to be filled by user
      securityCode: '',
      userCode: '',
      checkInProcess: '',
    }));
    setShowCustomerResults(false);
    setIsCustomerSelected(true);
    setSuccess(`Selected customer: ${customer.name} with vehicle: ${primaryVehicle?.vehicle_color || ''} ${primaryVehicle?.vehicle_type || ''} (${primaryVehicle?.license_plate || ''}) - Security codes required`);
  };

  const clearSelectedCustomer = () => {
    setFormData(prev => ({
      ...prev,
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      licensePlate: '',
      vehicleType: '',
      vehicleModel: '',
      vehicleColor: '',
      washType: 'instant', // Reset wash type to instant
      securityCode: '',
      userCode: '',
      checkInProcess: '',
    }));
    setIsCustomerSelected(false);
    setSuccess('');
    setError('');
  };

  const calculateTotalPrice = () => {
    return formData.services.reduce((total, serviceItem) => {
      const service = availableServices.find(s => s.id === serviceItem.serviceId);
      if (!service) return total;
      
      const price = serviceItem.customPrice !== undefined ? serviceItem.customPrice : service.price;
      return total + price;
    }, 0);
  };

  const calculateEstimatedDuration = () => {
    const baseDuration = 30; // Base 30 minutes
    const selectedServices = availableServices.filter(service => 
      formData.services.some(s => s.serviceId === service.id)
    );
    const serviceDuration = selectedServices.reduce((total, service) => total + service.duration, 0);
    return Math.min(baseDuration + serviceDuration, 120); // Max 2 hours
  };

  // Handle duplicate warning modal
  const handleProceedWithDuplicate = () => {
    setShowDuplicateWarning(false);
    setDuplicateCheckIns([]);
    // Continue with form submission
    proceedWithSubmission();
  };

  const handleCancelDuplicate = () => {
    setShowDuplicateWarning(false);
    setDuplicateCheckIns([]);
    setIsSubmitting(false);
  };

  // Separate function to proceed with actual submission
  const proceedWithSubmission = async () => {
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    // Check if user is authenticated
    if (!user?.id) {
      setError('You must be logged in to create a check-in');
      setIsSubmitting(false);
      return;
    }

    // Security validation
    if (!formData.valuableItems.trim()) {
      setError('Valuable items documentation is required for all customers');
      setIsSubmitting(false);
      return;
    }

    if (formData.washType === 'delayed') {
      if (!formData.securityCode.trim() || !formData.userCode.trim()) {
        setError('Security code and user code are required for delayed wash customers');
        setIsSubmitting(false);
        return;
      }
      if (!formData.checkInProcess.trim()) {
        setError('Check-in process details are required for delayed wash customers');
        setIsSubmitting(false);
        return;
      }
    }

    // Services validation
    if (formData.services.length === 0) {
      setError('At least one service must be selected');
      setIsSubmitting(false);
      return;
    }

    // Validate each selected service has required fields
    for (const serviceItem of formData.services) {
      if (!serviceItem.workerId) {
        setError(`Worker must be assigned for service: ${availableServices.find(s => s.id === serviceItem.serviceId)?.name}`);
        setIsSubmitting(false);
        return;
      }

      const service = availableServices.find(s => s.id === serviceItem.serviceId);
      if (!service) {
        setError('Invalid service selected');
        setIsSubmitting(false);
        return;
      }

      // For $0 services, custom price is required
      if (service.price === 0 && (!serviceItem.customPrice || serviceItem.customPrice <= 0)) {
        setError(`Custom price is required for service: ${service.name}`);
        setIsSubmitting(false);
        return;
      }
    }

    // Calculate total price
    const totalPrice = formData.services.reduce((total, serviceItem) => {
      const service = availableServices.find(s => s.id === serviceItem.serviceId);
      if (!service) return total;
      
      const servicePrice = service.price === 0 ? (serviceItem.customPrice || 0) : service.price;
      return total + servicePrice;
    }, 0);

    // Calculate estimated duration
    const estimatedDuration = calculateEstimatedDuration();

    try {
      const response = await fetch('/api/admin/check-ins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-ID': user?.id || '',
        },
        body: JSON.stringify({
          ...formData,
          totalPrice,
          estimatedDuration,
          assignedAdmin: user?.name || 'Unknown Admin',
          assignedAdminId: user?.id,
          // Transform services to include serviceData
          services: formData.services.map(serviceItem => {
        const service = availableServices.find(s => s.id === serviceItem.serviceId);
        return {
          ...serviceItem,
              serviceData: service ? {
            id: service.id,
            name: service.name,
            price: serviceItem.customPrice !== undefined ? serviceItem.customPrice : service.price,
            duration: service.duration
              } : null
            };
          })
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('Check-in created successfully!');
        // Reset form
        setFormData({
          customerId: '',
          customerName: '',
          customerPhone: '',
          customerEmail: '',
          licensePlate: '',
          vehicleType: '',
          vehicleMake: '',
          vehicleModel: '',
          vehicleColor: '',
          services: [],
          specialInstructions: '',
          estimatedDuration: 30,
          washType: 'instant',
          valuableItems: '',
          securityCode: '',
          userCode: '',
          checkInProcess: '',
        });
        setSearchQuery('');
        setFoundCustomers([]);
        setShowCustomerResults(false);
        setIsCustomerSelected(false);
        
        // Redirect after a short delay
        setTimeout(() => {
          router.push('/checkins/history');
        }, 2000);
      } else {
        setError(result.error || 'Failed to create check-in');
      }
    } catch (err) {
      console.error('Error creating check-in:', err);
      setError('Failed to create check-in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    // Check if user is authenticated
    if (!user?.id) {
      setError('You must be logged in to create a check-in');
      setIsSubmitting(false);
      return;
    }

    // Check for duplicate license plate first
    const duplicateCheck = await checkForDuplicateLicensePlate(formData.licensePlate);
    if (duplicateCheck.hasDuplicates) {
      setDuplicateCheckIns(duplicateCheck.duplicates);
      setShowDuplicateWarning(true);
      setIsSubmitting(false);
      return;
    }

    // If no duplicates, proceed with submission
    proceedWithSubmission();
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
          <div className={`mb-6 p-4 rounded-lg border ${
            isCustomerSelected 
              ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800' 
              : 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800'
          }`}>
            <h3 className={`text-lg font-medium mb-3 ${
              isCustomerSelected 
                ? 'text-green-900 dark:text-green-100' 
                : 'text-blue-900 dark:text-blue-100'
            }`}>
              {isCustomerSelected ? 'Customer Selected' : 'Search for Existing Customer'}
            </h3>
            <p className={`text-sm mb-4 ${
              isCustomerSelected 
                ? 'text-green-700 dark:text-green-300' 
                : 'text-blue-700 dark:text-blue-300'
            }`}>
              {isCustomerSelected 
                ? 'Customer information has been populated from existing record. You can clear the selection to enter new customer details.'
                : 'Search by name, phone number, plate number, or email address'
              }
            </p>
            <div className="mb-3">
              <Label htmlFor="search-customer" className={`text-sm font-medium ${
                isCustomerSelected 
                  ? 'text-green-900 dark:text-green-100' 
                  : 'text-blue-900 dark:text-blue-100'
              }`}>
                Search Customer
              </Label>
              <InputField
                id="search-customer"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter name, phone, plate number, or email"
                disabled={isCustomerSelected}
              />
            </div>
            <div className="flex justify-center">
              <Button
                type="button"
                onClick={searchCustomer}
                disabled={isSearching || isCustomerSelected}
                className={`min-w-[120px] ${
                  isCustomerSelected 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
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

          {/* Clear Customer Button */}
          {isCustomerSelected && (
            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-center justify-between">
              
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearSelectedCustomer}
                  className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  Clear Selected Customer
                </Button>
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
                disabled={isCustomerSelected}
              />
            </FormField>
            <FormField label="Phone Number" required>
              <InputField
                type="tel"
                value={formData.customerPhone}
                onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                placeholder="Enter phone number"
                disabled={isCustomerSelected}
              />
            </FormField>
            <FormField label="Email Address">
              <InputField
                type="email"
                value={formData.customerEmail}
                onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                placeholder="Enter email address (optional)"
                disabled={isCustomerSelected}
              />
            </FormField>
          </div>
        </div>

        {/* Vehicle Information */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Vehicle Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="License Plate" required>
              <InputField
                type="text"
                value={formData.licensePlate}
                onChange={(e) => handleInputChange('licensePlate', e.target.value)}
                placeholder="Enter license plate"
                disabled={isCustomerSelected}
              />
            </FormField>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField label="Vehicle Type" required>
                <Select
                  options={vehicleTypes}
                  placeholder="Select vehicle type"
                  value={formData.vehicleType}
                  onChange={(value) => handleInputChange('vehicleType', value)}
                  disabled={isCustomerSelected}
                />
              </FormField>
              
              <FormField label="Vehicle Make">
                <InputField
                  value={formData.vehicleMake}
                  onChange={(e) => handleInputChange('vehicleMake', e.target.value)}
                  placeholder="Enter vehicle make (optional)"
                  disabled={isCustomerSelected}
                />
              </FormField>
              
              <FormField label="Vehicle Model">
                <InputField
                  value={formData.vehicleModel}
                  onChange={(e) => handleInputChange('vehicleModel', e.target.value)}
                  placeholder="Enter vehicle model (optional)"
                  disabled={isCustomerSelected}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Vehicle Color" required>
                <InputField
                  value={formData.vehicleColor}
                  onChange={(e) => handleInputChange('vehicleColor', e.target.value)}
                  placeholder="Enter vehicle color"
                  disabled={isCustomerSelected}
                />
              </FormField>
            </div>
          </div>
        </div>

        {/* Material Assignment */}
        {formData.services.some(s => s.workerId) && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Service Materials Summary (Optional)
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Overview of materials assigned to each service (materials can be handled by workers)
            </p>
            {formData.services.filter(s => s.workerId).map((serviceItem) => {
              const service = availableServices.find(s => s.id === serviceItem.serviceId);
              const worker = availableWashers.find(w => w.id === serviceItem.workerId);
              
              return (
                <div key={serviceItem.serviceId} className="mb-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    {service?.name} - {worker?.name}
                  </h3>
                  {serviceItem.materials.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No materials assigned (optional - workers can handle)</p>
                  ) : (
                    <div className="space-y-2">
                      {serviceItem.materials.map((material) => (
                        <div key={material.materialId} className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">{material.materialName}</span>
                          <span className="text-gray-900 dark:text-white">{material.quantity} {material.unit}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
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
            <div className="space-y-4">
              {availableServices.map((service) => {
                const isSelected = formData.services.some(s => s.serviceId === service.id);
                const selectedService = formData.services.find(s => s.serviceId === service.id);
                
                return (
                  <div
                    key={service.id}
                    className={`p-4 border rounded-lg transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    {/* Service Header */}
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => handleServiceToggle(service.id)}
                    >
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {service.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          NGN {service.price} • {service.duration} min
                        </p>
                        {service.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {service.description}
                          </p>
                        )}
                      </div>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>

                    {/* Service Configuration (shown when selected) */}
                    {isSelected && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 space-y-4">
                        {/* Worker Assignment */}
                        <div>
                          <Label htmlFor={`worker-${service.id}`}>
                            Assign Worker *
                          </Label>
                          <Select
                            options={availableWashers.map(washer => ({ value: washer.id, label: washer.name }))}
                            placeholder="Select a worker"
                            value={selectedService?.workerId || ''}
                            onChange={(value) => {
                              handleWorkerAssignment(service.id, value);
                            }}
                            className="mt-1"
                          />
                        </div>

                        {/* Materials Assignment - Optional (workers can handle on their end) */}
                        {selectedService?.workerId && (
                          <div>
                            <Label htmlFor={`materials-${service.id}`}>
                              Materials Assignment (Optional)
                            </Label>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                              Materials can be assigned here or handled by workers during the service
                            </p>
                            {/* Debug info */}
                            <div className="text-xs text-gray-500 mb-2">
                              Debug: Worker ID: {selectedService.workerId}, Materials Count: {serviceMaterials[service.id]?.length || 0}
                            </div>
                            {!serviceMaterials[service.id] ? (
                              <div className="text-center py-2">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Loading materials...</p>
                              </div>
                            ) : serviceMaterials[service.id].length === 0 ? (
                              <p className="text-xs text-gray-500 dark:text-gray-400">No materials available for this worker</p>
                            ) : (
                              <div className="grid grid-cols-1 gap-3">
                                {serviceMaterials[service.id].map((material) => {
                                  const assignedMaterial = selectedService.materials.find(m => m.materialId === material.id);
                                  
                                  return (
                                    <div
                                      key={material.id}
                                      className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700"
                                    >
                                      <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                          {material.toolName}
                                        </h4>
                                        <span className="text-xs text-gray-600 dark:text-gray-400">
                                          Available: {material.quantity} {material.unit}
                                        </span>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <label className="text-xs text-gray-600 dark:text-gray-400">
                                          Quantity to use:
                                        </label>
                                        <input
                                          type="number"
                                          min="0"
                                          max={material.quantity}
                                          step="0"
                                          className="w-16 px-2 py-1 text-xs border dark:bg-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                          placeholder="0"
                                          value={assignedMaterial?.quantity || 0}
                                          onChange={(e) => {
                                            const quantity = parseFloat(e.target.value) || 0;
                                            handleMaterialAssignment(service.id, material.id, quantity);
                                          }}
                                        />
                                        <span className="text-xs text-gray-600 dark:text-gray-400">
                                          {material.unit}
                                        </span>
                                      </div>
                                      {assignedMaterial?.quantity && assignedMaterial.quantity > 0 && (
                                        <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                                          Allocated: {assignedMaterial.quantity} {material.unit} for this check-in
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Materials Summary (Optional) */}
                        {selectedService && selectedService.materials.length > 0 && (
                          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
                            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                              Materials Summary for {service.name} (Optional)
                            </h4>
                            <div className="space-y-1">
                              {selectedService.materials.map((material) => (
                                <div key={material.materialId} className="flex justify-between text-xs">
                                  <span className="text-blue-700 dark:text-blue-300">{material.materialName}</span>
                                  <span className="text-blue-900 dark:text-blue-100 font-medium">
                                    {material.quantity} {material.unit}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Custom Pricing (only for $0 services) */}
                        {service.price === 0 && (
                          <div>
                            <Label htmlFor={`price-${service.id}`}>
                              Custom Price *
                            </Label>
                            <InputField
                              id={`price-${service.id}`}
                              type="number"
                              min="0"
                        
                              placeholder="Enter custom price"
                              value={selectedService?.customPrice ?? 0}
                              onChange={(e) => handleCustomPriceChange(service.id, parseFloat(e.target.value) || 0)}
                              className="mt-1"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Base price is 0. Set custom price for this service.
                            </p>
                          </div>
                        )}

                        {/* Price Increase (for all services) */}
                        {service.price > 0 && (
                          <div>
                            <Label htmlFor={`price-increase-${service.id}`}>
                              Price Increase (NGN) - Optional
                            </Label>
                            <InputField
                              id={`price-increase-${service.id}`}
                              type="number"
                              min="0"
                              placeholder="Enter price increase"
                              value={selectedService?.customPrice ? (selectedService.customPrice - service.price) : 0}
                              onChange={(e) => {
                                const increase = parseFloat(e.target.value) || 0;
                                const newPrice = service.price + increase;
                                handleCustomPriceChange(service.id, newPrice);
                              }}
                              className="mt-1"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Increase price for dirty vehicles. Cannot decrease below base price.
                            </p>
                          </div>
                        )}

                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            Final Price: NGN {selectedService?.customPrice !== undefined ? selectedService.customPrice : service.price}
                          </p>
                          {selectedService?.customPrice !== undefined && selectedService.customPrice !== service.price && (
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {selectedService.customPrice > service.price ? 'Price increased' : 'Custom price set'}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Security & Check-in Process */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Security & Check-in Process
          </h2>
          
          {/* Wash Type Selection */}
          <div className="mb-6">
            <FormField label="Wash Type" required>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="washType"
                    value="instant"
                    checked={formData.washType === 'instant'}
                    onChange={(e) => handleInputChange('washType', e.target.value as 'instant' | 'delayed')}
                    className="mr-2 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Instant Wash</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="washType"
                    value="delayed"
                    checked={formData.washType === 'delayed'}
                    onChange={(e) => handleInputChange('washType', e.target.value as 'instant' | 'delayed')}
                    className="mr-2 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Delayed Wash</span>
                </label>
              </div>
            </FormField>
          </div>

          {/* Passcode Requirement Notice */}
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-blue-800 dark:text-blue-300 text-sm">
              <strong>Important:</strong> All check-ins (both instant and delayed wash) require the check-in passcode to be marked as complete. 
              This ensures security and accountability for all car wash services.
            </p>
          </div>

          {/* Valuable Items Documentation */}
          <div className="mb-6">
            <FormField label="Valuable Items Documentation" required>
              <TextArea
                value={formData.valuableItems}
                onChange={(value) => handleInputChange('valuableItems', value)}
                placeholder={formData.washType === 'instant' 
                  ? "Note of valuable items for instant wash..." 
                  : "Note of valuable items and check-in process for delayed wash..."
                }
                rows={3}
              />
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {formData.washType === 'instant' 
                  ? "For instant wash: Take note of valuable items only"
                  : "For delayed wash: Take note of valuable items AND complete check-in process"
                }
              </p>
            </FormField>
          </div>

          {/* Security Codes - Only for Delayed Wash */}
          {formData.washType === 'delayed' && (
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
                <FormField label="Key Code" required>
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
                NGN {calculateTotalPrice()}
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

      {/* Duplicate License Plate Warning Modal */}
      {showDuplicateWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4 w-full">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Duplicate License Plate Warning
                </h3>
              </div>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                The license plate <strong>{formData.licensePlate}</strong> has already been used for check-ins today:
              </p>
              
              <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                {duplicateCheckIns.map((checkIn, index) => (
                  <div key={index} className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <div className="text-sm">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {checkIn.customerName}
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        Status: {checkIn.status} | Time: {new Date(checkIn.checkInTime).toLocaleTimeString()}
                      </p>
                      {checkIn.vehicleColor && checkIn.vehicleType && (
                        <p className="text-gray-600 dark:text-gray-400">
                          Vehicle: {checkIn.vehicleColor} {checkIn.vehicleType}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex space-x-3">
              <Button
                onClick={handleCancelDuplicate}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleProceedWithDuplicate}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700"
              >
                Proceed Anyway
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewCheckInPage; 