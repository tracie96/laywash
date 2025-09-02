# Locations Database

This document describes the locations database setup for the car wash management system.

## Database Schema

The `locations` table contains the following fields:

- `id` (UUID): Primary key, auto-generated
- `address` (TEXT): Full address of the location
- `lga` (TEXT): Local Government Area
- `is_active` (BOOLEAN): Whether the location is active (default: true)
- `created_at` (TIMESTAMP): When the location was created
- `updated_at` (TIMESTAMP): When the location was last updated

## Setup Instructions

### 1. Run the Migration

Execute the SQL migration file to create the table:

```sql
-- Run the contents of migrations/001_create_locations_table.sql
-- This will create the table with proper indexes and security policies
```

### 2. Database Features

- **Indexes**: Created on `lga` and `address` fields for better query performance
- **Full-text Search**: Address field supports full-text search using PostgreSQL's `tsvector`
- **Row Level Security (RLS)**: Enabled with policies for authenticated users and admins
- **Auto-updating Timestamps**: `updated_at` field automatically updates on record changes

### 3. Security Policies

- **Read Access**: All authenticated users can read locations
- **Full Access**: Only admins and super admins can create, update, and delete locations

## Usage Examples

### Creating a Location

```typescript
import { LocationService } from '../lib/locationService';

const newLocation = await LocationService.createLocation({
  address: "123 Main Street, Victoria Island",
  lga: "Victoria Island",
  is_active: true
});
```

### Fetching Locations

```typescript
// Get all locations
const allLocations = await LocationService.getLocations();

// Get locations by LGA
const victoriaIslandLocations = await LocationService.getLocations({
  lga: "Victoria Island"
});

// Search locations
const searchResults = await LocationService.getLocations({
  search: "Victoria Island"
});
```

### Updating a Location

```typescript
const updatedLocation = await LocationService.updateLocation(locationId, {
  address: "456 New Street, Victoria Island",
  lga: "Victoria Island"
});
```

### Getting Statistics

```typescript
const stats = await LocationService.getLocationStats();
console.log(`Total locations: ${stats.total_locations}`);
console.log(`Active locations: ${stats.active_locations}`);
```

## API Endpoints

The locations database can be accessed through the following service methods:

- `createLocation(data)` - Create a new location
- `getLocations(filters?)` - Get locations with optional filters
- `getLocationById(id)` - Get a specific location
- `updateLocation(id, data)` - Update a location
- `deleteLocation(id)` - Soft delete a location
- `getLocationStats()` - Get location statistics
- `getUniqueLGAs()` - Get all unique LGA values

## Data Validation

- `address` and `lga` are required fields
- `is_active` defaults to `true`
- Timestamps are automatically managed
- UUIDs are auto-generated for new records

## Performance Considerations

- Indexes on `lga` and `address` fields for fast queries
- Full-text search index on address for search functionality
- Soft delete approach (setting `is_active` to false) preserves data integrity

## Integration with Existing System

The locations table integrates with the existing car wash management system:

- Can be linked to admin profiles for location-based assignments
- Supports location-based service pricing
- Enables location-based reporting and analytics
- Can be used for customer location preferences

