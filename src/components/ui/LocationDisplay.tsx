"use client";
import React from 'react';
import { useLocation } from '../../hooks/useLocation';

interface LocationDisplayProps {
  locationId?: string;
  className?: string;
  fallback?: string;
}

export const LocationDisplay: React.FC<LocationDisplayProps> = ({
  locationId,
  className = "",
  fallback = "No location assigned"
}) => {
  const { location, loading, error } = useLocation(locationId);

  if (!locationId) {
    return <span className={className}>{fallback}</span>;
  }

  if (loading) {
    return <span className={`${className} text-gray-400`}>Loading...</span>;
  }

  if (error || !location) {
    return <span className={`${className} text-red-500`}>Location not found</span>;
  }

  return (
    <span className={className}>
      {location.address} - {location.lga}
    </span>
  );
};

