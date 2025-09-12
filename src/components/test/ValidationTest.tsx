"use client";
import React, { useState } from 'react';
import { useEmailValidation, useLicensePlateValidation } from '@/hooks/useValidation';

const ValidationTest: React.FC = () => {
  const [email, setEmail] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  
  const { emailError, isValidating: isEmailValidating, validateEmail, clearEmailError } = useEmailValidation();
  const { licensePlateErrors, validateLicensePlate, clearLicensePlateError } = useLicensePlateValidation();

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Validation Test</h2>
      
      {/* Email Validation Test */}
      <div>
        <label className="block text-sm font-medium mb-1">Email Test</label>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            clearEmailError();
          }}
          onBlur={(e) => validateEmail(e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg ${
            emailError ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Enter email to test"
        />
        {emailError && (
          <p className="mt-1 text-sm text-red-600">{emailError}</p>
        )}
        {isEmailValidating && (
          <p className="mt-1 text-sm text-blue-600">Checking email availability...</p>
        )}
      </div>

      {/* License Plate Validation Test */}
      <div>
        <label className="block text-sm font-medium mb-1">License Plate Test</label>
        <input
          type="text"
          value={licensePlate}
          onChange={(e) => {
            setLicensePlate(e.target.value);
            clearLicensePlateError(0);
          }}
          onBlur={(e) => validateLicensePlate(e.target.value, 0)}
          className={`w-full px-3 py-2 border rounded-lg ${
            licensePlateErrors[0] ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Enter license plate to test"
        />
        {licensePlateErrors[0] && (
          <p className="mt-1 text-sm text-red-600">{licensePlateErrors[0]}</p>
        )}
      </div>
    </div>
  );
};

export default ValidationTest;
