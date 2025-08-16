# Sales System Integration with Inventory Management

## Overview
This system automatically updates inventory levels when sales occur, ensuring real-time stock tracking and preventing overselling.

## Features

### 1. Automatic Inventory Updates
- When a sale is processed, inventory levels are automatically reduced
- Real-time stock validation prevents overselling
- Audit trail tracks all inventory movements

### 2. Sales Management
- Create sales transactions with multiple items
- Support for walk-in customers and registered customers
- Multiple payment methods (cash, card, mobile, bank transfer)
- Automatic total calculation

### 3. Real-time Inventory Monitoring
- Inventory page auto-refreshes every 30 seconds
- Visual notifications when inventory changes
- Stock status indicators (Low, Medium, Good)

## How It Works

### Sales Flow
1. Admin navigates to `/sales` page
2. Selects customer (optional for walk-in customers)
3. Adds inventory items with quantities
4. System validates stock availability
5. Completes sale transaction
6. Inventory is automatically updated
7. Audit trail is created

### Inventory Updates
- **Stock Reduction**: When items are sold, `current_stock` is reduced
- **Movement Tracking**: Each inventory change is logged in `inventory_movements` table
- **Real-time Sync**: Inventory page shows updated stock levels immediately

### Database Tables

#### `sales_transactions`
- Records of all sales transactions
- Links to customers and admins
- Stores payment method and total amount

#### `sales_items`
- Individual items sold in each transaction
- Links to inventory items
- Stores quantity and pricing

#### `inventory_movements`
- Audit trail of all inventory changes
- Tracks previous and new stock levels
- Links to sales transactions for reference

## API Endpoints

### POST `/api/admin/sales`
Creates a new sale transaction and updates inventory.

**Request Body:**
```json
{
  "customerId": "uuid-or-null",
  "items": [
    {
      "inventoryId": "uuid",
      "quantity": 5,
      "unitPrice": 10.99
    }
  ],
  "totalAmount": 54.95,
  "paymentMethod": "cash",
  "adminId": "uuid",
  "remarks": "Optional notes"
}
```

**Response:**
```json
{
  "success": true,
  "transaction": {
    "id": "uuid",
    "totalAmount": 54.95,
    "status": "completed",
    "inventoryUpdates": [
      {
        "id": "uuid",
        "name": "Item Name",
        "previousStock": 100,
        "newStock": 95,
        "quantitySold": 5
      }
    ]
  }
}
```

### GET `/api/admin/sales`
Retrieves sales history with filtering options.

**Query Parameters:**
- `search`: Search by customer name/email
- `status`: Filter by sale status
- `startDate`/`endDate`: Date range filtering
- `sortBy`/`sortOrder`: Sorting options

## Integration Points

### Inventory Page (`/stock/inventory`)
- **Create Sale Button**: Direct access to sales page
- **Auto-refresh**: Updates every 30 seconds
- **Change Notifications**: Shows when inventory is updated
- **Last Updated Timestamp**: Displays when data was last refreshed

### Sales Page (`/sales`)
- **Inventory Search**: Browse available items
- **Stock Validation**: Prevents overselling
- **Real-time Updates**: Shows current stock levels
- **Customer Selection**: Optional customer association

## Security Features

### Stock Validation
- Prevents sales when insufficient stock exists
- Returns detailed error messages for stock issues
- Maintains data integrity through database constraints

### Audit Trail
- All inventory changes are logged
- Links changes to specific sales transactions
- Tracks admin who processed each transaction

## Error Handling

### Insufficient Stock
```json
{
  "success": false,
  "error": "Insufficient stock for Car Wash Soap. Available: 3, Requested: 5"
}
```

### Invalid Data
```json
{
  "success": false,
  "error": "Missing required fields"
}
```

## Future Enhancements

### Planned Features
- **Bulk Sales**: Process multiple transactions at once
- **Sales Returns**: Handle item returns and stock adjustments
- **Discounts**: Support for promotional pricing
- **Inventory Alerts**: Notifications for low stock levels
- **Sales Analytics**: Detailed reporting and insights

### Technical Improvements
- **WebSocket Integration**: Real-time updates without polling
- **Offline Support**: Queue sales when network is unavailable
- **Mobile App**: Native mobile application for sales staff
- **Barcode Scanning**: Quick item identification

## Setup Instructions

### 1. Database Setup
Run the SQL schema in `sales_schema.sql` to create required tables.

### 2. Environment Variables
Ensure these environment variables are set:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Navigation
The sales page is accessible via:
- Admin sidebar: Stock → Sales
- Inventory page: Create Sale button
- Direct URL: `/sales`

## Troubleshooting

### Common Issues

#### Inventory Not Updating
- Check database connection
- Verify table permissions
- Review API error logs

#### Sales Not Processing
- Validate inventory item IDs
- Check stock availability
- Ensure proper admin authentication

#### Performance Issues
- Monitor database query performance
- Consider adding database indexes
- Implement caching for frequently accessed data

## Support

For technical support or feature requests, please refer to the development team or create an issue in the project repository.










