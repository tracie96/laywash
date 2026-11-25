"use client";
import React, { useCallback, useEffect, useState } from 'react';

interface StockMovement {
  id: string;
  itemName: string;
  unit: string;
  type: string;
  isAddition: boolean;
  quantity: number;
  previousBalance: number;
  newBalance: number;
  reason: string;
  adminName: string;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  initial: 'New item',
  stock_in: 'Stock in',
  stock_out: 'Stock out',
  sale: 'Sale',
  bonus: 'Bonus'
};

interface StockMovementsProps {
  // Changes whenever the inventory reloads, so new movements show up straight away
  refreshKey?: number;
}

const StockMovements: React.FC<StockMovementsProps> = ({ refreshKey }) => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [direction, setDirection] = useState<'in' | 'all'>('in');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMovements = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({ direction, limit: '50' });
      const response = await fetch(`/api/admin/inventory/movements?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setMovements(data.movements);
      } else {
        setError(data.error || 'Failed to load stock movements');
      }
    } catch {
      setError('Failed to load stock movements');
    } finally {
      setIsLoading(false);
    }
  }, [direction]);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements, refreshKey]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-6 pr-14 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {direction === 'in' ? 'Recent Stock Additions' : 'Recent Stock Movements'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {direction === 'in'
              ? 'New items and quantities added to stock'
              : 'Every change to stock: additions, removals, sales and bonuses'}
          </p>
        </div>
        <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden text-sm">
          <button
            onClick={() => setDirection('in')}
            className={`px-3 py-1.5 ${direction === 'in' ? 'bg-green-light-600 text-white' : 'text-gray-700 dark:text-gray-300'}`}
          >
            Additions
          </button>
          <button
            onClick={() => setDirection('all')}
            className={`px-3 py-1.5 ${direction === 'all' ? 'bg-green-light-600 text-white' : 'text-gray-700 dark:text-gray-300'}`}
          >
            All movements
          </button>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
        {isLoading ? (
          <p className="p-6 text-sm text-gray-500 dark:text-gray-400">Loading stock movements...</p>
        ) : error ? (
          <p className="p-6 text-sm text-error-600 dark:text-error-400">{error}</p>
        ) : movements.length === 0 ? (
          <p className="p-6 text-sm text-gray-500 dark:text-gray-400">
            No stock {direction === 'in' ? 'additions' : 'movements'} recorded yet.
          </p>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {['Date', 'Item', 'Type', 'Quantity', 'Stock', 'By', 'Reason'].map(heading => (
                  <th key={heading} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {movements.map(movement => {
                const isIncrease = movement.newBalance > movement.previousBalance;
                return (
                  <tr key={movement.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {new Date(movement.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {movement.itemName}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {TYPE_LABELS[movement.type] || movement.type}
                    </td>
                    <td className={`px-6 py-3 text-sm font-semibold whitespace-nowrap ${isIncrease ? 'text-green-600 dark:text-green-400' : 'text-error-600 dark:text-error-400'}`}>
                      {isIncrease ? '+' : '−'}{movement.quantity} {movement.unit}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {movement.previousBalance} → {movement.newBalance}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {movement.adminName}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {movement.reason}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default StockMovements;
