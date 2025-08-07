// User Roles
export type UserRole = 'super_admin' | 'admin' | 'car_washer';

// User Types
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Admin extends User {
  role: 'admin';
  location?: string;
  assignedWashers?: string[]; // IDs of assigned car washers
}

export interface CarWasher extends User {
  role: 'car_washer';
  assignedAdmin?: string; // ID of the admin they report to
  hourlyRate?: number;
  totalEarnings: number;
  isAvailable: boolean;
}

export interface SuperAdmin extends User {
  role: 'super_admin';
}

// Customer Types
export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone: string;
  licensePlate: string;
  vehicleType: string;
  vehicleModel?: string;
  vehicleColor?: string;
  isRegistered: boolean; // true for registered customers, false for instant/walk-in
  registrationDate?: Date;
  totalVisits: number;
  totalSpent: number;
  createdAt: Date;
  updatedAt: Date;
}

// Car Check-in Types
export type CheckInStatus = 'pending' | 'in_progress' | 'completed' | 'paid' | 'cancelled';

export interface CarCheckIn {
  id: string;
  customerId: string;
  customer: Customer;
  licensePlate: string;
  vehicleType: string;
  vehicleModel?: string;
  vehicleColor?: string;
  services: Service[];
  assignedWasherId: string;
  assignedWasher: CarWasher;
  assignedAdminId: string;
  assignedAdmin: Admin;
  status: CheckInStatus;
  checkInTime: Date;
  estimatedCompletionTime?: Date;
  actualCompletionTime?: Date;
  totalAmount: number;
  paymentStatus: 'pending' | 'paid';
  paymentMethod?: 'cash' | 'card' | 'mobile_money';
  valuableItems?: string; // Notes about valuable items
  userCode?: string; // For non-instant customers
  passcode?: string;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Service Types
export interface Service {
  id: string;
  name: string;
  description?: string;
  basePrice: number;
  isActive: boolean;
  category: 'exterior' | 'interior' | 'engine' | 'vacuum' | 'complementary';
  estimatedDuration: number; // in minutes
  createdAt: Date;
  updatedAt: Date;
}

// Stock Management Types
export interface StockItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  unit: string; // e.g., 'liters', 'pieces', 'bottles'
  currentStock: number;
  minimumStock: number;
  costPerUnit: number;
  supplier?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockMovement {
  id: string;
  stockItemId: string;
  stockItem: StockItem;
  type: 'in' | 'out';
  quantity: number;
  previousBalance: number;
  newBalance: number;
  reason: string;
  adminId: string;
  admin: Admin;
  approvedBySuperAdmin?: string;
  approvedAt?: Date;
  remarks?: string;
  createdAt: Date;
}

// Payment Types
export interface Payment {
  id: string;
  checkInId: string;
  checkIn: CarCheckIn;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'mobile_money';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transactionId?: string;
  processedBy: string; // Admin ID
  processedAt: Date;
  remarks?: string;
  createdAt: Date;
}

// Worker Management Types
export interface WorkerTool {
  id: string;
  name: string;
  description?: string;
  category: string;
  isReturnable: boolean;
  replacementCost: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ToolAssignment {
  id: string;
  washerId: string;
  washer: CarWasher;
  toolId: string;
  tool: WorkerTool;
  assignedBy: string; // Admin ID
  assignedAt: Date;
  returnedAt?: Date;
  isReturned: boolean;
  isLost: boolean;
  lostAt?: Date;
  replacementCharged: boolean;
  replacementAmount?: number;
  remarks?: string;
}

// Loan Types
export interface WasherLoan {
  id: string;
  washerId: string;
  washer: CarWasher;
  amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'repaid';
  requestedAt: Date;
  approvedBy?: string; // Super Admin ID
  approvedAt?: Date;
  repaidAt?: Date;
  repaymentMethod: 'income_deduction' | 'direct_payment';
  remarks?: string;
}

// Bonus Types
export interface Bonus {
  id: string;
  type: 'customer' | 'washer';
  recipientId: string; // Customer ID or Washer ID
  amount: number;
  reason: string;
  milestone?: string;
  status: 'pending' | 'approved' | 'paid';
  approvedBy?: string; // Super Admin ID
  approvedAt?: Date;
  paidAt?: Date;
  createdAt: Date;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  relatedEntity?: {
    type: 'check_in' | 'payment' | 'stock' | 'loan' | 'bonus';
    id: string;
  };
  createdAt: Date;
}

// Dashboard Metrics Types
export interface DashboardMetrics {
  totalIncome: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  carCount: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  activeWashers: number;
  pendingCheckIns: number;
  lowStockItems: number;
  topPerformingWashers: Array<{
    washer: CarWasher;
    carsWashed: number;
    totalEarnings: number;
  }>;
  recentActivities: Array<{
    type: string;
    description: string;
    timestamp: Date;
  }>;
}

// Report Types
export interface ReportFilters {
  startDate: Date;
  endDate: Date;
  washerId?: string;
  adminId?: string;
  serviceId?: string;
  paymentMethod?: string;
  status?: string;
}

export interface SalesReport {
  totalSales: number;
  totalCars: number;
  averagePerCar: number;
  salesByService: Array<{
    service: Service;
    count: number;
    revenue: number;
  }>;
  salesByWasher: Array<{
    washer: CarWasher;
    carsWashed: number;
    revenue: number;
  }>;
  salesByDay: Array<{
    date: string;
    sales: number;
    cars: number;
  }>;
} 