"use client";
import React, { useState, useRef, useEffect } from 'react';
import Button from '@/components/ui/button/Button';
import { Modal } from '@/components/ui/modal';

interface PasscodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (passcode: string) => void;
  isLoading?: boolean;
  error?: string;
}

const PasscodeModal: React.FC<PasscodeModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  error
}) => {
  const [passcode, setPasscode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPasscode('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode.trim()) {
      onConfirm(passcode.trim());
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md mx-4">
      <div className="p-6">
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Enter Check-in Passcode
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Please enter the passcode that was set when this check-in was created to mark it as complete.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            This passcode is required for delayed wash customers as a security measure.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <input
              ref={inputRef}
              type="text"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter passcode"
              className="w-full px-4 py-3 text-lg font-semibold border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none text-center"
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 dark:bg-gray-600 dark:hover:bg-gray-700 dark:text-gray-200"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-green-600 hover:bg-green-700"
              disabled={isLoading || !passcode.trim()}
            >
              {isLoading ? 'Verifying...' : 'Confirm'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default PasscodeModal;
