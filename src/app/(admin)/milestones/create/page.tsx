"use client";
import React, { useState } from "react";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button/Button";
import InputField from "@/components/form/input/InputField";
import { useAuth } from "@/context/AuthContext";

interface MilestoneFormData {
  name: string;
  description: string;
  type: 'visits' | 'spending' | 'custom';
  operator: '>=' | '<=' | '=' | '>' | '<';
  value: number;
  period?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all_time';
  hasReward: boolean;
  rewardType?: 'discount' | 'bonus' | 'free_service';
  rewardValue?: number;
  rewardDescription?: string;
  isActive: boolean;
}

const CreateMilestonePage: React.FC = () => {
  const [formData, setFormData] = useState<MilestoneFormData>({
    name: '',
    description: '',
    type: 'visits',
    operator: '>=',
    value: 1,
    period: 'all_time',
    hasReward: false,
    isActive: true
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.description.trim()) {
      setError('Name and description are required');
      return;
    }

    if (formData.value <= 0) {
      setError('Value must be greater than 0');
      return;
    }

    if (formData.hasReward) {
      if (!formData.rewardType || !formData.rewardValue || formData.rewardValue <= 0) {
        setError('Reward type and value are required when reward is enabled');
        return;
      }
    }

    try {
      setIsSaving(true);
      setError(null);

      // For demo purposes, using a placeholder admin ID
      // In a real app, this would come from the authenticated user
      const adminId = user?.id; // This should be replaced with actual admin ID from auth context

      const milestoneData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        type: formData.type,
        condition: {
          operator: formData.operator,
          value: formData.value,
          period: formData.period
        },
        reward: formData.hasReward ? {
          type: formData.rewardType,
          value: formData.rewardValue,
          description: formData.rewardDescription?.trim()
        } : null,
        isActive: formData.isActive,
        createdBy: adminId
      };

      const response = await fetch('/api/admin/milestones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(milestoneData),
      });

      const data = await response.json();

      if (data.success) {
        router.push('/milestones');
      } else {
        setError(data.error || 'Failed to create milestone');
      }
    } catch (err) {
      console.error('Error creating milestone:', err);
      setError('Failed to connect to server');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof MilestoneFormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <PageBreadCrumb pageTitle="Create New Milestone" />

      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Create New Milestone
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Set up a new milestone for customers to achieve and get rewarded.
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Milestone Name *
                </label>
                <InputField
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., First 3 Visits"
                  
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Milestone Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-light-500 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="visits">Number of Visits</option>
                  <option value="spending">Total Spending Amount</option>
                  <option value="custom">Custom Milestone</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe what this milestone represents..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-light-500 dark:bg-gray-700 dark:text-white"
                rows={3}
                required
              />
            </div>

            {/* Condition Settings */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Milestone Condition
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Operator
                  </label>
                  <select
                    value={formData.operator}
                    onChange={(e) => handleInputChange('operator', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-light-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value=">=">At least (≥)</option>
                    <option value="=">Exactly (=)</option>
                    <option value=">">More than (&#62;)</option>
                    <option value="<=">At most (≤)</option>
                    <option value="<">Less than (&#60;)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {formData.type === 'visits' ? 'Number of Visits' : 
                     formData.type === 'spending' ? 'Amount ($)' : 'Value'}
                  </label>
                  <InputField
                    type="number"
                    value={formData.value}
                    onChange={(e) => handleInputChange('value', parseInt(e.target.value) || 0)}
                    min="1"
                    step={formData.type === 'spending' ? 0.01 : 1}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Time Period
                  </label>
                  <select
                    value={formData.period}
                    onChange={(e) => handleInputChange('period', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-light-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="all_time">All Time</option>
                    <option value="yearly">Per Year</option>
                    <option value="monthly">Per Month</option>
                    <option value="weekly">Per Week</option>
                    <option value="daily">Per Day</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Reward Settings */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Reward Settings
              </h3>
              
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.hasReward}
                    onChange={(e) => handleInputChange('hasReward', e.target.checked)}
                    className="rounded border-gray-300 text-green-light-600 focus:ring-green-light-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    This milestone has a reward
                  </span>
                </label>
              </div>

              {formData.hasReward && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Reward Type
                    </label>
                    <select
                      value={formData.rewardType}
                      onChange={(e) => handleInputChange('rewardType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-light-500 dark:bg-gray-700 dark:text-white"
                      required={formData.hasReward}
                    >
                      <option value="">Select reward type</option>
                      <option value="discount">Discount (%)</option>
                      <option value="bonus">Cash Bonus ($)</option>
                      <option value="free_service">Free Service</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {formData.rewardType === 'discount' ? 'Discount Percentage' :
                       formData.rewardType === 'bonus' ? 'Bonus Amount ($)' :
                       formData.rewardType === 'free_service' ? 'Service Value ($)' : 'Value'}
                    </label>
                    <InputField
                      type="number"
                      value={formData.rewardValue || ''}
                      onChange={(e) => handleInputChange('rewardValue', parseFloat(e.target.value) || 0)}
                      min="0"
                      step={formData.rewardType === 'discount' ? 1 : 0.01}
                      max={formData.rewardType === 'discount' ? '100' : undefined}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Reward Description
                    </label>
                    <InputField
                      type="text"
                      value={formData.rewardDescription || ''}
                      onChange={(e) => handleInputChange('rewardDescription', e.target.value)}
                      placeholder="Optional description"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Status */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => handleInputChange('isActive', e.target.checked)}
                    className="rounded border-gray-300 text-green-light-600 focus:ring-green-light-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Activate this milestone immediately
                  </span>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
              >
                {isSaving ? 'Creating...' : 'Create Milestone'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateMilestonePage;
