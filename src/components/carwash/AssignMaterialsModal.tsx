import React, { useState, useEffect, useCallback } from 'react';
import Button from '@/components/ui/button/Button';
import { Modal } from '@/components/ui/modal';
import { useAuth } from '../../context/AuthContext';

interface WasherMaterial {
  id: string;
  toolName: string;
  toolType: string;
  quantity: number;
  assignedDate: string;
}

interface CheckInMaterial {
  id: string;
  checkInId: string;
  washerId: string;
  materialId: string;
  materialName: string;
  quantityUsed: number;
  usageDate: string;
}

interface AssignMaterialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkInId: string;
  onMaterialsAssigned: () => void;
}

const AssignMaterialsModal: React.FC<AssignMaterialsModalProps> = ({
  isOpen,
  onClose,
  checkInId,
  onMaterialsAssigned
}) => {
  const { user } = useAuth();
  const [washerMaterials, setWasherMaterials] = useState<WasherMaterial[]>([]);
  const [checkInMaterials, setCheckInMaterials] = useState<CheckInMaterial[]>([]);
  const [loading, setLoading] = useState(false);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMaterials, setSelectedMaterials] = useState<Array<{
    materialId: string;
    materialName: string;
    quantityUsed: number;
  }>>([]);

  const fetchWasherMaterials = useCallback(async () => {
    try {
      setMaterialsLoading(true);
      const response = await fetch(`/api/admin/washer-materials?washerId=${user?.id}&isReturned=false`);
      const result = await response.json();
      
      if (result.success) {
        setWasherMaterials(result.tools);
      } else {
        setError(result.error || 'Failed to fetch materials');
      }
    } catch (err) {
      console.error('Error fetching washer materials:', err);
      setError('Failed to fetch materials');
    } finally {
      setMaterialsLoading(false);
    }
  }, [user?.id]);

  const fetchCheckInMaterials = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/check-ins/assign-materials?checkInId=${checkInId}&washerId=${user?.id}`);
      const result = await response.json();
      
      if (result.success) {
        setCheckInMaterials(result.materials);
      }
    } catch (err) {
      console.error('Error fetching check-in materials:', err);
    }
  }, [checkInId, user?.id]);

  // Fetch washer's available materials
  useEffect(() => {
    if (isOpen && user?.id) {
      fetchWasherMaterials();
      fetchCheckInMaterials();
    }
  }, [isOpen, user?.id, fetchWasherMaterials, fetchCheckInMaterials]);

  const handleMaterialToggle = (material: WasherMaterial) => {
    const existingIndex = selectedMaterials.findIndex(m => m.materialId === material.id);
    
    if (existingIndex >= 0) {
      // Remove material
      setSelectedMaterials(prev => prev.filter((_, index) => index !== existingIndex));
    } else {
      // Add material with default quantity 1
      setSelectedMaterials(prev => [...prev, {
        materialId: material.id,
        materialName: material.toolName,
        quantityUsed: 1
      }]);
    }
  };

  const handleQuantityChange = (materialId: string, quantity: number) => {
    setSelectedMaterials(prev => prev.map(m => 
      m.materialId === materialId 
        ? { ...m, quantityUsed: Math.max(1, quantity) }
        : m
    ));
  };

  const handleAssignMaterials = async () => {
    if (selectedMaterials.length === 0) {
      setError('Please select at least one material');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/check-ins/assign-materials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          checkInId,
          washerId: user?.id,
          materials: selectedMaterials
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Refresh materials and close modal
        await fetchCheckInMaterials();
        await fetchWasherMaterials();
        onMaterialsAssigned();
        onClose();
        setSelectedMaterials([]);
      } else {
        throw new Error(result.error || 'Failed to assign materials');
      }
    } catch (err) {
      console.error('Error assigning materials:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to assign materials';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const isMaterialSelected = (materialId: string) => {
    return selectedMaterials.some(m => m.materialId === materialId);
  };

  const getSelectedMaterialQuantity = (materialId: string) => {
    const selected = selectedMaterials.find(m => m.materialId === materialId);
    return selected ? selected.quantityUsed : 0;
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-2xl p-6"
    >
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Assign Materials to Check-in
        </h2>
      </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Current Check-in Materials */}
        {checkInMaterials.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Currently Assigned Materials
            </h3>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 max-h-32 overflow-y-auto">
              {checkInMaterials.map((material) => (
                <div key={material.id} className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600 last:border-b-0">
                  <span className="text-gray-700 dark:text-gray-300">{material.materialName}</span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {material.quantityUsed}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Materials */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Available Materials
          </h3>
          
          {materialsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 dark:text-gray-400 mt-2">Loading materials...</p>
            </div>
          ) : washerMaterials.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No materials assigned to you
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {washerMaterials.map((material) => (
                <div
                  key={material.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    isMaterialSelected(material.id)
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                  onClick={() => handleMaterialToggle(material)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {material.toolName}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Available: {material.quantity}
                      </p>
                    </div>
                    
                    {isMaterialSelected(material.id) && (
                      <div className="flex items-center space-x-2">
                        <label className="text-sm text-gray-600 dark:text-gray-400">
                          Quantity:
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={material.quantity}
                          value={getSelectedMaterialQuantity(material.id)}
                          onChange={(e) => handleQuantityChange(material.id, parseInt(e.target.value) || 1)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />

                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <Button
            onClick={onClose}
            variant="outline"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssignMaterials}
            disabled={loading || selectedMaterials.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Assigning...' : 'Assign Materials'}
          </Button>
        </div>
      </Modal>
    );
  };

export default AssignMaterialsModal;
