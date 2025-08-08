"use client";
import React, { useState, useEffect } from "react";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import Button from '@/components/ui/button/Button';

interface Tool {
  id: string;
  name: string;
  description: string;
  category: string;
  isReturnable: boolean;
  replacementCost: number;
  totalQuantity: number;
  availableQuantity: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreateToolForm {
  name: string;
  description: string;
  category: string;
  isReturnable: boolean;
  replacementCost: number;
  totalQuantity: number;
  availableQuantity: number;
}

const ToolsManagementPage: React.FC = () => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'Equipment' | 'Tools' | 'Supplies'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'low_availability' | 'out_of_stock'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'category' | 'replacementCost' | 'availableQuantity' | 'totalQuantity' | 'createdAt'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateToolForm>({
    name: '',
    description: '',
    category: 'Equipment',
    isReturnable: true,
    replacementCost: 0,
    totalQuantity: 1,
    availableQuantity: 1
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTools();
  }, [searchTerm, filterCategory, filterStatus, sortBy, sortOrder]);

  const fetchTools = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterCategory !== 'all') params.append('category', filterCategory);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      
      const response = await fetch(`/api/admin/tools?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setTools(data.tools);
      } else {
        setError(data.error || 'Failed to fetch tools');
      }
    } catch {
      console.error('Error fetching tools');
      setError('Failed to fetch tools from server');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTool = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createForm.name || !createForm.description || !createForm.category) {
      setError('Please fill in all required fields');
      return;
    }

    if (createForm.replacementCost < 0 || createForm.totalQuantity < 0 || createForm.availableQuantity < 0) {
      setError('Please enter valid numeric values');
      return;
    }

    if (createForm.availableQuantity > createForm.totalQuantity) {
      setError('Available quantity cannot exceed total quantity');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createForm),
      });

      const data = await response.json();

      if (data.success) {
        setShowCreateModal(false);
        setCreateForm({
          name: '',
          description: '',
          category: 'Equipment',
          isReturnable: true,
          replacementCost: 0,
          totalQuantity: 1,
          availableQuantity: 1
        });
        fetchTools(); // Refresh the list
      } else {
        setError(data.error || 'Failed to create tool');
      }
    } catch {
      setError('Failed to create tool');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToolAction = async (toolId: string, action: 'toggle' | 'delete' | 'update') => {
    try {
      if (action === 'delete') {
        const response = await fetch(`/api/admin/tools/${toolId}`, {
          method: 'DELETE',
        });
        const data = await response.json();
        
        if (data.success) {
          fetchTools(); // Refresh the list
        } else {
          setError(data.error || 'Failed to delete tool');
        }
      } else if (action === 'toggle') {
        // Find the current tool to toggle its status
        const currentTool = tools.find(t => t.id === toolId);
        if (!currentTool) return;

        const response = await fetch(`/api/admin/tools/${toolId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            isActive: !currentTool.isActive
          }),
        });

        const data = await response.json();

        if (data.success) {
          fetchTools(); // Refresh the list
        } else {
          setError(data.error || 'Failed to update tool');
        }
      } else if (action === 'update') {
        // Quick update for available quantity
        const currentTool = tools.find(t => t.id === toolId);
        if (!currentTool) return;

        const newQuantity = prompt(`Enter new available quantity for ${currentTool.name} (max: ${currentTool.totalQuantity}):`, currentTool.availableQuantity.toString());
        if (newQuantity !== null) {
          const quantity = parseInt(newQuantity);
          if (!isNaN(quantity) && quantity >= 0 && quantity <= currentTool.totalQuantity) {
            const response = await fetch(`/api/admin/tools/${toolId}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                availableQuantity: quantity
              }),
            });

            const data = await response.json();

            if (data.success) {
              fetchTools(); // Refresh the list
            } else {
              setError(data.error || 'Failed to update tool');
            }
          } else {
            setError('Please enter a valid quantity');
          }
        }
      }
    } catch {
      setError('Failed to perform action');
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive 
      ? "bg-green-light-100 text-green-light-800 dark:bg-green-light-900/30 dark:text-green-light-300"
      : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Equipment":
        return "bg-blue-light-100 text-blue-light-800 dark:bg-blue-light-900/30 dark:text-blue-light-300";
      case "Tools":
        return "bg-green-light-100 text-green-light-800 dark:bg-green-light-900/30 dark:text-green-light-300";
      case "Supplies":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
    }
  };

  const getAvailabilityColor = (available: number, total: number) => {
    const percentage = (available / total) * 100;
    if (percentage >= 70) return "text-green-600 dark:text-green-400";
    if (percentage >= 30) return "text-orange-600 dark:text-orange-400";
    return "text-error-600 dark:text-error-400";
  };

  const getAvailabilityStatus = (available: number, total: number) => {
    if (available === 0) return 'out_of_stock';
    if ((available / total) < 0.3) return 'low_availability';
    return 'good';
  };

  const totalTools = tools.length;
  const activeTools = tools.filter(t => t.isActive).length;
  const totalValue = tools.reduce((sum, tool) => sum + (tool.replacementCost * tool.totalQuantity), 0);
  const lowAvailabilityTools = tools.filter(t => getAvailabilityStatus(t.availableQuantity, t.totalQuantity) === 'low_availability').length;
  const outOfStockTools = tools.filter(t => getAvailabilityStatus(t.availableQuantity, t.totalQuantity) === 'out_of_stock').length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-light-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading tools...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageBreadCrumb pageTitle="Tool Management" />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Tools</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalTools}</p>
            </div>
            <div className="p-3 bg-blue-light-100 dark:bg-blue-light-900/30 rounded-lg">
              <svg className="w-6 h-6 text-blue-light-600 dark:text-blue-light-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Tools</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeTools}</p>
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
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Value</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">${totalValue.toFixed(2)}</p>
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
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Low Stock</p>
              <p className="text-2xl font-bold text-orange-600">{lowAvailabilityTools + outOfStockTools}</p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by name, description, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Category Filter */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filterCategory === 'all'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              All Categories
            </button>
            <button
              onClick={() => setFilterCategory('Equipment')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filterCategory === 'Equipment'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Equipment
            </button>
            <button
              onClick={() => setFilterCategory('Tools')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filterCategory === 'Tools'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Tools
            </button>
            <button
              onClick={() => setFilterCategory('Supplies')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filterCategory === 'Supplies'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Supplies
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filterStatus === 'all'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              All Status
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filterStatus === 'active'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilterStatus('low_availability')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filterStatus === 'low_availability'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Low Stock
            </button>
            <button
              onClick={() => setFilterStatus('out_of_stock')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filterStatus === 'out_of_stock'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Out of Stock
            </button>
          </div>

          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-green-light-600 hover:bg-green-light-700"
          >
            Add New Tool
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-red-800 dark:text-red-200">{error}</span>
          </div>
        </div>
      )}

      {/* Tools Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Tool Management</h2>
        </div>
        <div className="overflow-x-auto">
          {tools.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 dark:text-gray-500 text-4xl mb-4">🔧</div>
              <p className="text-gray-600 dark:text-gray-400">No tools found</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                {searchTerm || filterCategory !== 'all' || filterStatus !== 'all'
                  ? 'Try adjusting your search or filters to see more results.'
                  : 'Add your first tool to get started.'
                }
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <button
                      onClick={() => {
                        setSortBy('name');
                        setSortOrder(sortBy === 'name' && sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      <span>Tool Name</span>
                      {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <button
                      onClick={() => {
                        setSortBy('category');
                        setSortOrder(sortBy === 'category' && sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      <span>Category</span>
                      {sortBy === 'category' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <button
                      onClick={() => {
                        setSortBy('replacementCost');
                        setSortOrder(sortBy === 'replacementCost' && sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      <span>Replacement Cost</span>
                      {sortBy === 'replacementCost' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <button
                      onClick={() => {
                        setSortBy('availableQuantity');
                        setSortOrder(sortBy === 'availableQuantity' && sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      <span>Availability</span>
                      {sortBy === 'availableQuantity' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Returnable</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {tools.map((tool) => (
                  <tr key={tool.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {tool.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                      {tool.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(tool.category)}`}>
                        {tool.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      ${tool.replacementCost.toFixed(2)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getAvailabilityColor(tool.availableQuantity, tool.totalQuantity)}`}>
                      {tool.availableQuantity}/{tool.totalQuantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {tool.isReturnable ? "Yes" : "No"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(tool.isActive)}`}>
                        {tool.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToolAction(tool.id, 'update')}
                        >
                          Update
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToolAction(tool.id, 'toggle')}
                        >
                          {tool.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToolAction(tool.id, 'delete')}
                          className="text-error-600 hover:text-error-500 dark:text-error-400 dark:hover:text-error-300"
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Tool Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add New Tool</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateTool} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tool Name
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter tool name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({...createForm, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter tool description"
                  rows={3}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={createForm.category}
                  onChange={(e) => setCreateForm({...createForm, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="Equipment">Equipment</option>
                  <option value="Tools">Tools</option>
                  <option value="Supplies">Supplies</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Replacement Cost ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={createForm.replacementCost}
                    onChange={(e) => setCreateForm({...createForm, replacementCost: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Total Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={createForm.totalQuantity}
                    onChange={(e) => setCreateForm({...createForm, totalQuantity: parseInt(e.target.value) || 1})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="1"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Available Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  max={createForm.totalQuantity}
                  value={createForm.availableQuantity}
                  onChange={(e) => setCreateForm({...createForm, availableQuantity: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                  required
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isReturnable"
                  checked={createForm.isReturnable}
                  onChange={(e) => setCreateForm({...createForm, isReturnable: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isReturnable" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Returnable
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-green-light-600 text-white rounded-lg hover:bg-green-light-700 disabled:bg-green-light-400 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Creating...' : 'Create Tool'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolsManagementPage; 