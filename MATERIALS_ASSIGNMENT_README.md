# Materials Assignment Feature for Washers

## Overview
This feature allows car washers to assign materials from their assigned inventory to specific check-ins. This helps track material usage, manage inventory, and provide transparency in the car wash process.

## Features

### 1. Assign Materials Button
- **Location**: Each check-in in the "My Check-ins" page now displays an "Assign Materials" button
- **Visibility**: The button is always visible regardless of check-in status
- **Purpose**: Allows washers to assign materials they have been given to specific check-ins

### 2. Materials Assignment Modal
- **Access**: Click the "Assign Materials" button on any check-in
- **Functionality**: 
  - View currently assigned materials for the check-in
  - Select from available materials in washer's inventory
  - Specify quantities for each material
  - Assign materials to the check-in

### 3. Material Tracking
- **Real-time Updates**: Material quantities are automatically updated when assigned
- **Usage History**: Track which materials were used for each check-in
- **Inventory Management**: Prevent over-allocation of materials

## Database Schema

### New Table: `check_in_materials`
```sql
CREATE TABLE check_in_materials (
    id UUID PRIMARY KEY,
    check_in_id UUID REFERENCES car_check_ins(id),
    washer_id UUID REFERENCES users(id),
    material_id UUID REFERENCES washer_tools(id),
    material_name TEXT,
    quantity_used DECIMAL(10,2),
    unit TEXT,
    usage_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);
```

## API Endpoints

### POST `/api/admin/check-ins/assign-materials`
Assigns materials to a check-in.

**Request Body:**
```json
{
  "checkInId": "uuid",
  "washerId": "uuid",
  "materials": [
    {
      "materialId": "uuid",
      "materialName": "string",
      "quantityUsed": 2.5,
      "unit": "liters"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Materials assigned to check-in successfully",
  "materials": [...]
}
```

### GET `/api/admin/check-ins/assign-materials`
Retrieves materials assigned to a check-in.

**Query Parameters:**
- `checkInId` (required): The check-in ID
- `washerId` (optional): Filter by specific washer

**Response:**
```json
{
  "success": true,
  "materials": [...]
}
```

## User Interface

### My Check-ins Page
- Each check-in displays a materials status section
- "Assign Materials" button is prominently displayed
- Clear indication of materials status

### Assign Materials Modal
- **Header**: Clear title and close button
- **Current Materials**: Shows already assigned materials
- **Available Materials**: List of washer's available materials
- **Quantity Selection**: Input fields for specifying quantities
- **Action Buttons**: Cancel and Assign Materials buttons

## Workflow

1. **Washer Views Check-ins**: Washer navigates to "My Check-ins" page
2. **Select Check-in**: Washer identifies the check-in they want to assign materials to
3. **Open Modal**: Click "Assign Materials" button
4. **Select Materials**: Choose from available materials and specify quantities
5. **Assign Materials**: Confirm assignment
6. **Material Tracking**: Materials are tracked and inventory is updated

## Benefits

### For Washers
- **Transparency**: Clear tracking of material usage
- **Accountability**: Record of materials used for each job
- **Efficiency**: Easy assignment process

### For Management
- **Inventory Control**: Track material consumption
- **Cost Analysis**: Understand material costs per job
- **Quality Assurance**: Ensure proper materials are used

### For Customers
- **Service Quality**: Consistent material usage
- **Transparency**: Know what materials were used

## Security Features

- **Row Level Security (RLS)**: Washers can only manage their own materials
- **Admin Access**: Admins can view all material assignments
- **Validation**: Prevents over-allocation and unauthorized access

## Error Handling

- **Insufficient Quantity**: Prevents assigning more materials than available
- **Unauthorized Access**: Validates washer ownership of check-in
- **Material Validation**: Ensures materials exist in washer's inventory

## Future Enhancements

- **Material Recommendations**: Suggest materials based on service type
- **Usage Analytics**: Track material efficiency and costs
- **Automated Replenishment**: Alert when materials are running low
- **Material Categories**: Group materials by type (soap, wax, tools, etc.)

## Technical Implementation

### Components
- `AssignMaterialsModal.tsx`: Modal for material assignment
- `MyCheckInsPage.tsx`: Updated check-ins page with materials button

### State Management
- Modal open/close state
- Selected check-in tracking
- Material selection and quantity management

### API Integration
- Material assignment endpoint
- Material retrieval endpoint
- Real-time inventory updates

## Usage Instructions

1. **Navigate to My Check-ins**: Go to the check-ins section
2. **Find Target Check-in**: Locate the check-in you want to assign materials to
3. **Click Assign Materials**: Use the button in the materials status section
4. **Select Materials**: Choose from your available materials
5. **Set Quantities**: Specify how much of each material to use
6. **Confirm Assignment**: Click "Assign Materials" to complete the process

## Troubleshooting

### Common Issues
- **No Materials Available**: Contact admin to get materials assigned
- **Quantity Errors**: Ensure you have sufficient materials
- **Modal Not Opening**: Check browser console for errors

### Support
- For technical issues, check the browser console
- For access issues, contact your admin
- For material requests, speak with your supervisor
