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
  passcode?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Admin extends User {
  role: 'admin';
  location?: string;
  address?: string;
  cvUrl?: string;
  pictureUrl?: string;
  nextOfKin?: Array<{
    name: string;
    phone: string;
    address: string;
  }>;
  assignedWashers?: string[]; 
}

export interface CarWasher extends User {
  role: 'car_washer';
  assignedAdmin?: string; 
  hourlyRate?: number;
  totalEarnings: number;
  isAvailable: boolean;
  pictureUrl?: string;
  nextOfKin?: Array<{
    name: string;
    phone: string;
    address: string;
  }>;
}

export interface SuperAdmin extends User {
  role: 'super_admin';
}


export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone: string;
  dateOfBirth?: string;
  licensePlate?: string;
  vehicleType?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  vehicles?: Array<{
    id: string;
    license_plate: string;
    vehicle_type: string;
    vehicle_model?: string;
    vehicle_color: string;
    is_primary: boolean;
  }>;
  isRegistered: boolean;
  registrationDate?: Date;
  totalVisits: number;
  totalSpent: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Vehicle {
  id: string;
  licensePlate: string;
  vehicleType: string;
  vehicleModel?: string;
  vehicleColor: string;
  vehicleYear?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerVehicle {
  id: string;
  customerId: string;
  vehicleId: string;
  vehicle: Vehicle;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}
// Car Check-in Types
export type CheckInStatus = 'pending' | 'in_progress' | 'completed' | 'paid' | 'cancelled';

// Washer Tools and Materials Types
export interface WasherTool {
  id: string;
  washerId: string;
  toolName: string;
  toolType: 'equipment' | 'protective_gear' | 'cleaning_tool';
  quantity: number;
  assignedDate: Date;
  returnedDate?: Date;
  isReturned: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WasherMaterial {
  id: string;
  washerId: string;
  materialName: string;
  materialType: 'soap' | 'chemical' | 'wax' | 'polish';
  quantity: number;
  unit: string;
  assignedDate: Date;
  returnedQuantity: number;
  isReturned: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CheckInMaterial {
  id: string;
  checkInId: string;
  washerId: string;
  materialId: string;
  materialName: string;
  quantityUsed: number;
  unit: string;
  usageDate: Date;
  createdAt: Date;
}

export interface DailyMaterialReturn {
  id: string;
  washerId: string;
  adminId: string;
  returnDate: Date;
  totalItemsReturned: number;
  totalMaterialsReturned: number;
  deductionsAmount: number;
  status: 'pending' | 'confirmed' | 'completed';
  adminNotes?: string;
  washerNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MaterialReturnItem {
  id: string;
  returnId: string;
  materialId: string;
  materialName: string;
  assignedQuantity: number;
  returnedQuantity: number;
  usedQuantity: number;
  deductionAmount: number;
  notes?: string;
  createdAt: Date;
}

export interface ToolReturnItem {
  id: string;
  returnId: string;
  toolId: string;
  toolName: string;
  assignedQuantity: number;
  returnedQuantity: number;
  missingQuantity: number;
  deductionAmount: number;
  notes?: string;
  createdAt: Date;
}

export interface PaymentApproval {
  id: string;
  washerId: string;
  adminId: string;
  approvalDate: Date;
  totalEarnings: number;
  materialDeductions: number;
  toolDeductions: number;
  netPayment: number;
  status: 'pending' | 'approved' | 'paid';
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

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
  washerCompletionStatus?: boolean;
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
  washerCommissionPercentage: number;
  companyCommissionPercentage: number;
  maxWashersPerService: number;
  commissionNotes?: string;
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

// Milestone Types
export interface Milestone {
  id: string;
  name: string;
  description: string;
  type: 'visits' | 'spending' | 'custom';
  condition: {
    operator: '>=' | '<=' | '=' | '>' | '<';
    value: number;
    period?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all_time';
  };
  reward?: {
    type: 'discount' | 'bonus' | 'free_service';
    value: number;
    description?: string;
  };
  isActive: boolean;
  createdBy: string; // Admin ID
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerMilestoneAchievement {
  id: string;
  customerId: string;
  customer: Customer;
  milestoneId: string;
  milestone: Milestone;
  achievedAt: Date;
  achievedValue: number; // The actual value that triggered the milestone
  rewardClaimed: boolean;
  claimedAt?: Date;
  claimedBy?: string; // Admin ID who processed the reward
  notes?: string;
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