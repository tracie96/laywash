"use client";
import React, { useState, useEffect, useCallback } from "react";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";

interface Milestone {
  id: string;
  name: string;
  description: string;
  type: 'visits' | 'spending' | 'custom';
  condition: {
    operator: '>=' | '<=' | '=' | '>' | '<';
    value: number;
    period?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all_time';
  };
  reward?: {
    type: 'discount' | 'bonus' | 'free_service';
    value: number;
    description?: string;
  };
  isActive: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
}

const MilestonesPage: React.FC = () => {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'visits' | 'spending' | 'custom'>('all');
  const [isCheckingMilestones, setIsCheckingMilestones] = useState(false);
  const router = useRouter();

  const fetchMilestones = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (selectedFilter !== 'all') {
        params.append('isActive', selectedFilter === 'active' ? 'true' : 'false');
      }
      if (selectedType !== 'all') {
        params.append('type', selectedType);
      }

      const response = await fetch(`/api/admin/milestones?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setMilestones(data.milestones);
      } else {
        setError(data.error || 'Failed to fetch milestones');
      }
    } catch (err) {
      console.error('Error fetching milestones:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, [selectedFilter, selectedType]);

  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones]);

  const handleToggleActive = async (milestoneId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/milestones/${milestoneId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchMilestones();
      } else {
        alert(`Failed to update milestone: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error updating milestone:', err);
      alert('Failed to update milestone. Please try again.');
    }
  };

  const handleDeleteMilestone = async (milestoneId: string, milestoneName: string) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the milestone "${milestoneName}"? This action cannot be undone.`
    );
    
    if (!confirmDelete) return;

    try {
      const response = await fetch(`/api/admin/milestones/${milestoneId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        await fetchMilestones();
        alert(`Milestone "${milestoneName}" has been deleted successfully.`);
      } else {
        alert(`Failed to delete milestone: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error deleting milestone:', err);
      alert('Failed to delete milestone. Please try again.');
    }
  };

  const handleCheckAllMilestones = async () => {
    const confirmCheck = window.confirm(
      `This will check all customers against all active milestones. This may take a few moments. Continue?`
    );
    
    if (!confirmCheck) return;

    try {
      setIsCheckingMilestones(true);
      
      // First get all customers
      const customersResponse = await fetch('/api/admin/customers');
      const customersData = await customersResponse.json();
      
      if (!customersData.success) {
        throw new Error('Failed to fetch customers');
      }

      let totalNewAchievements = 0;

      // Check milestones for each customer
      for (const customer of customersData.customers) {
        try {
          const response = await fetch('/api/admin/milestone-achievements', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              customerId: customer.id,
              forceCheck: true
            }),
          });

          const data = await response.json();
          if (data.success) {
            totalNewAchievements += data.newAchievements;
          }
        } catch (customerError) {
          console.error(`Error checking milestones for customer ${customer.id}:`, customerError);
        }
      }

      alert(`Milestone check completed! ${totalNewAchievements} new milestone${totalNewAchievements === 1 ? '' : 's'} achieved across all customers.`);
    } catch (err) {
      console.error('Error checking all milestones:', err);
      alert('Failed to check milestones. Please try again.');
    } finally {
      setIsCheckingMilestones(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'visits':
        return "bg-blue-light-100 text-blue-light-800 dark:bg-blue-light-900/30 dark:text-blue-light-300";
      case 'spending':
        return "bg-green-light-100 text-green-light-800 dark:bg-green-light-900/30 dark:text-green-light-300";
      case 'custom':
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
    }
  };

  const getOperatorText = (operator: string) => {
    switch (operator) {
      case '>=': return 'at least';
      case '<=': return 'at most';
      case '=': return 'exactly';
      case '>': return 'more than';
      case '<': return 'less than';
      default: return operator;
    }
  };

  const formatCondition = (milestone: Milestone) => {
    const { type, condition } = milestone;
    const operatorText = getOperatorText(condition.operator);
    const value = condition.value;
    
    if (type === 'visits') {
      return `${operatorText} ${value} visit${value === 1 ? '' : 's'}`;
    } else if (type === 'spending') {
      return `${operatorText} $${value.toFixed(2)} spent`;
    }
    return `${operatorText} ${value}`;
  };

  const formatReward = (reward?: Milestone['reward']) => {
    if (!reward) return 'No reward';
    
    switch (reward.type) {
      case 'discount':
        return `${reward.value}% discount`;
      case 'bonus':
        return `$${reward.value} bonus`;
      case 'free_service':
        return `Free service (value: $${reward.value})`;
      default:
        return 'Custom reward';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-light-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading milestones...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageBreadCrumb pageTitle="Manage Milestones" />
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error loading milestones</h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={fetchMilestones}
                className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 px-3 py-1 rounded-md text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageBreadCrumb pageTitle="Manage Milestones" />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Milestones</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{milestones.length}</p>
            </div>
            <div className="p-3 bg-blue-light-100 dark:bg-blue-light-900/30 rounded-lg">
              <svg className="w-6 h-6 text-blue-light-600 dark:text-blue-light-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Milestones</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {milestones.filter(m => m.isActive).length}
              </p>
            </div>
            <div className="p-3 bg-green-light-100 dark:bg-green-light-900/30 rounded-lg">
              <svg className="w-6 h-6 text-green-light-600 dark:text-green-light-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Visit Milestones</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {milestones.filter(m => m.type === 'visits').length}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons and Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex gap-2">
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-light-500 dark:bg-gray-700 dark:text-white text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as 'all' | 'visits' | 'spending' | 'custom')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-light-500 dark:bg-gray-700 dark:text-white text-sm"
            >
              <option value="all">All Types</option>
              <option value="visits">Visits</option>
              <option value="spending">Spending</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <button
            onClick={fetchMilestones}
            className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleCheckAllMilestones}
            variant="outline"
            disabled={isCheckingMilestones}
          >
            {isCheckingMilestones ? 'Checking...' : 'Check All Milestones'}
          </Button>
        
          <Button
            onClick={() => router.push('/milestones/create')}
          >
            Create New Milestone
          </Button>
        </div>
      </div>

      {/* Milestones Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Customer Milestones</h2>
        </div>
        <div className="overflow-x-auto">
          {milestones.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto h-12 w-12 text-gray-400">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No milestones found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Get started by creating your first customer milestone.
              </p>
              <div className="mt-6">
                <Button onClick={() => router.push('/milestones/create')}>
                  Create New Milestone
                </Button>
              </div>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Condition</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reward</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {milestones.map((milestone) => (
                  <tr key={milestone.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {milestone.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {milestone.description}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(milestone.type)}`}>
                        {milestone.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatCondition(milestone)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatReward(milestone.reward)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge color={milestone.isActive ? "success" : "warning"}>
                        {milestone.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {milestone.createdByName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => router.push(`/milestone-achievements?milestoneId=${milestone.id}`)}
                          className="text-green-600 hover:text-green-500 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                        >
                          View Achievements
                        </button>
                        <button 
                          onClick={() => router.push(`/milestone-achievements?milestoneId=${milestone.id}`)}
                          className="text-blue-light-600 hover:text-blue-light-500 dark:text-blue-light-400 dark:hover:text-blue-light-300 transition-colors"
                        >
                          View Details
                        </button>
                        <button 
                          onClick={() => handleToggleActive(milestone.id, milestone.isActive)}
                          className="text-orange-600 hover:text-orange-500 dark:text-orange-400 dark:hover:text-orange-300 transition-colors"
                        >
                          {milestone.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button 
                          onClick={() => handleDeleteMilestone(milestone.id, milestone.name)}
                          className="text-error-600 hover:text-error-500 dark:text-error-400 dark:hover:text-error-300 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default MilestonesPage;
