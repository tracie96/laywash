"use client";
import React, { useState, useEffect } from "react";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import { Modal } from "@/components/ui/modal";
import { useModal } from "@/hooks/useModal";

interface ToolAssignment {
  id: string;
  toolName: string;
  workerName: string;
  quantity: number;
  returnedQuantity?: number;
  usedQuantity?: number;
  assignedDate: string;
  returnDate?: string;
  status: "assigned" | "returned" | "overdue" | "partially_returned";
  notes: string;
}

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
}

interface Worker {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  isAvailable: boolean;
}

interface AssignmentForm {
  toolId: string;
  workerId: string;
  assignedDate: string;
  expectedReturnDate: string;
  notes: string;
  quantity: number;
  price: number;
}

interface WasherToolWithWorker {
  id: string;
  washerId: string;
  toolName: string;
  toolType: string;
  quantity: number;
  returnedQuantity?: number;
  usedQuantity?: number;
  assignedDate: string;
  returnedDate?: string;
  isReturned: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  washer?: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
}

interface GroupedAssignment {
  workerName: string;
  assignedDate: string;
  assignments: ToolAssignment[];
  totalTools: number;
  totalQuantity: number;
}

const ToolsAssignmentsPage: React.FC = () => {
  const [assignments, setAssignments] = useState<ToolAssignment[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [returningToolId, setReturningToolId] = useState<string | null>(null);
  const [returnQuantity, setReturnQuantity] = useState<number>(1);
  const [maxReturnQuantity, setMaxReturnQuantity] = useState<number>(1);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  const { isOpen, openModal, closeModal } = useModal();
  const { isOpen: isReturnModalOpen, openModal: openReturnModal, closeModal: closeReturnModal } = useModal();
  
  const [assignmentForm, setAssignmentForm] = useState<AssignmentForm>({
    toolId: '',
    workerId: '',
    assignedDate: new Date().toISOString().split('T')[0],
    expectedReturnDate: '',
    notes: '',
    quantity: 1,
    price:0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch assignments from API
      const assignmentsResponse = await fetch('/api/admin/washer-tools');
      const assignmentsData = await assignmentsResponse.json();
      
      // Fetch tools
      const toolsResponse = await fetch('/api/admin/tools');
      const toolsData = await toolsResponse.json();
      // Fetch workers
      const workersResponse = await fetch('/api/admin/washers');
      const workersData = await workersResponse.json();

      // Transform API data to match our interface
      const transformedAssignments: ToolAssignment[] = assignmentsData.success 
          ? assignmentsData.tools.map((tool: WasherToolWithWorker) => ({
            id: tool.id,
            toolName: tool.toolName,
            workerName: tool.washer?.name || 'Unknown Worker',
            quantity: tool.quantity,
            returnedQuantity: tool.returnedQuantity,
            usedQuantity: tool.usedQuantity,
            assignedDate: new Date(tool.assignedDate).toISOString().split('T')[0],
            returnDate: tool.returnedDate ? new Date(tool.returnedDate).toISOString().split('T')[0] : undefined,
            status: (() => {
              // If explicitly marked as returned in DB, it's returned
              if (tool.isReturned) return "returned";
              
              // Calculate if all items are accounted for (used + returned = total)
              const used = tool.usedQuantity || 0;
              const returned = tool.returnedQuantity || 0;
              const total = tool.quantity;
              
              // If used + returned equals total, it's fully returned
              if (used + returned >= total) return "returned";
              
              // If partially returned, show partially_returned
              if (returned > 0 && returned < total) return "partially_returned";
              
              // If overdue (assigned more than 24 hours ago), show overdue
              if (new Date(tool.assignedDate) < new Date(Date.now() - 24 * 60 * 60 * 1000)) return "overdue";
              
              return "assigned";
            })(),
            notes: tool.notes || 'No notes'
          }))
        : [];

      setAssignments(transformedAssignments);
      setTools(toolsData.success ? toolsData.tools.map((tool: Tool) => ({
        ...tool,
        amount: tool.replacementCost
      })) : []);
      setWorkers(workersData.success ? workersData.washers : []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
      setLoading(false);
    }
  };

  // Group assignments by worker and date
  const groupedAssignments: GroupedAssignment[] = assignments.reduce((groups: GroupedAssignment[], assignment) => {
    const existingGroup = groups.find(g => g.workerName === assignment.workerName && g.assignedDate === assignment.assignedDate);
    
    if (existingGroup) {
      existingGroup.assignments.push(assignment);
      existingGroup.totalTools += 1;
      existingGroup.totalQuantity += assignment.quantity;
    } else {
      groups.push({
        workerName: assignment.workerName,
        assignedDate: assignment.assignedDate,
        assignments: [assignment],
        totalTools: 1,
        totalQuantity: assignment.quantity
      });
    }
    
    return groups;
  }, []);

  // Sort groups by date (newest first) and then by worker name
  const sortedGroups = groupedAssignments.sort((a, b) => {
    const dateComparison = new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime();
    if (dateComparison !== 0) return dateComparison;
    return a.workerName.localeCompare(b.workerName);
  });

  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  const getGroupKey = (workerName: string, assignedDate: string) => `${workerName}-${assignedDate}`;

  console.log({tools});

  const handleReturnTool = async (assignmentId: string) => {
    setReturningToolId(assignmentId);
    
    // Find the assignment to get the current quantity and returned quantity
    const assignment = assignments.find(a => a.id === assignmentId);
    if (assignment) {
      const currentReturned = assignment.returnedQuantity || 0;
      const maxCanReturn = assignment.quantity - currentReturned;
      setMaxReturnQuantity(maxCanReturn);
      setReturnQuantity(1); // Default to 1, but user can change
    }
    
    openReturnModal();
  };

  const confirmReturnTool = async () => {
    if (!returningToolId) return;
    
    if (returnQuantity <= 0 || returnQuantity > maxReturnQuantity) {
      setError(`Please enter a valid quantity between 1 and ${maxReturnQuantity}`);
      return;
    }
    
    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch('/api/admin/washer-tools', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          washerToolId: returningToolId,
          returnedQuantity: returnQuantity,
          isCumulative: true
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to return tool');
      }

      // Refresh the data to show updated status
      await fetchData();
      
      // Show success message
      setSuccessMessage(`Successfully returned ${returnQuantity} item(s)!`);
      setError(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // Close modal and reset
      closeReturnModal();
      setReturningToolId(null);
      setReturnQuantity(1);
      
    } catch (error) {
      console.error('Error returning tool:', error);
      setError(error instanceof Error ? error.message : 'Failed to return tool');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignTool = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!assignmentForm.toolId || !assignmentForm.workerId || !assignmentForm.assignedDate) {
      setError('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const selectedTool = tools.find(t => t.id === assignmentForm.toolId);
      const selectedWorker = workers.find(w => w.id === assignmentForm.workerId);

      if (!selectedTool || !selectedWorker) {
        setError('Invalid tool or worker selection');
        return;
      }

      if (selectedTool.availableQuantity <= 0) {
        setError('This tool is not available for assignment');
        return;
      }

      // Create new assignment using API
      const response = await fetch('/api/admin/washer-tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          toolId: selectedTool.id,
          washerId: assignmentForm.workerId,
          toolName: selectedTool.name,
          toolType: 'equipment',
          quantity: assignmentForm.quantity,
          notes: assignmentForm.notes,
          price:assignmentForm.price
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to assign tool');
      }

      await fetchData();

      setAssignmentForm({
        toolId: '',
        workerId: '',
        assignedDate: new Date().toISOString().split('T')[0],
        expectedReturnDate: '',
        notes: '',
        quantity: 1,
        price:0
      });
      closeModal();

      // Show success message
      setSuccessMessage('Tool assigned successfully!');
      setError(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
      
    } catch (error) {
      console.error('Error assigning tool:', error);
      setError(error instanceof Error ? error.message : 'Failed to assign tool');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "assigned":
        return "bg-blue-light-100 text-blue-light-800 dark:bg-blue-light-900/30 dark:text-blue-light-300";
      case "partially_returned":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "returned":
        return "bg-green-light-100 text-green-light-800 dark:bg-green-light-900/30 dark:text-green-light-300";
      case "overdue":
        return "bg-error-100 text-error-800 dark:bg-error-900/30 dark:text-error-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
    }
  };

  const totalAssignments = assignments.length;
  const activeAssignments = assignments.filter(a => a.status === "assigned").length;
  const overdueAssignments = assignments.filter(a => a.status === "overdue").length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-light-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageBreadCrumb pageTitle="Tool Assignments" />

      {/* Success and Error Messages */}
      {successMessage && (
        <div className="p-4 bg-green-light-100 border border-green-light-300 text-green-light-700 rounded-lg">
          {successMessage}
        </div>
      )}
      
      {error && (
        <div className="p-4 bg-error-100 border border-error-300 text-error-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Assignments</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalAssignments}</p>
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
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Assignments</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeAssignments}</p>
            </div>
            <div className="p-3 bg-blue-light-100 dark:bg-blue-light-900/30 rounded-lg">
              <svg className="w-6 h-6 text-blue-light-600 dark:text-blue-light-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Overdue Assignments</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{overdueAssignments}</p>
            </div>
            <div className="p-3 bg-error-100 dark:bg-error-900/30 rounded-lg">
              <svg className="w-6 h-6 text-error-600 dark:text-error-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex justify-end">
        <button 
          onClick={openModal}
          className="bg-green-light-600 hover:bg-green-light-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
        >
          Assign New Tool
        </button>
      </div>

      {/* Grouped Assignments Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Tool Assignments by Washer & Date</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Washer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tools</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {sortedGroups.map((group) => {
                const groupKey = getGroupKey(group.workerName, group.assignedDate);
                const isExpanded = expandedGroups.has(groupKey);
                
                return (
                  <React.Fragment key={groupKey}>
                    {/* Group Header Row */}
                    <tr className="bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {group.workerName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(group.assignedDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {group.totalTools} tool{group.totalTools !== 1 ? 's' : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {group.totalQuantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <button
                          onClick={() => toggleGroup(groupKey)}
                          className="flex items-center space-x-1 text-blue-light-600 hover:text-blue-light-700 dark:text-blue-light-400 dark:hover:text-blue-light-300"
                        >
                          <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
                          <svg
                            className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                    
                    {/* Expanded Details */}
                    {isExpanded && (
                      <>
                        {/* Sub-header for individual tools */}
                        <tr className="bg-gray-25 dark:bg-gray-850/50">
                          <td colSpan={5} className="px-6 py-2">
                            <div className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                              Individual Tools
                            </div>
                          </td>
                        </tr>
                        
                        {/* Individual tool rows */}
                        {group.assignments.map((assignment) => (
                          <tr key={assignment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-l-4 border-l-blue-light-200 dark:border-l-blue-light-700">
                            <td className="px-6 py-3 pl-12 text-sm text-gray-500 dark:text-gray-400">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-blue-light-400 rounded-full"></div>
                                <span>{assignment.toolName}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">
                              <div>
                                <div>Total: {assignment.quantity}</div>
                                {assignment.usedQuantity && assignment.usedQuantity > 0 && (
                                  <div className="text-blue-600 dark:text-blue-400">
                                    Used: {assignment.usedQuantity}
                                  </div>
                                )}
                                {assignment.returnedQuantity && assignment.returnedQuantity > 0 && (
                                  <div className="text-green-600 dark:text-green-400">
                                    Returned: {assignment.returnedQuantity}
                                  </div>
                                )}
                                {(() => {
                                  const used = assignment.usedQuantity || 0;
                                  const returned = assignment.returnedQuantity || 0;
                                  const remaining = assignment.quantity - used - returned;
                                  return remaining > 0 && (
                                    <div className="text-orange-600 dark:text-orange-400">
                                      Remaining: {remaining}
                                    </div>
                                  );
                                })()}
                              </div>
                            </td>
                            <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">
                              {assignment.returnDate ? new Date(assignment.returnDate).toLocaleDateString() : "-"}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(assignment.status)}`}>
                                {assignment.status}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">
                              <div className="flex space-x-2">
                                {assignment.status !== "returned" && (
                                  <button 
                                    onClick={() => handleReturnTool(assignment.id)}
                                    disabled={submitting}
                                    className="text-green-light-600 hover:text-green-light-500 dark:text-green-light-400 dark:hover:text-green-light-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {assignment.status === "partially_returned" ? "Return More" : "Return"}
                                  </button>
                                )}
                                {assignment.status === "returned" && (
                                  <span className="text-gray-400 dark:text-gray-500">Fully Returned</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-md">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Assign New Tool</h3>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-error-100 border border-error-300 text-error-700 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleAssignTool} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tool *
              </label>
              <select
                value={assignmentForm.toolId}
                onChange={(e) => setAssignmentForm({...assignmentForm, toolId: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select a tool</option>
                {tools
                  .filter(tool => tool.isActive )
                  .map(tool => (
                    <option key={tool.id} value={tool.id}>
                      {tool.name} ({tool.availableQuantity} available)
                    </option>
                  ))
                }
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Worker *
              </label>
              <select
                value={assignmentForm.workerId}
                onChange={(e) => setAssignmentForm({...assignmentForm, workerId: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select a worker</option>
                {workers
                  .map(worker => (
                    <option key={worker.id} value={worker.id}>
                      {worker.name} ({worker.email})
                    </option>
                  ))
                }
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Assignment Date *
              </label>
              <input
                type="date"
                value={assignmentForm.assignedDate}
                onChange={(e) => setAssignmentForm({...assignmentForm, assignedDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Expected Return Date
              </label>
              <input
                type="date"
                value={assignmentForm.expectedReturnDate}
                onChange={(e) => setAssignmentForm({...assignmentForm, expectedReturnDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quantity
              </label>
              <input
                type="number"
                value={assignmentForm.quantity || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  const quantity = value === '' ? 1 : parseInt(value) || 1;
                  setAssignmentForm({...assignmentForm, quantity});
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                value={assignmentForm.notes}
                onChange={(e) => setAssignmentForm({...assignmentForm, notes: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Any additional notes about this assignment..."
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-green-light-600 hover:bg-green-light-700 text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Assigning...' : 'Assign Tool'}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Return Confirmation Modal */}
      <Modal isOpen={isReturnModalOpen} onClose={closeReturnModal} className="max-w-md">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Return Tool</h3>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Quantity to Return
            </label>
            <input
              type="number"
              min="1"
              max={maxReturnQuantity}
              value={returnQuantity}
              onChange={(e) => setReturnQuantity(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Enter quantity"
            />
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Maximum: {maxReturnQuantity} item(s)
            </div>
          </div>

          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Are you sure you want to return {returnQuantity} item(s)? This action cannot be undone.
          </p>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={closeReturnModal}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              onClick={confirmReturnTool}
              disabled={submitting || returnQuantity <= 0 || returnQuantity > maxReturnQuantity}
              className="px-4 py-2 bg-green-light-600 hover:bg-green-light-700 text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Returning...' : 'Confirm Return'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ToolsAssignmentsPage; 