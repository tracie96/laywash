import { supabase } from './supabase';
import { Location, CreateLocationData, UpdateLocationData, LocationFilters, LocationStats } from '../types/location';

export class LocationService {
  /**
   * Create a new location
   */
  static async createLocation(data: CreateLocationData): Promise<Location | null> {
    try {
      const { data: location, error } = await supabase
        .from('locations')
        .insert([data])
        .select()
        .single();

      if (error) {
        console.error('Error creating location:', error);
        return null;
      }

      return location;
    } catch (error) {
      console.error('Error creating location:', error);
      return null;
    }
  }

  /**
   * Get all locations with optional filters
   */
  static async getLocations(filters?: LocationFilters): Promise<Location[]> {
    try {
      let query = supabase
        .from('locations')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.lga) {
        query = query.eq('lga', filters.lga);
      }

      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      if (filters?.search) {
        query = query.or(`address.ilike.%${filters.search}%,lga.ilike.%${filters.search}%`);
      }

      const { data: locations, error } = await query;

      if (error) {
        console.error('Error fetching locations:', error);
        return [];
      }

      return locations || [];
    } catch (error) {
      console.error('Error fetching locations:', error);
      return [];
    }
  }

  /**
   * Get a single location by ID
   */
  static async getLocationById(id: string): Promise<Location | null> {
    try {
      const { data: location, error } = await supabase
        .from('locations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching location:', error);
        return null;
      }

      return location;
    } catch (error) {
      console.error('Error fetching location:', error);
      return null;
    }
  }

  /**
   * Update a location
   */
  static async updateLocation(id: string, data: UpdateLocationData): Promise<Location | null> {
    try {
      const { data: location, error } = await supabase
        .from('locations')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating location:', error);
        return null;
      }

      return location;
    } catch (error) {
      console.error('Error updating location:', error);
      return null;
    }
  }

  /**
   * Delete a location (soft delete by setting is_active to false)
   */
  static async deleteLocation(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('locations')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        console.error('Error deleting location:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting location:', error);
      return false;
    }
  }

  /**
   * Get location statistics
   */
  static async getLocationStats(): Promise<LocationStats | null> {
    try {
      const { data: locations, error } = await supabase
        .from('locations')
        .select('lga, is_active');

      if (error) {
        console.error('Error fetching location stats:', error);
        return null;
      }

      const totalLocations = locations?.length || 0;
      const activeLocations = locations?.filter(loc => loc.is_active).length || 0;
      const inactiveLocations = totalLocations - activeLocations;

      // Group by LGA
      const lgaCounts = locations?.reduce((acc, loc) => {
        const lga = loc.lga;
        acc[lga] = (acc[lga] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const locationsByLga = Object.entries(lgaCounts).map(([lga, count]) => ({
        lga,
        count
      }));

      return {
        total_locations: totalLocations,
        active_locations: activeLocations,
        inactive_locations: inactiveLocations,
        locations_by_lga: locationsByLga
      };
    } catch (error) {
      console.error('Error fetching location stats:', error);
      return null;
    }
  }

  /**
   * Get all unique LGAs
   */
  static async getUniqueLGAs(): Promise<string[]> {
    try {
      const { data: locations, error } = await supabase
        .from('locations')
        .select('lga')
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching LGAs:', error);
        return [];
      }

      const uniqueLGAs = [...new Set(locations?.map(loc => loc.lga) || [])];
      return uniqueLGAs.sort();
    } catch (error) {
      console.error('Error fetching LGAs:', error);
      return [];
    }
  }
}

