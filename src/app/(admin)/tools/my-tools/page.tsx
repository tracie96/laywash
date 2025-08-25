"use client";
import React, { useState, useEffect, useCallback } from 'react';
import PageBreadCrumb from '@/components/common/PageBreadCrumb';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/button/Button';
import Badge from '@/components/ui/badge/Badge';

interface WorkerTool {
  id: string;
  toolName: string;
  toolType: string;
  quantity: number;
  unit?: string;
  isReturned: boolean;
  assignedDate: string;
  returnedDate?: string;
  notes?: string;
  washerId: string;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

const MyToolsPage: React.FC = () => {
  const { user } = useAuth();
  const [tools, setTools] = useState<WorkerTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'assigned' | 'returned'>('all');

  const fetchMyTools = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/admin/washer-materials?washerId=${user?.id}`);
      const result = await response.json();
      
      if (result.success) {
        // Transform the data to include additional fields
        const transformedTools = result.tools.map((tool: WorkerTool) => ({
          ...tool,
          assignedDate: tool.assignedDate || tool.createdAt,
          unit: tool.unit || 'piece' // Default unit if not provided
        }));
        setTools(transformedTools);
      } else {
        setError(result.error || 'Failed to fetch tools');
      }
    } catch (err) {
      console.error('Error fetching tools:', err);
      setError('Failed to fetch tools from server');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchMyTools();
    }
  }, [user?.id, fetchMyTools]);

  const getStatusColor = (isReturned: boolean) => {
    return isReturned ? 'success' : 'info';
  };

  const filteredTools = tools.filter(tool => {
    if (filterStatus === 'assigned') return !tool.isReturned;
    if (filterStatus === 'returned') return tool.isReturned;
    return true;
  });

  const assignedToolsCount = tools.filter(t => !t.isReturned).length;
  const returnedToolsCount = tools.filter(t => t.isReturned).length;
  const totalToolsValue = tools.reduce((sum, tool) => sum + (tool.amount || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading your tools...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageBreadCrumb pageTitle="My Tools" />
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          My Tools & Materials
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          View and manage tools assigned to you for car wash services
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Tools</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{tools.length}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Currently Assigned</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{assignedToolsCount}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Value</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">${totalToolsValue.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Filter Tools</h2>
          <div className="flex space-x-2">
            <Button
              onClick={() => setFilterStatus('all')}
              size="sm"
            >
              All ({tools.length})
            </Button>
            <Button
              onClick={() => setFilterStatus('assigned')}
              size="sm"
            >
              Assigned ({assignedToolsCount})
            </Button>
            <Button
              onClick={() => setFilterStatus('returned')}
              size="sm"
            >
              Returned ({returnedToolsCount})
            </Button>
          </div>
        </div>
      </div>

      {/* Tools Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">My Tools Inventory</h2>
        </div>
        
        {filteredTools.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 dark:text-gray-500 text-4xl mb-4">🛠️</div>
            <p className="text-gray-600 dark:text-gray-400">No tools found</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              {filterStatus === 'all' 
                ? 'You haven\'t been assigned any tools yet.'
                : `No tools with status "${filterStatus}" found.`
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tool</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Assigned Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredTools.map((tool) => (
                  <tr key={tool.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {tool.toolName}
                      </div>
                      {tool.notes && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {tool.notes}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {tool.toolType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {tool.quantity} {tool.unit || 'piece'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge color={getStatusColor(tool.isReturned)}>
                        {tool.isReturned ? 'Returned' : 'Assigned'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(tool.assignedDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      ${tool.amount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {!tool.isReturned && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // TODO: Implement tool return functionality
                              console.log('Return tool:', tool.id);
                            }}
                          >
                            Return Tool
                          </Button>
                        )}
                        {tool.isReturned && (
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            Returned on {tool.returnedDate ? new Date(tool.returnedDate).toLocaleDateString() : 'N/A'}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Refresh Button */}
      <div className="mt-6 flex justify-center">
        <Button
          onClick={fetchMyTools}
          disabled={loading}
          variant="outline"
        >
          {loading ? 'Refreshing...' : 'Refresh Tools'}
        </Button>
      </div>
    </div>
  );
};

export default MyToolsPage;
