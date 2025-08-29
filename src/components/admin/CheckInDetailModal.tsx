'use client';

import React from 'react';
import { Modal } from '@/components/ui/modal';
import Badge from '@/components/ui/badge/Badge';
import Button from '@/components/ui/button/Button';
import { TimeIcon, CarIcon, UserIcon } from '@/icons';

interface CheckIn {
  id: string;
  customerName: string;
  customerPhone: string;
  licensePlate: string;
  vehicleType: string;
  vehicleColor: string;
  vehicleModel?: string;
  washType?: string;
  services: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'paid' | 'cancelled';
  checkInTime: Date;
  completedTime?: Date;
  assignedWasher?: string;
  assignedWasherId?: string;
  washerCompletionStatus?: boolean;
  estimatedDuration: number;
  actualDuration?: number;
  totalPrice: number;
  specialInstructions?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  customerId: string;
  passcode?: string;
  createdAt: Date;
  updatedAt: Date;
  userCode?: string;
}

interface CheckInDetailModalProps {
  checkIn: CheckIn | null;
  isOpen: boolean;
  onClose: () => void;
}

const CheckInDetailModal: React.FC<CheckInDetailModalProps> = ({
  checkIn,
  isOpen,
  onClose
}) => {
  if (!checkIn) return null;

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl">
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Check-In Details
            </h2>
          
          </div>
          
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Information */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <UserIcon className="w-5 h-5 mr-2" />
              Customer Information
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</label>
                <p className="text-gray-900 dark:text-white">{checkIn.customerName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</label>
                <p className="text-gray-900 dark:text-white">{checkIn.customerPhone}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Customer ID</label>
                <p className="text-gray-900 dark:text-white">{checkIn.customerId}</p>
              </div>
              {checkIn.userCode && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">User Code</label>
                  <p className="text-gray-900 dark:text-white font-mono">{checkIn.userCode}</p>
                </div>
              )}
            </div>
          </div>

          {/* Vehicle Information */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <CarIcon className="w-5 h-5 mr-2" />
              Vehicle Information
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">License Plate</label>
                <p className="text-gray-900 dark:text-white font-mono text-lg">{checkIn.licensePlate}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Vehicle Type</label>
                <p className="text-gray-900 dark:text-white">{checkIn.vehicleType}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Color</label>
                <p className="text-gray-900 dark:text-white">{checkIn.vehicleColor}</p>
              </div>
              {checkIn.vehicleModel && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Model</label>
                  <p className="text-gray-900 dark:text-white">{checkIn.vehicleModel}</p>
                </div>
              )}
            </div>
          </div>

          {/* Service Information */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Service Details
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Services</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {checkIn.services.map((service, index) => (
                    <Badge key={index} variant="light" color="light">
                      {service}
                    </Badge>
                  ))}
                </div>
              </div>
              {checkIn.washType && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Wash Type</label>
                  <p className="text-gray-900 dark:text-white">{checkIn.washType}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Price</label>
                <p className="text-gray-900 dark:text-white text-lg font-semibold">
                  ${checkIn.totalPrice.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Timing & Assignment */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <TimeIcon className="w-5 h-5 mr-2" />
              Timing & Assignment
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Check-In Time</label>
                <p className="text-gray-900 dark:text-white">{formatDate(checkIn.checkInTime)}</p>
              </div>
              {checkIn.completedTime && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Completed Time</label>
                  <p className="text-gray-900 dark:text-white">{formatDate(checkIn.completedTime)}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Estimated Duration</label>
                <p className="text-gray-900 dark:text-white">{formatDuration(checkIn.estimatedDuration)}</p>
              </div>
              {checkIn.actualDuration && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Actual Duration</label>
                  <p className="text-gray-900 dark:text-white">{formatDuration(checkIn.actualDuration)}</p>
                </div>
              )}
              {checkIn.assignedWasher && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Assigned Washer</label>
                  <p className="text-gray-900 dark:text-white">{checkIn.assignedWasher}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Special Instructions */}
        {checkIn.specialInstructions && (
          <div className="mt-6 bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Special Instructions
            </h3>
            <p className="text-gray-700 dark:text-gray-300">{checkIn.specialInstructions}</p>
          </div>
        )}

      

        {/* Footer */}
        <div className="flex justify-end mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CheckInDetailModal;
