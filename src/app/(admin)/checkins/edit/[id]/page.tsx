"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Button from '@/components/ui/button/Button';
import Select from '@/components/form/Select';
import { useAuth } from '@/context/AuthContext';

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
}

interface Worker {
  id: string;
  name: string;
  role: string;
}

interface Material {
  id: string;
  material_name: string;
  current_quantity: number;
  unit: string;
}

interface CheckInFormData {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  licensePlate: string;
  vehicleType: string;
  vehicleColor: string;
  vehicleModel: string;
  vehicleMake: string;
  washType: string;
  specialInstructions: string;
  valuableItems: string;
  remarks: string;
  passcode: string;
  userCode: string;
}

interface ServiceWithWorker {
  serviceId: string;
  workerId: string;
  materials: Array<{
    materialId: string;
    materialName: string;
    quantity: number;
    unit: string;
  }>;
  serviceData: Service;
}

interface ExistingService {
  service_id: string;
  service_name: string;
  price: number;
  duration: number;
}

interface Tool {
  id: string;
  toolName: string;
  quantity: number;
}

const EditCheckInPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const checkInId = params.id as string;

  // Form state
  const [formData, setFormData] = useState<CheckInFormData>({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    licensePlate: '',
    vehicleType: '',
    vehicleColor: '',
    vehicleModel: '',
    vehicleMake: '',
    washType: 'delayed',
    specialInstructions: '',
    valuableItems: '',
    remarks: '',
    passcode: '',
    userCode: ''
  });

  // Services and workers
  const [services, setServices] = useState<Service[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [servicesWithWorkers, setServicesWithWorkers] = useState<ServiceWithWorker[]>([]);
  const [serviceMaterials, setServiceMaterials] = useState<Record<string, Array<Material>>>({});
  const [existingServices, setExistingServices] = useState<ExistingService[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch existing check-in data
  const fetchCheckInData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/check-ins/${checkInId}`, {
        headers: {
          'X-Admin-ID': user?.id || ''
        }
      });
      const data = await response.json();

      if (data.success && data.checkIn) {
        const checkIn = data.checkIn;
        setFormData({
          customerName: checkIn.customerName || '',
          customerPhone: checkIn.customerPhone || '',
          customerEmail: checkIn.customerEmail || '',
          licensePlate: checkIn.licensePlate || '',
          vehicleType: checkIn.vehicleType || '',
          vehicleColor: checkIn.vehicleColor || '',
          vehicleModel: checkIn.vehicleModel || '',
          vehicleMake: checkIn.vehicleMake || '',
          washType: checkIn.washType || 'delayed',
          specialInstructions: checkIn.specialInstructions || '',
          valuableItems: checkIn.valuableItems || '',
          remarks: checkIn.remarks || '',
          passcode: checkIn.passcode || '',
          userCode: checkIn.userCode || ''
        });

        // Store existing services for display (don't pre-select them)
        if (checkIn.existingServices && checkIn.existingServices.length > 0) {
          setExistingServices(checkIn.existingServices);
        }
      } else {
        setError(data.error || 'Failed to fetch check-in data');
      }
    } catch (err) {
      console.error('Error fetching check-in data:', err);
      setError('Failed to fetch check-in data');
    } finally {
      setIsLoading(false);
    }
  }, [checkInId, user?.id]);

  // Fetch services
  const fetchServices = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/services');
      const data = await response.json();
      if (data.success) {
        setServices(data.services);
      }
    } catch (err) {
      console.error('Error fetching services:', err);
    }
  }, []);

  // Fetch workers
  const fetchWorkers = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/washers');
      const data = await response.json();
      if (data.success) {
        setWorkers(data.washers);
      }
    } catch (err) {
      console.error('Error fetching workers:', err);
    }
  }, []);

  // Fetch materials for a specific service and worker
  const fetchServiceMaterials = useCallback(async (serviceId: string, workerId: string) => {
    try {
      const response = await fetch(`/api/admin/washer-materials?washerId=${workerId}`);
      const data = await response.json();
      if (data.success) {
        // Transform tools to materials format
        const materials = data.tools?.map((tool: Tool) => ({
          id: tool.id,
          material_name: tool.toolName,
          current_quantity: tool.quantity,
          unit: 'piece' // Default unit, could be made configurable
        })) || [];
        
        setServiceMaterials(prev => ({
          ...prev,
          [serviceId]: materials
        }));
      } else {
        console.error('Failed to fetch materials:', data.error);
      }
    } catch (err) {
      console.error('Error fetching service materials:', err);
    }
  }, []);

  useEffect(() => {
    fetchCheckInData();
    fetchServices();
    fetchWorkers();
  }, [fetchCheckInData, fetchServices, fetchWorkers]);
 

  const handleServiceSelection = (serviceId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedServices(prev => [...prev, serviceId]);
      // Add service to servicesWithWorkers with empty worker
      const service = services.find(s => s.id === serviceId);
      if (service) {
        setServicesWithWorkers(prev => [...prev, {
          serviceId,
          workerId: '',
          materials: [],
          serviceData: service
        }]);
      }
    } else {
      setSelectedServices(prev => prev.filter(id => id !== serviceId));
      setServicesWithWorkers(prev => prev.filter(s => s.serviceId !== serviceId));
      // Clear materials for this service
      setServiceMaterials(prev => {
        const newMaterials = { ...prev };
        delete newMaterials[serviceId];
        return newMaterials;
      });
    }
  };

  const handleWorkerAssignment = (serviceId: string, workerId: string) => {
    setServicesWithWorkers(prev => prev.map(service => 
      service.serviceId === serviceId 
        ? { ...service, workerId, materials: [] }
        : service
    ));

    // Clear materials for this service and fetch new ones
    setServiceMaterials(prev => {
      const newMaterials = { ...prev };
      delete newMaterials[serviceId];
      return newMaterials;
    });

    if (workerId) {
      fetchServiceMaterials(serviceId, workerId);
    }
  };

  const handleMaterialAssignment = (serviceId: string, materialId: string, quantity: number) => {
    const service = servicesWithWorkers.find(s => s.serviceId === serviceId);
    if (!service) return;

    const material = serviceMaterials[serviceId]?.find(m => m.id === materialId);
    if (!material) return;

    if (quantity > material.current_quantity) {
      alert(`Cannot assign more than available quantity (${material.current_quantity} ${material.unit})`);
      return;
    }

    setServicesWithWorkers(prev => prev.map(s => {
      if (s.serviceId === serviceId) {
        const existingMaterial = s.materials.find(m => m.materialId === materialId);
        if (existingMaterial) {
          // Update existing material
          return {
            ...s,
            materials: s.materials.map(m => 
              m.materialId === materialId 
                ? { ...m, quantity }
                : m
            )
          };
        } else {
          // Add new material
          return {
            ...s,
            materials: [...s.materials, {
              materialId,
              materialName: material.material_name,
              quantity,
              unit: material.unit
            }]
          };
        }
      }
      return s;
    }));
  };

  const calculateTotalAmount = () => {
    return servicesWithWorkers.reduce((total, service) => total + service.serviceData.price, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (servicesWithWorkers.length === 0) {
      setError('Please select at least one service');
      return;
    }

    if (servicesWithWorkers.some(s => !s.workerId)) {
      setError('Please assign a worker to all selected services');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const submissionData = {
        services: servicesWithWorkers
      };

      const response = await fetch(`/api/admin/check-ins/${checkInId}/edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-ID': user?.id || ''
        },
        body: JSON.stringify(submissionData)
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(`Successfully added ${result.newCheckIns.length} new service(s) to the check-in!`);
        setTimeout(() => {
          router.push('/checkins/active');
        }, 2000);
      } else {
        setError(result.error || 'Failed to add services to check-in');
      }
    } catch (err) {
      console.error('Error adding services to check-in:', err);
      setError('Failed to add services to check-in');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading check-in data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Add Services to Check-in
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Add additional services to this check-in. Existing services cannot be modified.
              </p>
            </div>
            <Button
              onClick={() => router.back()}
              variant="outline"
            >
              Back
            </Button>
          </div>
        </div>

        {/* Customer Information Display */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Customer Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Customer Name</p>
              <p className="font-medium text-gray-900 dark:text-white">{formData.customerName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Phone</p>
              <p className="font-medium text-gray-900 dark:text-white">{formData.customerPhone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">License Plate</p>
              <p className="font-medium text-gray-900 dark:text-white">{formData.licensePlate}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Vehicle</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {formData.vehicleColor} {formData.vehicleType}
                {formData.vehicleModel && ` (${formData.vehicleModel})`}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Existing Services Display */}
          {existingServices.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Current Services (Cannot be modified)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {existingServices.map((service, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="h-4 w-4 bg-green-500 rounded flex items-center justify-center">
                      <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-900 dark:text-white font-medium">
                          {service.service_name}
                        </span>
                        <span className="text-green-600 dark:text-green-400 font-semibold">
                          ₦{service.price.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Duration: {service.duration} minutes
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available Services Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Add Additional Services
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {services
                .filter(service => !existingServices.some(existing => existing.service_id === service.id))
                .map((service) => (
                <div key={service.id} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id={`service-${service.id}`}
                    checked={selectedServices.includes(service.id)}
                    onChange={(e) => handleServiceSelection(service.id, e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor={`service-${service.id}`} className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-900 dark:text-white font-medium">
                        {service.name}
                      </span>
                      <span className="text-blue-600 dark:text-blue-400 font-semibold">
                        ₦{service.price.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Duration: {service.duration} minutes
                    </p>
                  </label>
                </div>
              ))}
            </div>
            {services.filter(service => !existingServices.some(existing => existing.service_id === service.id)).length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">
                  All available services are already included in this check-in.
                </p>
              </div>
            )}
          </div>

          {/* Worker Assignment */}
          {servicesWithWorkers.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Assign Workers
              </h2>
              <div className="space-y-4">
                {servicesWithWorkers.map((service) => (
                  <div key={service.serviceId} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {service.serviceData.name}
                      </h3>
                      <span className="text-blue-600 dark:text-blue-400 font-semibold">
                        ₦{service.serviceData.price.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Assign Worker
                      </label>
                      <Select
                        value={service.workerId}
                        onChange={(value) => handleWorkerAssignment(service.serviceId, value)}
                        options={[
                          { value: '', label: 'Select a worker' },
                          ...workers.map(worker => ({
                            value: worker.id,
                            label: worker.name
                          }))
                        ]}
                        placeholder="Select a worker"
                        className="w-full"
                      />
                    </div>


                    {/* Materials for this service */}
                    {service.workerId && serviceMaterials[service.serviceId] && (
                      <div className="mt-4">
                        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-2">
                          Available Materials
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {serviceMaterials[service.serviceId].map((material) => (
                            <div key={material.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {material.material_name}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  Available: {material.current_quantity} {material.unit}
                                </p>
                              </div>
                              <input
                                type="number"
                                min="0"
                                max={material.current_quantity}
                                value={service.materials.find(m => m.materialId === material.id)?.quantity || 0}
                                onChange={(e) => handleMaterialAssignment(
                                  service.serviceId,
                                  material.id,
                                  parseInt(e.target.value) || 0
                                )}
                                className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Show message when worker is assigned but no materials */}
                    {service.workerId && !serviceMaterials[service.serviceId] && (
                      <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          Loading materials for this worker-service combination...
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total Amount */}
          {servicesWithWorkers.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium text-blue-900 dark:text-blue-100">
                  Total Amount for Additional Services:
                </span>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  ₦{calculateTotalAmount().toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Error and Success Messages */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="ml-3 text-red-800 dark:text-red-200">{error}</span>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="ml-3 text-green-800 dark:text-green-200">{success}</span>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || servicesWithWorkers.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? 'Adding Services...' : 'Add Services'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCheckInPage;
