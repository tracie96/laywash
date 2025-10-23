"use client";
import React, { useState, useEffect, useCallback } from "react";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/context/AuthContext";

interface CustomerMilestoneAchievement {
  id: string;
  customerId: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
    licensePlate: string;
    totalVisits: number;
    totalSpent: number;
  };
  milestoneId: string;
  milestone: {
    id: string;
    name: string;
    description: string;
    type: 'visits' | 'spending' | 'custom';
    condition: {
      operator: string;
      value: number;
    };
    reward?: {
      type: 'discount' | 'bonus' | 'free_service';
      value: number;
      description?: string;
    };
    isActive: boolean;
  };
  achievedAt: Date;
  achievedValue: number;
  rewardClaimed: boolean;
  claimedAt?: Date;
  claimedBy?: string;
  claimedByName?: string;
  notes?: string;
}

interface QualifyingCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  actualVisits: number;
  actualSpent: number;
  achievedValue: number;
}

const MilestoneAchievementsPage: React.FC = () => {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<CustomerMilestoneAchievement[]>([]);
  const [qualifyingCustomers, setQualifyingCustomers] = useState<QualifyingCustomer[]>([]);
  const [currentMilestone, setCurrentMilestone] = useState<{
    id: string;
    name: string;
    description: string;
    type: 'visits' | 'spending' | 'custom';
    condition: {
      operator: string;
      value: number;
    };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'claimed' | 'unclaimed'>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'visits' | 'spending' | 'custom'>('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [viewMode, setViewMode] = useState<'achievements' | 'qualifying'>('achievements');
  
  // Bonus modal states
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [bonusForm, setBonusForm] = useState({
    customerId: '',
    customerName: '',
    amount: '',
    reason: '',
    milestone: ''
  });
  const [bonusError, setBonusError] = useState<string | null>(null);
  const [bonusSubmitting, setBonusSubmitting] = useState(false);
  
  // Track existing bonuses
  const [existingBonuses, setExistingBonuses] = useState<Array<{
    recipientId: string;
    milestone: string;
    status: string;
  }>>([]);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const milestoneId = searchParams.get('milestoneId');

  const fetchAchievements = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (selectedFilter !== 'all') {
        params.append('rewardClaimed', selectedFilter === 'claimed' ? 'true' : 'false');
      }
      if (milestoneId) {
        params.append('milestoneId', milestoneId);
      }

      const response = await fetch(`/api/admin/milestone-achievements?${params.toString()}`, {
        headers: {
          'X-Admin-ID': user.id,
        },
      });
      const data = await response.json();
      
      if (data.success) {
        setAchievements(data.achievements);
      } else {
        setError(data.error || 'Failed to fetch milestone achievements');
      }
    } catch (err) {
      console.error('Error fetching milestone achievements:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, [selectedFilter, milestoneId, user?.id]);

  const fetchQualifyingCustomers = useCallback(async () => {
    if (!milestoneId || !user?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Add a timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch('/api/admin/milestone-achievements', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-ID': user.id,
        },
        body: JSON.stringify({ milestoneId }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const data = await response.json();
      
      if (data.success) {
        setQualifyingCustomers(data.qualifyingCustomers);
        setCurrentMilestone(data.milestone);
        setViewMode('qualifying');
      } else {
        setError(data.error || 'Failed to fetch qualifying customers');
      }
    } catch (err) {
      console.error('Error fetching qualifying customers:', err);
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timed out. Please try again.');
      } else {
        setError('Failed to connect to server');
      }
    } finally {
      setLoading(false);
    }
  }, [milestoneId, user?.id]);

  // Fetch bonuses to check which customers already have bonuses
  const fetchBonuses = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/bonuses?type=customer');
      const data = await response.json();
      
      if (data.success) {
        setExistingBonuses(data.bonuses || []);
      }
    } catch (error) {
      console.error('Error fetching bonuses:', error);
    }
  }, []);

  useEffect(() => {
    fetchBonuses();
    if (milestoneId) {
      fetchQualifyingCustomers();
    } else {
    fetchAchievements();
    }
  }, [milestoneId, selectedFilter, selectedType, searchTerm, fetchAchievements, fetchQualifyingCustomers, fetchBonuses]);

  // Get bonus status for customer and milestone
  const getBonusStatus = (customerId: string, milestoneName: string): string | null => {
    const bonus = existingBonuses.find(
      bonus => 
        bonus.recipientId === customerId && 
        bonus.milestone === milestoneName &&
        bonus.status !== 'rejected'
    );
    return bonus?.status || null;
  };

  // Get status badge color
  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200';
      case 'approved':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  // Handle search button click
  const handleSearch = () => {
    setSearchTerm(searchInput);
  };

  // Handle clear search
  const handleClearSearch = () => {
    setSearchInput('');
    setSearchTerm('');
  };

  const handleClaimReward = async (achievementId: string, customerName: string) => {
    const confirmClaim = window.confirm(
      `Are you sure you want to mark the reward as claimed for ${customerName}?`
    );
    
    if (!confirmClaim) return;

    // For demo purposes, using a placeholder admin ID
    // In a real app, this would come from the authenticated user
    const adminId = 'current-admin-id'; // This should be replaced with actual admin ID from auth context

    try {
      const response = await fetch(`/api/admin/milestone-achievements/${achievementId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          claimedBy: adminId,
          notes: `Reward claimed by admin at ${new Date().toLocaleString()}`
        }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchAchievements();
        setNotification({ type: 'success', message: `Reward has been marked as claimed for ${customerName}.` });
        setTimeout(() => setNotification(null), 5000);
      } else {
        setNotification({ type: 'error', message: `Failed to claim reward: ${data.error || 'Unknown error'}` });
        setTimeout(() => setNotification(null), 5000);
      }
    } catch (err) {
      console.error('Error claiming reward:', err);
      alert('Failed to claim reward. Please try again.');
    }
  };

  const handleOpenBonusModal = (customerId: string, customerName: string, milestone: string) => {
    setBonusForm({
      customerId,
      customerName,
      amount: '',
      reason: `Milestone Achievement: ${milestone}`,
      milestone
    });
    setBonusError(null);
    setShowBonusModal(true);
  };

  const handleCreateBonus = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bonusForm.amount || !bonusForm.reason) {
      setBonusError('Please fill in all required fields');
      return;
    }

    const amount = parseFloat(bonusForm.amount);
    if (isNaN(amount) || amount <= 0) {
      setBonusError('Bonus amount must be greater than 0');
      return;
    }

    setBonusSubmitting(true);
    setBonusError(null);

    try {
      // Create bonus entry
      const bonusResponse = await fetch('/api/admin/bonuses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'customer',
          recipientId: bonusForm.customerId,
          amount: amount,
          reason: bonusForm.reason,
          milestone: bonusForm.milestone || null,
        }),
      });

      const bonusData = await bonusResponse.json();

      if (bonusData.success) {
        // Create expense entry for customer bonuses (free wash)
        const expenseResponse = await fetch('/api/admin/expenses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            serviceType: 'checkin',
            amount: amount,
            reason: `Free Car Wash Bonus: ${bonusForm.reason}`,
            description: `Free wash bonus awarded to ${bonusForm.customerName} - ${bonusForm.milestone}`,
            expenseDate: new Date().toISOString()
          }),
        });

        const expenseData = await expenseResponse.json();
        if (!expenseData.success) {
          console.warn('Bonus created but expense entry failed:', expenseData.error);
        }

        setShowBonusModal(false);
        setBonusForm({
          customerId: '',
          customerName: '',
          amount: '',
          reason: '',
          milestone: ''
        });
        // Refresh bonuses list to update button state
        fetchBonuses();
        
        setNotification({ 
          type: 'success', 
          message: `Free wash bonus of ₦${amount} created successfully for ${bonusForm.customerName}!` 
        });
        setTimeout(() => setNotification(null), 5000);
      } else {
        setBonusError(bonusData.error || 'Failed to create bonus');
      }
    } catch {
      setBonusError('Failed to create bonus');
    } finally {
      setBonusSubmitting(false);
    }
  };

  const filteredAchievements = achievements.filter(achievement => {
    const matchesType = selectedType === 'all' || achievement.milestone.type === selectedType;
    const matchesSearch = !searchTerm || 
      achievement.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      achievement.customer.phone.includes(searchTerm) ||
      achievement.customer.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      achievement.milestone.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesType && matchesSearch;
  });

  const formatReward = (reward?: CustomerMilestoneAchievement['milestone']['reward']) => {
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-light-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {milestoneId ? 'Analyzing customer data...' : 'Loading milestone achievements...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageBreadCrumb pageTitle="Milestone Achievements" />
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error loading achievements</h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={fetchAchievements}
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

  const pageTitle = milestoneId && currentMilestone 
    ? `Milestone: ${currentMilestone.name}` 
    : "Milestone Achievements";

  return (
    <div className="space-y-6">
      <PageBreadCrumb pageTitle={pageTitle} />

      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
          notification.type === 'success' 
            ? 'bg-green-light-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{notification.message}</span>
            <button 
              onClick={() => setNotification(null)}
              className="ml-2 text-white hover:text-gray-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {viewMode === 'qualifying' ? 'Qualifying Customers' : 'Total Achievements'}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {viewMode === 'qualifying' ? qualifyingCustomers.length : achievements.length}
              </p>
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
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Rewards Claimed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {achievements.filter(a => a.rewardClaimed).length}
              </p>
            </div>
            <div className="p-3 bg-green-light-100 dark:bg-green-light-900/30 rounded-lg">
              <svg className="w-6 h-6 text-green-light-600 dark:text-green-light-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Rewards</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {achievements.filter(a => !a.rewardClaimed).length}
              </p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Unique Customers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {new Set(achievements.map(a => a.customerId)).size}
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

      {/* Milestone Information */}
      {milestoneId && currentMilestone && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Milestone Details</h3>
            <Button
              onClick={() => router.push('/milestones')}
              variant="outline"
              className="text-sm"
            >
              ← Back to Milestones
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Name</p>
              <p className="text-lg text-gray-900 dark:text-white">{currentMilestone.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Type</p>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(currentMilestone.type)}`}>
                {currentMilestone.type}
              </span>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Description</p>
              <p className="text-gray-900 dark:text-white">{currentMilestone.description}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Condition</p>
              <p className="text-gray-900 dark:text-white">
                {currentMilestone.type === 'visits' 
                  ? `${getOperatorText(currentMilestone.condition.operator)} ${currentMilestone.condition.value} visit${currentMilestone.condition.value === 1 ? '' : 's'}`
                  : `${getOperatorText(currentMilestone.condition.operator)} $${currentMilestone.condition.value.toFixed(2)} spent`
                }
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Qualifying Customers</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{qualifyingCustomers.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex gap-2">
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value as 'all' | 'claimed' | 'unclaimed')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-light-500 dark:bg-gray-700 dark:text-white text-sm"
            >
              <option value="all">All Rewards</option>
              <option value="claimed">Claimed</option>
              <option value="unclaimed">Unclaimed</option>
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
          <div className="flex gap-2">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search customers..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-light-500 dark:bg-gray-700 dark:text-white text-sm"
              />
            </div>
            <button
              onClick={handleSearch}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search
            </button>
            {searchTerm && (
              <button
                onClick={handleClearSearch}
                className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear
              </button>
            )}
            <button
              onClick={fetchAchievements}
              className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
        <Button
          onClick={() => router.push('/milestones')}
          variant="outline"
        >
          Manage Milestones
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {viewMode === 'qualifying' ? 'Qualifying Customers' : 'Customer Milestone Achievements'}
          </h2>
        </div>
        <div className="overflow-x-auto">
          {viewMode === 'qualifying' ? (
            qualifyingCustomers.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto h-12 w-12 text-gray-400">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No qualifying customers found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                No customers currently meet the criteria for this milestone.
              </p>
            </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Visits</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Spent</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Achieved Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {qualifyingCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {customer.name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          <div>{customer.email}</div>
                          <div>{customer.phone}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {customer.actualVisits}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        ${customer.actualSpent.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          {currentMilestone?.type === 'visits' ? customer.achievedValue : `$${customer.achievedValue.toFixed(2)}`}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(() => {
                          const bonusStatus = getBonusStatus(customer.id, currentMilestone?.name || '');
                          if (bonusStatus) {
                            return (
                              <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(bonusStatus)}`}>
                                Bonus: {bonusStatus.charAt(0).toUpperCase() + bonusStatus.slice(1)}
                              </span>
                            );
                          }
                          return (
                            <button 
                              onClick={() => handleOpenBonusModal(customer.id, customer.name, currentMilestone?.name || '')}
                              className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors font-medium"
                            >
                              Give Bonus
                            </button>
                          );
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            filteredAchievements.length === 0 ? (
              <div className="p-12 text-center">
                <div className="mx-auto h-12 w-12 text-gray-400">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806 1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No achievements found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                No customers have reached any milestones yet, or your filters are too restrictive.
              </p>
              <div className="mt-6">
                <Button onClick={() => router.push('/milestones')}>
                  Manage Milestones
                </Button>
              </div>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Milestone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Achievement</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reward</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAchievements.map((achievement) => (
                  <tr key={achievement.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {achievement.customer.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {achievement.customer.phone} • {achievement.customer.licensePlate}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          {achievement.customer.totalVisits} visits • ${achievement.customer.totalSpent.toFixed(2)} spent
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {achievement.milestone.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {achievement.milestone.description}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(achievement.milestone.type)}`}>
                        {achievement.milestone.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {achievement.milestone.type === 'visits' ? 
                        `${achievement.achievedValue} visits` : 
                        `$${achievement.achievedValue.toFixed(2)} spent`
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatReward(achievement.milestone.reward)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge color={achievement.rewardClaimed ? "success" : "warning"}>
                        {achievement.rewardClaimed ? "Claimed" : "Pending"}
                      </Badge>
                      {achievement.rewardClaimed && achievement.claimedByName && (
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          by {achievement.claimedByName}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div>{new Date(achievement.achievedAt).toLocaleDateString()}</div>
                      {achievement.claimedAt && (
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          Claimed: {new Date(achievement.claimedAt).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex space-x-2">
                        {(() => {
                          const bonusStatus = getBonusStatus(achievement.customer.id, achievement.milestone.name);
                          if (bonusStatus) {
                            return (
                              <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(bonusStatus)}`}>
                                Bonus: {bonusStatus.charAt(0).toUpperCase() + bonusStatus.slice(1)}
                              </span>
                            );
                          }
                          return (
                            <button 
                              onClick={() => handleOpenBonusModal(achievement.customer.id, achievement.customer.name, achievement.milestone.name)}
                              className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors font-medium"
                            >
                              Give Bonus
                            </button>
                          );
                        })()}
                        {!achievement.rewardClaimed && (
                          <button 
                            onClick={() => handleClaimReward(achievement.id, achievement.customer.name)}
                            className="text-green-light-600 hover:text-green-light-500 dark:text-green-light-400 dark:hover:text-green-light-300 transition-colors"
                          >
                            Claim Reward
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )
          )}
        </div>
      </div>

      {/* Bonus Modal */}
      <Modal
        isOpen={showBonusModal}
        onClose={() => setShowBonusModal(false)}
        className="max-w-md"
      >
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Give Free Wash Bonus
          </h2>

          {/* Customer Info Display */}
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">Customer</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{bonusForm.customerName}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Milestone: {bonusForm.milestone}</p>
          </div>

          {bonusError && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <span className="text-red-800 dark:text-red-200 text-sm">{bonusError}</span>
            </div>
          )}

          <form onSubmit={handleCreateBonus} className="space-y-4">
            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Free Wash Value (₦) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Enter free wash value"
                value={bonusForm.amount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBonusForm({...bonusForm, amount: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Brief reason for free wash"
                value={bonusForm.reason}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBonusForm({...bonusForm, reason: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={bonusSubmitting}
                className="flex-1"
              >
                {bonusSubmitting ? 'Creating...' : 'Give Free Wash'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowBonusModal(false)}
                className="px-6"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};

export default MilestoneAchievementsPage;
