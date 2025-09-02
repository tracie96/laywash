export interface Location {
  id: string;
  address: string;
  lga: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateLocationData {
  address: string;
  lga: string;
  is_active?: boolean;
}

export interface UpdateLocationData {
  address?: string;
  lga?: string;
  is_active?: boolean;
}

export interface LocationFilters {
  lga?: string;
  is_active?: boolean;
  search?: string;
}

export interface LocationStats {
  total_locations: number;
  active_locations: number;
  inactive_locations: number;
  locations_by_lga: { lga: string; count: number }[];
}

