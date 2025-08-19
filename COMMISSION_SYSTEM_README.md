# Per-Service Commission System

## Overview

The car wash management system now supports individual commission settings for each service, allowing different commission ratios for different types of services. This replaces the previous global commission settings with a more flexible, service-specific approach.

## Key Features

### 1. Per-Service Commission Settings
- **Washer Commission Percentage**: Percentage of service price that goes to the washer (0-100%)
- **Company Commission Percentage**: Percentage of service price that goes to the company (0-100%)
- **Maximum Washers Per Service**: Maximum number of washers that can work on a service simultaneously
- **Commission Notes**: Optional notes about the commission structure for each service

### 2. Commission Examples
- **Engine Wash**: 100% to washer, max 2 washers
- **Vacuum Service**: 70% to company, 30% to washer, max 1 washer
- **Exterior Wash**: 60% to company, 40% to washer, max 3 washers

## Database Changes

### New Fields Added to Services Table
```sql
ALTER TABLE services 
ADD COLUMN washer_commission_percentage DECIMAL(5,2) DEFAULT 40.00,
ADD COLUMN company_commission_percentage DECIMAL(5,2) DEFAULT 60.00,
ADD COLUMN max_washers_per_service INTEGER DEFAULT 2,
ADD COLUMN commission_notes TEXT;
```

### Constraints
- Commission percentages must equal 100%
- Commission percentages must be between 0 and 100
- Maximum washers must be positive

## API Changes

### Service Creation (POST /api/admin/services)
```json
{
  "name": "Engine Wash",
  "description": "Complete engine bay cleaning",
  "price": 25.00,
  "category": "engine",
  "duration": 45,
  "washerCommissionPercentage": 100,
  "companyCommissionPercentage": 0,
  "maxWashersPerService": 2,
  "commissionNotes": "100% commission for engine specialists"
}
```

### Service Update (PATCH /api/admin/services/[id])
```json
{
  "washerCommissionPercentage": 80,
  "companyCommissionPercentage": 20,
  "maxWashersPerService": 3
}
```

## Frontend Changes

### 1. Service Creation Form
- Added commission settings section with:
  - Washer commission percentage input
  - Company commission percentage input (auto-calculated)
  - Maximum washers per service input
  - Commission notes textarea

### 2. Services Management Table
- Added commission column showing washer/company percentages
- Added max washers column
- Commission information displayed for each service

### 3. Form Validation
- Commission percentages must equal 100%
- Maximum washers must be at least 1
- Real-time validation and auto-calculation

## Migration Steps

### 1. Run Database Migration
```sql
-- Execute the service-commission-migration.sql file
-- This will add the new fields and set default values
```

### 2. Update Existing Services
- Existing services will have default commission settings (40% washer, 60% company)
- Update individual services as needed through the admin interface

### 3. Test the System
- Create new services with different commission settings
- Verify commission calculations work correctly
- Test service updates and validation

## Benefits

1. **Flexibility**: Different services can have different commission structures
2. **Fairness**: Washers can earn more for specialized or difficult services
3. **Transparency**: Clear commission structure for each service
4. **Scalability**: Easy to add new services with custom commission rates

## Usage Examples

### High-Commission Services (100% Washer)
- Engine bay cleaning
- Specialized detailing
- Premium services

### Standard Services (40% Washer, 60% Company)
- Basic exterior wash
- Interior cleaning
- Standard vacuum service

### Low-Commission Services (20% Washer, 80% Company)
- Quick services
- High-volume, low-effort tasks
- Complementary services

## Future Enhancements

1. **Commission History**: Track commission changes over time
2. **Performance Analytics**: Analyze which commission structures work best
3. **Dynamic Pricing**: Adjust commissions based on demand or season
4. **Washer Preferences**: Allow washers to choose services based on commission rates

## Support

For questions or issues with the commission system, please refer to the API documentation or contact the development team.
