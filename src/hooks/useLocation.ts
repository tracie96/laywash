"use client";
import { useState, useEffect } from 'react';
import { Location } from '../types/location';

export const useLocation = (locationId?: string) => {
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!locationId) {
      setLocation(null);
      return;
    }

    const fetchLocation = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/admin/locations/${locationId}`);
        const result = await response.json();
        
        if (result.success) {
          setLocation(result.data);
        } else {
          setError(result.error || 'Failed to fetch location');
        }
      } catch (err) {
        setError('Failed to fetch location');
        console.error('Error fetching location:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLocation();
  }, [locationId]);

  return { location, loading, error };
};

