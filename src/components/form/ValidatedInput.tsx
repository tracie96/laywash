"use client";
import React, { useState } from 'react';

interface ValidatedInputProps {
  type: 'email' | 'text';
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  validationType: 'email' | 'licensePlate';
  vehicleIndex?: number;
}

const ValidatedInput: React.FC<ValidatedInputProps> = ({
  type,
  name,
  value,
  onChange,
  onBlur,
  placeholder,
  required = false,
  className = '',
  validationType,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const validateValue = async (inputValue: string) => {
    if (!inputValue || !inputValue.trim()) {
      setError(null);
      return;
    }

    setIsValidating(true);
    try {
      let response;
      if (validationType === 'email') {
        response = await fetch(`/api/admin/customers/validate-email?email=${encodeURIComponent(inputValue.trim())}`);
      } else {
        response = await fetch(`/api/admin/vehicles/validate-license-plate?licensePlate=${encodeURIComponent(inputValue.trim())}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        if (data.isUnique) {
          setError(null);
        } else {
          if (validationType === 'email') {
            setError('This email address is already registered to another customer');
          } else {
            setError('This license plate is already registered to another vehicle');
          }
        }
      } else {
        setError(data.error || 'Error checking availability');
      }
    } catch (error) {
      console.error('Validation error:', error);
      setError('Error checking availability');
    } finally {
      setIsValidating(false);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    validateValue(e.target.value);
    if (onBlur) {
      onBlur(e);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null); // Clear error when user starts typing
    onChange(e);
  };

  return (
    <div>
      <input
        type={type}
        name={name}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        required={required}
        className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-light-500 focus:border-transparent ${
          error 
            ? 'border-red-300 dark:border-red-600' 
            : 'border-gray-300 dark:border-gray-600'
        } ${className}`}
        placeholder={placeholder}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {isValidating && (
        <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">Checking availability...</p>
      )}
    </div>
  );
};

export default ValidatedInput;
