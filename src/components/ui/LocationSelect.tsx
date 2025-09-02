"use client";
import React, { useState, useEffect } from 'react';
import { Location } from '../../types/location';

interface LocationSelectProps {
  value?: string;
  onChange: (locationId: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

export const LocationSelect: React.FC<LocationSelectProps> = ({
  value,
  onChange,
  placeholder = "Select a location",
  className = "",
  disabled = false,
  required = false
}) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/locations?is_active=true');
      const result = await response.json();
      
      if (result.success) {
        setLocations(result.data);
      } else {
        setError('Failed to fetch locations');
      }
    } catch (err) {
      setError('Failed to fetch locations');
      console.error('Error fetching locations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  if (loading) {
    return (
      <select 
        className={`w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500 ${className}`}
        disabled
      >
        <option>Loading locations...</option>
      </select>
    );
  }

  if (error) {
    return (
      <select 
        className={`w-full px-3 py-2 border border-red-300 rounded-md bg-red-50 text-red-600 ${className}`}
        disabled
      >
        <option>Error loading locations</option>
      </select>
    );
  }

  return (
    <select
      value={value || ""}
      onChange={handleChange}
      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
      disabled={disabled}
      required={required}
    >
      <option value="">{placeholder}</option>
      {locations.map((location) => (
        <option key={location.id} value={location.id}>
          {location.address} - {location.lga}
        </option>
      ))}
    </select>
  );
};

