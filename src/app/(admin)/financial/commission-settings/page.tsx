"use client";
import React, { useState, useEffect } from "react";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import { useAuth } from "@/context/AuthContext";

interface CommissionSettings {
  adminPercentage: number;
  washerPercentage: number;
  isActive: boolean;
}

const CommissionSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<CommissionSettings>({
    adminPercentage: 60,
    washerPercentage: 40,
    isActive: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const { hasRole } = useAuth();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/commission-settings');
      const data = await response.json();
      
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!hasRole('super_admin')) {
      setError('Only Super Admins can modify commission settings');
      return;
    }

    if (settings.adminPercentage + settings.washerPercentage !== 100) {
      setError('Percentages must equal 100%');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/commission-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess('Commission settings updated successfully!');
        setSettings(data.settings);
      } else {
        setError(data.error || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      setError('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-light-600"></div>
      </div>
    );
  }

  if (!hasRole('super_admin')) {
    return (
      <div className="space-y-6">
        <PageBreadCrumb pageTitle="Commission Settings" />
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <p className="text-red-800 dark:text-red-200">
            Access denied. Only Super Admins can view commission settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageBreadCrumb pageTitle="Commission Settings" />
      
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Payment Split Configuration
        </h2>
        
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-green-800 dark:text-green-200">{success}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Admin Commission Percentage
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={settings.adminPercentage}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                adminPercentage: parseInt(e.target.value) || 0,
                washerPercentage: 100 - (parseInt(e.target.value) || 0)
              }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Washer Commission Percentage
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={settings.washerPercentage}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                washerPercentage: parseInt(e.target.value) || 0,
                adminPercentage: 100 - (parseInt(e.target.value) || 0)
              }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div className="mt-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.isActive}
              onChange={(e) => setSettings(prev => ({ ...prev, isActive: e.target.checked }))}
              className="rounded border-gray-300 text-green-light-600 focus:ring-green-light-500"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Enable commission-based payments
            </span>
          </label>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-green-light-600 text-white rounded-lg hover:bg-green-light-700 disabled:bg-green-light-400 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommissionSettingsPage;
