import { useState, useCallback } from 'react';

export const useEmailValidation = () => {
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const validateEmail = useCallback(async (email: string) => {
    if (!email || !email.trim()) {
      setEmailError(null);
      return true;
    }

    setIsValidating(true);
    try {
      const response = await fetch(`/api/admin/customers/validate-email?email=${encodeURIComponent(email.trim())}`);
      const data = await response.json();
      
      if (data.success) {
        if (data.isUnique) {
          setEmailError(null);
          return true;
        } else {
          setEmailError('This email address is already registered to another customer');
          return false;
        }
      } else {
        setEmailError(data.error || 'Error checking email availability');
        return false;
      }
    } catch (error) {
      console.error('Error validating email:', error);
      setEmailError('Error checking email availability');
      return false;
    } finally {
      setIsValidating(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setEmailError(null);
  }, []);

  return {
    emailError,
    isValidating,
    validateEmail,
    clearError,
    clearEmailError: clearError
  };
};

export const useLicensePlateValidation = () => {
  const [licensePlateErrors, setLicensePlateErrors] = useState<Record<number, string | null>>({});
  const [isValidating, setIsValidating] = useState<Record<number, boolean>>({});

  const validateLicensePlate = useCallback(async (licensePlate: string, vehicleIndex: number) => {
    if (!licensePlate || !licensePlate.trim()) {
      setLicensePlateErrors(prev => ({ ...prev, [vehicleIndex]: null }));
      return true;
    }

    setIsValidating(prev => ({ ...prev, [vehicleIndex]: true }));
    try {
      const response = await fetch(`/api/admin/vehicles/validate-license-plate?licensePlate=${encodeURIComponent(licensePlate.trim())}`);
      const data = await response.json();
      
      if (data.success) {
        if (data.isUnique) {
          setLicensePlateErrors(prev => ({ ...prev, [vehicleIndex]: null }));
          return true;
        } else {
          setLicensePlateErrors(prev => ({ 
            ...prev, 
            [vehicleIndex]: 'This license plate is already registered to another vehicle' 
          }));
          return false;
        }
      } else {
        setLicensePlateErrors(prev => ({ 
          ...prev, 
          [vehicleIndex]: data.error || 'Error checking license plate availability' 
        }));
        return false;
      }
    } catch (error) {
      console.error('Error validating license plate:', error);
      setLicensePlateErrors(prev => ({ 
        ...prev, 
        [vehicleIndex]: 'Error checking license plate availability' 
      }));
      return false;
    } finally {
      setIsValidating(prev => ({ ...prev, [vehicleIndex]: false }));
    }
  }, []);

  const clearError = useCallback((vehicleIndex: number) => {
    setLicensePlateErrors(prev => ({ ...prev, [vehicleIndex]: null }));
  }, []);

  return {
    licensePlateErrors,
    isValidating,
    validateLicensePlate,
    clearError,
    clearLicensePlateError: clearError
  };
};
