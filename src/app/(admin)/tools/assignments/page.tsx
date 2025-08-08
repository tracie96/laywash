"use client";
import React, { useState, useEffect } from "react";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import { Modal } from "@/components/ui/modal";
import { useModal } from "@/hooks/useModal";

interface ToolAssignment {
  id: string;
  toolName: string;
  workerName: string;
  assignedDate: string;
  returnDate?: string;
  status: "assigned" | "returned" | "overdue";
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
}

const ToolsAssignmentsPage: React.FC = () => {
  const [assignments, setAssignments] = useState<ToolAssignment[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { isOpen, openModal, closeModal } = useModal();
  
  const [assignmentForm, setAssignmentForm] = useState<AssignmentForm>({
    toolId: '',
    workerId: '',
    assignedDate: new Date().toISOString().split('T')[0],
    expectedReturnDate: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch assignments (mock data for now)
      const mockAssignments: ToolAssignment[] = [
        {
          id: "1",
          toolName: "Pressure Washer",
          workerName: "John Smith",
          assignedDate: "2024-01-15",
          status: "assigned",
          notes: "Assigned for morning shift"
        },
        {
          id: "2",
          toolName: "Vacuum Cleaner",
          workerName: "Sarah Johnson",
          assignedDate: "2024-01-14",
          returnDate: "2024-01-15",
          status: "returned",
          notes: "Returned in good condition"
        },
        {
          id: "3",
          toolName: "Scrub Brushes",
          workerName: "Mike Davis",
          assignedDate: "2024-01-10",
          status: "overdue",
          notes: "Should have been returned yesterday"
        }
      ];

      // Fetch tools
      const toolsResponse = await fetch('/api/admin/tools');
      const toolsData = await toolsResponse.json();
      
      // Fetch workers
      const workersResponse = await fetch('/api/admin/washers');
      const workersData = await workersResponse.json();

      setTimeout(() => {
        setAssignments(mockAssignments);
        setTools(toolsData.success ? toolsData.tools : []);
        setWorkers(workersData.success ? workersData.washers : []);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
      setLoading(false);
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
      // Get tool and worker details
      const selectedTool = tools.find(t => t.id === assignmentForm.toolId);
      const selectedWorker = workers.find(w => w.id === assignmentForm.workerId);

      if (!selectedTool || !selectedWorker) {
        setError('Invalid tool or worker selection');
        return;
      }

      // Check if tool is available
      if (selectedTool.availableQuantity <= 0) {
        setError('This tool is not available for assignment');
        return;
      }

      // Create new assignment (mock for now - would integrate with API)
      const newAssignment: ToolAssignment = {
        id: Date.now().toString(),
        toolName: selectedTool.name,
        workerName: selectedWorker.name,
        assignedDate: assignmentForm.assignedDate,
        status: "assigned",
        notes: assignmentForm.notes
      };

      // Add to assignments list
      setAssignments(prev => [newAssignment, ...prev]);

      // Reset form and close modal
      setAssignmentForm({
        toolId: '',
        workerId: '',
        assignedDate: new Date().toISOString().split('T')[0],
        expectedReturnDate: '',
        notes: ''
      });
      closeModal();

      // Show success message (you could add a toast notification here)
      console.log('Tool assigned successfully!');
      
    } catch (error) {
      console.error('Error assigning tool:', error);
      setError('Failed to assign tool');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "assigned":
        return "bg-blue-light-100 text-blue-light-800 dark:bg-blue-light-900/30 dark:text-blue-light-300";
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

      {/* Assignments Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Tool Assignments</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tool</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Worker</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Assigned Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Return Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Notes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {assignments.map((assignment) => (
                <tr key={assignment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {assignment.toolName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {assignment.workerName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(assignment.assignedDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {assignment.returnDate ? new Date(assignment.returnDate).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(assignment.status)}`}>
                      {assignment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                    {assignment.notes}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex space-x-2">
                      <button className="text-blue-light-600 hover:text-blue-light-500 dark:text-blue-light-400 dark:hover:text-blue-light-300">
                        Edit
                      </button>
                      <button className="text-green-light-600 hover:text-green-light-500 dark:text-green-light-400 dark:hover:text-green-light-300">
                        Return
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assignment Modal */}
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
                  .filter(tool => tool.isActive && tool.availableQuantity > 0)
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
                  .filter(worker => worker.status === 'active' && worker.isAvailable)
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
    </div>
  );
};

export default ToolsAssignmentsPage; 