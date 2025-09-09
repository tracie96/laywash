"use client";
import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import Input from '@/components/form/input/InputField';
import Label from '@/components/form/Label';
import Button from '@/components/ui/button/Button';
import { LocationSelect } from '@/components/ui/LocationSelect';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExpenseAdded: () => void;
}

const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  onExpenseAdded
}) => {
  const [formData, setFormData] = useState({
    serviceType: 'other' as const,
    amount: '',
    reason: '',
    description: '',
    locationId: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const serviceTypes = [
    { value: 'checkin', label: 'Free Car Wash' },
    { value: 'salary', label: 'Admin/Washer Salary' },
    { value: 'sales', label: 'Free Sales' },
    { value: 'free_will', label: 'Voluntary Expense' },
    { value: 'deposit_to_bank', label: 'Bank Deposit' },
    { value: 'other', label: 'Other' }
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.reason) {
      setError('Amount and reason are required');
      return;
    }

    if (parseFloat(formData.amount) <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceType: formData.serviceType,
          amount: parseFloat(formData.amount),
          reason: formData.reason,
          description: formData.description || null,
          locationId: formData.locationId || null,
          expenseDate: new Date().toISOString()
        }),
      });

      const data = await response.json();

      if (data.success) {
        onExpenseAdded();
        setFormData({
          serviceType: 'other',
          amount: '',
          reason: '',
          description: '',
          locationId: ''
        });
        onClose();
      } else {
        setError(data.error || 'Failed to add expense');
      }
    } catch {
      setError('An error occurred while adding the expense');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Add New Expense
        </h2>

        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <span className="text-red-800 dark:text-red-200 text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Service Type */}
          <div>
            <Label>Service Type <span className="text-error-500">*</span></Label>
            <select
              value={formData.serviceType}
              onChange={(e) => handleInputChange('serviceType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              {serviceTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <Label>Amount (₦) <span className="text-error-500">*</span></Label>
            <Input
              type="number"
              step={0.01}
              min="0"
              placeholder="Enter amount"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
            />
          </div>

          {/* Reason */}
          <div>
            <Label>Reason <span className="text-error-500">*</span></Label>
            <Input
              type="text"
              placeholder="Brief reason for expense"
              value={formData.reason}
              onChange={(e) => handleInputChange('reason', e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <Label>Description</Label>
            <textarea
              placeholder="Detailed description (optional)"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              rows={3}
            />
          </div>

          {/* Location */}
          <div>
            <Label>Location</Label>
            <LocationSelect
              value={formData.locationId}
              onChange={(locationId) => handleInputChange('locationId', locationId)}
              placeholder="Select location (optional)"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? 'Adding...' : 'Add Expense'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="px-6"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default AddExpenseModal;
